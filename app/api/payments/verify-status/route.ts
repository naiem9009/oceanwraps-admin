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
    
    // Find payment in database
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntentId },
      include: { invoice: true, customer: true }
    })
    
    if (!payment) {
      console.error('Payment not found in database')
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    
    console.log('Database payment status:', payment.status)
    
    // If Stripe says succeeded but database hasn't updated, manually trigger update
    if (paymentIntent.status === 'succeeded' && payment.status !== 'COMPLETED') {
      console.log('Manually updating payment status')
      
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' }
      })
      
      // Save payment method if it's an advance payment and payment method exists
      if (payment.type === 'ADVANCE' && paymentIntent.payment_method) {
        const paymentMethodId = paymentIntent.payment_method as string;
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
        
        // Check if payment method already exists
        const existingPaymentMethod = await prisma.paymentMethod.findUnique({
          where: { stripePaymentMethodId: paymentMethodId }
        });
        
        if (!existingPaymentMethod) {
          // Remove any existing default payment methods
          await prisma.paymentMethod.updateMany({
            where: { customerId: payment.customerId },
            data: { isDefault: false }
          })
          
          // Create new default payment method
          await prisma.paymentMethod.create({
            data: {
              customerId: payment.customerId,
              stripePaymentMethodId: paymentMethod.id,
              type: paymentMethod.type,
              last4: paymentMethod.card?.last4,
              brand: paymentMethod.card?.brand,
              expiryMonth: paymentMethod.card?.exp_month,
              expiryYear: paymentMethod.card?.exp_year,
              isDefault: true,
            }
          })
        } else {
          console.log('Payment method already exists, skipping creation');
          // Optionally update the existing payment method to be default
          await prisma.paymentMethod.update({
            where: { id: existingPaymentMethod.id },
            data: { isDefault: true }
          });
        }
      }
      
      // Update invoice status
      const newStatus = payment.type === 'ADVANCE' ? 'ADVANCE_PAID' : 'FULLY_PAID'
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { status: newStatus }
      })
      
      console.log('Manual update completed')
    }
    
    return NextResponse.json({ 
      success: true, 
      paymentStatus: paymentIntent.status,
      databaseStatus: payment.status 
    })
  } catch (error) {
    console.error('Error verifying payment status:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}