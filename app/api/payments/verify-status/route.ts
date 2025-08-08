import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json()

    console.log('Verifying payment status for:', paymentIntentId)

    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    console.log('Stripe payment intent status:', paymentIntent.status)

    // Find payment in database, including related customer data
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntentId },
      include: {
        invoice: true,
        customer: {
          include: {
            paymentMethods: true
          }
        }
      }
    })

    if (!payment) {
      console.error('Payment not found in database')
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    console.log('Database payment status:', payment.status)

    // If Stripe says succeeded but database hasn't updated, manually trigger update
    if (paymentIntent.status === 'succeeded' && payment.status !== 'COMPLETED') {
      console.log('Manually updating payment status')

      // Use a transaction for all database operations to ensure they are atomic
      await prisma.$transaction(async (tx) => {
        // Step 1: Update the payment status to 'COMPLETED'
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' }
        })

        // Step 2: Handle saving/updating the payment method if it's an advance payment
        if (payment.type === 'ADVANCE' && paymentIntent.payment_method) {
          const paymentMethodId = paymentIntent.payment_method as string;
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

          // Check if the payment method already exists in the database
          const existingMethod = payment.customer.paymentMethods.find(
            pm => pm.stripePaymentMethodId === paymentMethodId
          );

          if (existingMethod) {
            console.log('Payment method already exists, setting as default');
            await tx.paymentMethod.update({
              where: { id: existingMethod.id },
              data: { isDefault: true }
            });
          } else {
            // Logic to handle potential duplicates by card fingerprint
            const cardFingerprint = paymentMethod.card?.fingerprint;
            let duplicateCard = null;

            if (cardFingerprint) {
              // Find a card with the same fingerprint for this customer
              duplicateCard = await tx.paymentMethod.findFirst({
                where: {
                  customerId: payment.customerId,
                  cardFingerprint: cardFingerprint
                }
              });
            }

            if (duplicateCard) {
              console.log('🔄 Found duplicate card, updating existing record');
              // Update the existing duplicate card with the new payment method ID and details
              await tx.paymentMethod.update({
                where: { id: duplicateCard.id },
                data: {
                  stripePaymentMethodId: paymentMethodId,
                  last4: paymentMethod.card?.last4 || duplicateCard.last4,
                  brand: paymentMethod.card?.brand || duplicateCard.brand,
                  expiryMonth: paymentMethod.card?.exp_month || duplicateCard.expiryMonth,
                  expiryYear: paymentMethod.card?.exp_year || duplicateCard.expiryYear,
                  isDefault: true
                }
              });
            } else {
              console.log('➕ Creating new payment method');
              // Set all other payment methods for this customer to non-default
              await tx.paymentMethod.updateMany({
                where: {
                  customerId: payment.customerId
                },
                data: { isDefault: false }
              });

              // Create the new payment method record
              await tx.paymentMethod.create({
                data: {
                  customerId: payment.customerId,
                  stripePaymentMethodId: paymentMethod.id,
                  type: paymentMethod.type,
                  last4: paymentMethod.card?.last4,
                  brand: paymentMethod.card?.brand,
                  expiryMonth: paymentMethod.card?.exp_month,
                  expiryYear: paymentMethod.card?.exp_year,
                  cardFingerprint: paymentMethod.card?.fingerprint,
                  isDefault: true,
                }
              });
            }
          }

          // Ensure only the correct payment method is set to default
          await tx.paymentMethod.updateMany({
            where: {
              customerId: payment.customerId,
              stripePaymentMethodId: { not: paymentMethodId }
            },
            data: { isDefault: false }
          });
        }

        // Step 3: Update invoice status
        const newStatus = payment.type === 'ADVANCE' ? 'ADVANCE_PAID' : 'FULLY_PAID';
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { status: newStatus }
        });
      }, { timeout: 15000 });

      console.log('Manual update completed');
    }

    return NextResponse.json({
      success: true,
      paymentStatus: paymentIntent.status,
      databaseStatus: payment.status
    });
  } catch (error: any) {
    console.error('Error verifying payment status:', error);
    return NextResponse.json({
      error: 'Verification failed',
      details: error.message
    }, { status: 500 });
  }
}
