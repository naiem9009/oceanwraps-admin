// import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
// import { stripe } from '@/lib/stripe'

// export async function POST(request: NextRequest) {
//   try {
//     const { invoiceId } = await request.json()
    
//     const invoice = await prisma.invoice.findUnique({
//       where: { id: invoiceId },
//       include: { 
//         customer: {
//           include: {
//             paymentMethods: {
//               where: { isDefault: true }
//             }
//           }
//         }
//       }
//     })
    
//     if (!invoice) {
//       return NextResponse.json(
//         { error: 'Invoice not found' },
//         { status: 404 }
//       )
//     }
    
//     if (invoice.status !== 'ADVANCE_PAID') {
//       return NextResponse.json(
//         { error: 'Invoice advance payment not completed' },
//         { status: 400 }
//       )
//     }
    
//     const defaultPaymentMethod = invoice.customer.paymentMethods[0]
    
//     if (!defaultPaymentMethod) {
//       return NextResponse.json(
//         { error: 'No saved payment method found' },
//         { status: 400 }
//       )
//     }
    
//     // Charge the remaining amount using saved payment method
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(Number(invoice.remainingAmount) * 100),
//       currency: 'usd',
//       customer: invoice.customer.stripeCustomerId!,
//       payment_method: defaultPaymentMethod.stripePaymentMethodId,
//       confirm: true,
//       return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}`,
//       metadata: {
//         invoiceId: invoice.id,
//         paymentType: 'REMAINING'
//       },
//       description: `Remaining payment (50%) for ${invoice.invoiceNumber}`
//     })
    
//     // Create payment record
//     const payment = await prisma.payment.create({
//       data: {
//         invoiceId: invoice.id,
//         customerId: invoice.customer.id,
//         paymentMethodId: defaultPaymentMethod.id,
//         amount: invoice.remainingAmount,
//         type: 'REMAINING',
//         status: 'PROCESSING',
//         stripePaymentId: paymentIntent.id,
//       }
//     })
    
//     // Update payment status based on Stripe response
//     if (paymentIntent.status === 'succeeded') {
//       await prisma.payment.update({
//         where: { id: payment.id },
//         data: { status: 'COMPLETED' }
//       })
      
//       await prisma.invoice.update({
//         where: { id: invoice.id },
//         data: { status: 'FULLY_PAID' }
//       })
//     } else if (paymentIntent.status === 'requires_action') {
//       return NextResponse.json({
//         requiresAction: true,
//         clientSecret: paymentIntent.client_secret,
//         paymentId: payment.id
//       })
//     }
    
