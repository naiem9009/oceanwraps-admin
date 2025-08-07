import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    console.log('Creating advance payment for invoice:', invoiceId)
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    if (invoice.status !== 'ADVANCE_PENDING') {
      return NextResponse.json(
        { error: 'Invoice is not pending advance payment' },
        { status: 400 }
      )
    }
    
    // Create or get Stripe customer
    let stripeCustomerId = invoice.customer.stripeCustomerId
    
    if (!stripeCustomerId) {
      console.log('Creating new Stripe customer')
      const stripeCustomer = await stripe.customers.create({
        email: invoice.customer.email,
        name: invoice.customer.name,
        metadata: {
          customerId: invoice.customer.id
        }
      })
      
      stripeCustomerId = stripeCustomer.id
      
      // Update customer with Stripe ID
      await prisma.customer.update({
        where: { id: invoice.customer.id },
        data: { stripeCustomerId }
      })
      
      console.log('Stripe customer created:', stripeCustomerId)
    }
    
    // Create payment intent for advance payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(invoice.advanceAmount) * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      setup_future_usage: 'off_session', // Save payment method for future use
      metadata: {
        invoiceId: invoice.id,
        paymentType: 'ADVANCE',
        customerId: invoice.customer.id
      },
      description: `Advance payment (50%) for ${invoice.invoiceNumber}`
    })
    
    console.log('Payment intent created:', paymentIntent.id)
    
    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customer.id,
        amount: invoice.advanceAmount,
        type: 'ADVANCE',
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
      }
    })
    
    console.log('Payment record created in database:', payment.id)
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id
    })
  } catch (error) {
    console.error('Error creating advance payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
