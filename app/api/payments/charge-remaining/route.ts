import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        customer: {
          include: {
            paymentMethods: {
              where: { isDefault: true }
            }
          }
        }
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }
    
    if (invoice.status !== 'ADVANCE_PAID') {
      return NextResponse.json(
        { error: 'Invoice advance payment not completed' },
        { status: 400 }
      )
    }
    
    const defaultPaymentMethod = invoice.customer.paymentMethods[0]
    
    if (!defaultPaymentMethod) {
      return NextResponse.json(
        { error: 'No saved payment method found' },
        { status: 400 }
      )
    }
    
    // Charge the remaining amount using saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(invoice.remainingAmount) * 100),
      currency: 'usd',
      customer: invoice.customer.stripeCustomerId!,
      payment_method: defaultPaymentMethod.stripePaymentMethodId,
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}`,
      metadata: {
        invoiceId: invoice.id,
        paymentType: 'REMAINING'
      },
      description: `Remaining payment (50%) for ${invoice.invoiceNumber}`
    })
    
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customer.id,
        paymentMethodId: defaultPaymentMethod.id,
        amount: invoice.remainingAmount,
        type: 'REMAINING',
        status: 'PROCESSING',
        stripePaymentId: paymentIntent.id,
      }
    })
    
    // Update payment status based on Stripe response
    if (paymentIntent.status === 'succeeded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' }
      })
      
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'FULLY_PAID' }
      })
    } else if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id
      })
    }
    
    return NextResponse.json({
      success: true,
      paymentIntent: paymentIntent.status,
      paymentId: payment.id
    })
  } catch (error) {
    console.error('Error charging remaining payment:', error)
    return NextResponse.json(
      { error: 'Failed to charge remaining payment' },
      { status: 500 }
    )
  }
}