//     return NextResponse.json({
//       success: true,
//       paymentIntent: paymentIntent.status,
//       paymentId: payment.id
//     })
//   } catch (error) {
//     console.error('Error charging remaining payment:', error)
//     return NextResponse.json(
//       { error: 'Failed to charge remaining payment' },
//       { status: 500 }
//     )
//   }
// }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // 1. Validate request and extract invoiceId
    const { invoiceId } = await request.json()
    if (!invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // 2. Fetch invoice with complete payment context
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        customer: {
          include: {
            paymentMethods: {
              where: { isDefault: true },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        payments: {
          where: { 
            type: 'ADVANCE',
            status: 'COMPLETED'
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    // 3. Validate invoice exists and has proper status
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    if (invoice.status !== 'ADVANCE_PAID' || invoice.payments.length === 0) {
      return NextResponse.json(
        { error: 'Advance payment not completed or verified' },
        { status: 400 }
      )
    }

    // 4. Validate customer payment method
    const defaultPaymentMethod = invoice.customer.paymentMethods[0]
    if (!defaultPaymentMethod) {
      return NextResponse.json(
        { error: 'No default payment method available' },
        { status: 400 }
      )
    }

    if (!invoice.customer.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Customer not properly registered with payment processor' },
        { status: 400 }
      )
    }

    // 5. Validate remaining amount
    const remainingAmount = Number(invoice.remainingAmount)
    if (isNaN(remainingAmount) || remainingAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid remaining amount' },
        { status: 400 }
      )
    }

    // 6. Verify payment method fingerprint (if exists)
    if (defaultPaymentMethod.cardFingerprint) {
      try {
        const currentPaymentMethod = await stripe.paymentMethods.retrieve(
          defaultPaymentMethod.stripePaymentMethodId
        )
        
        if (currentPaymentMethod.card?.fingerprint !== defaultPaymentMethod.cardFingerprint) {
          return NextResponse.json(
            { 
              error: 'Payment method details have changed',
              code: 'PAYMENT_METHOD_CHANGED'
            },
            { status: 400 }
          )
        }
      } catch (error) {
        console.error('Error verifying payment method:', error)
        return NextResponse.json(
          { error: 'Failed to verify payment method' },
          { status: 400 }
        )
      }
    }

    // 7. Create payment record first to track the attempt
    const payment = await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customer.id,
        paymentMethodId: defaultPaymentMethod.id,
        amount: remainingAmount,
        type: 'REMAINING',
        status: 'PROCESSING',
      }
    })

    try {
      // 8. Attempt to charge the remaining amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(remainingAmount * 100),
        currency: 'usd',
        customer: invoice.customer.stripeCustomerId,
        payment_method: defaultPaymentMethod.stripePaymentMethodId,
        confirm: true,
        off_session: true, // Critical for saved payment methods
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}`,
        metadata: {
          invoiceId: invoice.id,
          paymentType: 'REMAINING',
          paymentId: payment.id,
          customerId: invoice.customer.id
        },
        description: `Remaining payment for invoice ${invoice.invoiceNumber}`,
        receipt_email: invoice.customer.email
      })

      // 9. Update payment with Stripe reference
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          stripePaymentId: paymentIntent.id,
          stripeClientSecret: paymentIntent.client_secret || null
        }
      })

      // 10. Handle different payment intent statuses
      switch (paymentIntent.status) {
        case 'succeeded':
          await handleSuccessfulPayment(payment.id, invoice.id)
          return NextResponse.json({
            success: true,
            paymentId: payment.id,
            invoiceStatus: 'FULLY_PAID',
            amountPaid: remainingAmount
          })

        case 'requires_action':
          return NextResponse.json({
            requiresAction: true,
            clientSecret: paymentIntent.client_secret,
            paymentId: payment.id,
            paymentStatus: 'REQUIRES_ACTION'
          })

        case 'requires_payment_method':
          await handleFailedPayment(payment.id)
          return NextResponse.json(
            { 
              error: 'Payment method failed. Please update your payment method.',
              paymentId: payment.id,
              code: 'PAYMENT_METHOD_FAILED'
            },
            { status: 400 }
          )

        default:
          await handleFailedPayment(payment.id)
          return NextResponse.json(
            { 
              error: 'Payment processing failed',
              paymentId: payment.id,
              status: paymentIntent.status
            },
            { status: 400 }
          )
      }
    } catch (error: any) {
      console.error('Stripe processing error:', error)

      // Update payment status based on error
      await prisma.payment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          stripePaymentId: error.payment_intent?.id || null
        }
      })

      // Handle specific Stripe errors
      if (error.code === 'authentication_required') {
        return NextResponse.json(
          { 
            error: 'Payment requires authentication',
            requiresAction: true,
            clientSecret: error.payment_intent?.client_secret,
            paymentId: payment.id,
            code: 'AUTHENTICATION_REQUIRED'
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { 
          error: error.message || 'Payment processing failed',
          paymentId: payment.id,
          code: error.code || 'PROCESSING_ERROR'
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to handle successful payments
async function handleSuccessfulPayment(paymentId: string, invoiceId: string) {
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date() 
      }
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: 'FULLY_PAID',
        remainingAmount: 0,
        updatedAt: new Date()
      }
    })
  ])
}

// Helper function to handle failed payments
async function handleFailedPayment(paymentId: string) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { 
      status: 'FAILED',
      updatedAt: new Date()
    }
  })
}