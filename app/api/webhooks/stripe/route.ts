import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import Stripe from 'stripe'
import { InvoiceStatus } from '@prisma/client'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    
    console.log('=== WEBHOOK RECEIVED ===')
    console.log('Signature present:', !!signature)
    console.log('Webhook secret configured:', !!webhookSecret)
    console.log('Body length:', body.length)
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Webhook signature verified')
      console.log('Event type:', event.type)
      console.log('Event ID:', event.id)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('🎉 Processing payment_intent.succeeded')
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.payment_failed':
        console.log('❌ Processing payment_intent.payment_failed')
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.created':
        console.log('📝 Payment intent created:', event.data.object.id)
        break
        
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
    
    console.log('=== WEBHOOK PROCESSED ===')
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('🔍 Looking for payment with Stripe ID:', paymentIntent.id)
  
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: { 
        invoice: true,
        customer: true
      }
    })
    
    if (!payment) {
      console.error('❌ Payment not found in database for Stripe ID:', paymentIntent.id)
      
      // Try to find by metadata
      const invoiceId = paymentIntent.metadata?.invoiceId
      const customerId = paymentIntent.metadata?.customerId
      const paymentType = paymentIntent.metadata?.paymentType
      
      if (invoiceId && customerId && paymentType) {
        console.log('🔄 Attempting to create missing payment record from metadata')
        
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: { customer: true }
        })
        
        if (invoice) {
          const amount = paymentType === 'ADVANCE' ? invoice.advanceAmount : invoice.remainingAmount
          
          const newPayment = await prisma.payment.create({
            data: {
              invoiceId: invoice.id,
              customerId: invoice.customer.id,
              amount: amount,
              type: paymentType as 'ADVANCE' | 'REMAINING',
              status: 'COMPLETED',
              stripePaymentId: paymentIntent.id,
            },
            include: {
              invoice: true,
              customer: true
            }
          })
          
          console.log('✅ Created missing payment record:', newPayment.id)
          await processPaymentSuccess(newPayment, paymentIntent)
          return
        }
      }
      
      console.error('❌ Could not create payment record from metadata')
      return
    }
    
    console.log('✅ Found payment record:', payment.id)
    console.log('Payment type:', payment.type)
    console.log('Current status:', payment.status)
    
    await processPaymentSuccess(payment, paymentIntent)
    
  } catch (error) {
    console.error('💥 Error in handlePaymentSucceeded:', error)
  }
}

// async function processPaymentSuccess(payment: any, paymentIntent: Stripe.PaymentIntent) {
//   try {
//     // Update payment status to COMPLETED
//     const updatedPayment = await prisma.payment.update({
//       where: { id: payment.id },
//       data: { status: 'COMPLETED' }
//     })
    
//     console.log('✅ Payment status updated to COMPLETED')
    
//     // Save payment method if it's an advance payment
//     if (payment.type === 'ADVANCE' && paymentIntent.payment_method) {
//       console.log('💳 Saving payment method for future use')
      
//       try {
//         const paymentMethod = await stripe.paymentMethods.retrieve(
//           paymentIntent.payment_method as string
//         )
        
//         // Remove any existing default payment methods for this customer
//         await prisma.paymentMethod.updateMany({
//           where: { customerId: payment.customerId },
//           data: { isDefault: false }
//         })
        
//         // Create new default payment method
//         const savedPaymentMethod = await prisma.paymentMethod.create({
//           data: {
//             customerId: payment.customerId,
//             stripePaymentMethodId: paymentMethod.id,
//             type: paymentMethod.type,
//             last4: paymentMethod.card?.last4 || '',
//             brand: paymentMethod.card?.brand || '',
//             expiryMonth: paymentMethod.card?.exp_month || 0,
//             expiryYear: paymentMethod.card?.exp_year || 0,
//             isDefault: true,
//           }
//         })
        
//         console.log('✅ Payment method saved:', savedPaymentMethod.id)
//       } catch (pmError) {
//         console.error('❌ Error saving payment method:', pmError)
//       }
//     }
    
//     // Update invoice status
//     let newInvoiceStatus = payment.invoice.status
    
//     if (payment.type === 'ADVANCE') {
//       newInvoiceStatus = 'ADVANCE_PAID'
//       console.log('📄 Updating invoice status to ADVANCE_PAID')
//     } else if (payment.type === 'REMAINING') {
//       newInvoiceStatus = 'FULLY_PAID'
//       console.log('📄 Updating invoice status to FULLY_PAID')
//     }
    
//     await prisma.invoice.update({
//       where: { id: payment.invoiceId },
//       data: { status: newInvoiceStatus }
//     })
    
//     console.log('✅ Invoice status updated to:', newInvoiceStatus)
    
//     // Send confirmation email
//     console.log('📧 Sending confirmation email to:', payment.customer.email)
    
//     try {
//       await sendPaymentConfirmationEmail({
//         to: payment.customer.email,
//         customerName: payment.customer.name,
//         invoiceNumber: payment.invoice.invoiceNumber,
//         amount: Number(payment.amount),
//         paymentType: payment.type as 'ADVANCE' | 'REMAINING',
//         advanceAmount: 10,
//         dueDate : "10",
//         items: [],
//         totalAmount: 10,
//         totalDue: 10

//       })
      
//       console.log('✅ Confirmation email sent successfully')
//     } catch (emailError) {
//       console.error('❌ Failed to send confirmation email:', emailError)
//       console.error('Email error details:', {
//         to: payment.customer.email,
//         invoiceNumber: payment.invoice.invoiceNumber,
//         amount: Number(payment.amount),
//         type: payment.type
//       })
//     }
    
//   } catch (error) {
//     console.error('💥 Error in processPaymentSuccess:', error)
//   }
// }

async function processPaymentSuccess(payment: any, paymentIntent: Stripe.PaymentIntent) {
  try {
    // 1. Update payment status to COMPLETED and connect the Stripe payment ID
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'COMPLETED',
        stripePaymentId: paymentIntent.id,
        ...(paymentIntent.payment_method && {
          paymentMethod: {
            connect: { stripePaymentMethodId: paymentIntent.payment_method as string }
          }
        })
      },
      include: {
        invoice: {
          include: {
            items: true,
            customer: true
          }
        },
        customer: true
      }
    });

    console.log('✅ Payment status updated to COMPLETED');

    // 2. Save payment method if it's an advance payment
    if (updatedPayment.type === 'ADVANCE' && paymentIntent.payment_method) {
      console.log('💳 Saving payment method for future use');
      
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentIntent.payment_method as string
        );

        // Remove any existing default payment methods for this customer
        await prisma.paymentMethod.updateMany({
          where: { customerId: updatedPayment.customerId },
          data: { isDefault: false }
        });

        // Create new default payment method
        const savedPaymentMethod = await prisma.paymentMethod.create({
          data: {
            customerId: updatedPayment.customerId,
            stripePaymentMethodId: paymentMethod.id,
            type: paymentMethod.type,
            last4: paymentMethod.card?.last4 || '',
            brand: paymentMethod.card?.brand || '',
            expiryMonth: paymentMethod.card?.exp_month || 0,
            expiryYear: paymentMethod.card?.exp_year || 0,
            isDefault: true,
          }
        });

        console.log('✅ Payment method saved:', savedPaymentMethod.id);
      } catch (pmError) {
        console.error('❌ Error saving payment method:', pmError);
      }
    }

    // 3. Update invoice status based on payment type
    let newInvoiceStatus: InvoiceStatus;
    const now = new Date();

    if (updatedPayment.type === 'ADVANCE') {
      newInvoiceStatus = 'ADVANCE_PAID';
      console.log('📄 Updating invoice status to ADVANCE_PAID');
    } else if (updatedPayment.type === 'REMAINING') {
      newInvoiceStatus = 'FULLY_PAID';
      console.log('📄 Updating invoice status to FULLY_PAID');
    } else {
      newInvoiceStatus = updatedPayment.invoice.status;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: updatedPayment.invoiceId },
      data: { 
        status: newInvoiceStatus,
        ...(updatedPayment.type === 'REMAINING' && { 
          remainingAmount: 0 
        }),
        updatedAt: now
      },
      include: {
        items: true,
        customer: true,
        payments: true
      }
    });

    console.log('✅ Invoice status updated to:', newInvoiceStatus);

    // 4. Prepare email data with all required fields
    const totalPaid = updatedInvoice.payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const emailData = {
      to: updatedInvoice.customer.email,
      customerName: updatedInvoice.customer.name,
      invoiceNumber: updatedInvoice.invoiceNumber,
      amount: updatedPayment.amount.toNumber(),
      paymentType: updatedPayment.type,
      advanceAmount: updatedInvoice.advanceAmount.toNumber(),
      dueDate: updatedInvoice.dueDate.toISOString().split('T')[0],
      items: updatedInvoice.items.map(item => ({
        description: item.description,
        rate: item.rate.toNumber(),
        quantity: item.quantity,
        amount: item.amount.toNumber(),
      })),
      totalAmount: updatedInvoice.totalAmount.toNumber(),
      totalDue: updatedInvoice.remainingAmount.toNumber(),
      status: (() => {
        switch (newInvoiceStatus) {
          case 'FULLY_PAID': return 'paid';
          case 'ADVANCE_PAID': return 'partial';
          default: return 'unpaid';
        }
      })(),
      date: updatedInvoice.createdAt.toISOString().split('T')[0],
      invoiceTo: {
        name: updatedInvoice.customer.name,
        email: updatedInvoice.customer.email,
        address: updatedInvoice.customer.address || undefined
      },
      note: updatedInvoice.notes || ""
    };

    // 5. Send confirmation email
    console.log('📧 Sending confirmation email to:', updatedInvoice.customer.email);
    
    try {
      await sendPaymentConfirmationEmail(emailData);
      console.log('✅ Confirmation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
      console.error('Email error details:', {
        to: updatedInvoice.customer.email,
        invoiceNumber: updatedInvoice.invoiceNumber,
        // error: emailError.message
      });
    }

    return {
      payment: updatedPayment,
      invoice: updatedInvoice
    };

  } catch (error) {
    console.error('💥 Error in processPaymentSuccess:', error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Processing payment failure for:', paymentIntent.id)
  
  try {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id }
    })
    
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      })
      console.log('✅ Payment status updated to FAILED')
    } else {
      console.log('⚠️ Payment not found for failed payment intent')
    }
  } catch (error) {
    console.error('💥 Error handling payment failure:', error)
  }
}
