// import { NextRequest, NextResponse } from 'next/server'
// import { stripe } from '@/lib/stripe'
// import { prisma } from '@/lib/prisma'
// import { sendPaymentConfirmationEmail } from '@/lib/email'
// import Stripe from 'stripe'
// import { InvoiceStatus } from '@prisma/client'

// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
// const TRANSACTION_TIMEOUT = 30000 // 30 seconds

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.text()
//     const signature = request.headers.get('stripe-signature')!
    
//     let event: Stripe.Event
    
//     try {
//       event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
//       console.log('✅ Webhook verified:', event.type)
//     } catch (err) {
//       console.error('❌ Webhook verification failed:', err)
//       return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
//     }
    
//     switch (event.type) {
//       case 'payment_intent.succeeded':
//         await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
//         break
        
//       case 'payment_intent.payment_failed':
//         await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
//         break
        
//       default:
//         console.log(`ℹ️ Unhandled event type: ${event.type}`)
//     }
    
//     return NextResponse.json({ received: true })
//   } catch (error) {
//     console.error('💥 Webhook processing error:', error)
//     return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
//   }
// }

// async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
//   console.log('🔍 Processing successful payment:', paymentIntent.id)
  
//   try {
//     // Try to find existing payment
//     const payment = await prisma.payment.findUnique({
//       where: { stripePaymentId: paymentIntent.id },
//       include: { 
//         invoice: {
//           include: {
//             customer: {
//               include: {
//                 paymentMethods: true
//               }
//             }
//           }
//         }
//       }
//     })

//     if (!payment) {
//       console.log('🔄 Payment not found, checking metadata for invoice details')
//       return await handleMissingPaymentRecord(paymentIntent)
//     }

//     console.log('✅ Found payment record:', payment.id)
//     await processPaymentSuccessWithRetry(payment, paymentIntent)
    
//   } catch (error) {
//     console.error('💥 Error in handlePaymentSucceeded:', error)
//   }
// }

// async function handleMissingPaymentRecord(paymentIntent: Stripe.PaymentIntent) {
//   const invoiceId = paymentIntent.metadata?.invoiceId
//   const customerId = paymentIntent.metadata?.customerId
//   const paymentType = paymentIntent.metadata?.paymentType

//   if (!invoiceId || !customerId || !paymentType) {
//     console.error('❌ Missing required metadata to recreate payment')
//     return
//   }

//   try {
//     const invoice = await prisma.invoice.findUnique({
//       where: { id: invoiceId },
//       include: { customer: true }
//     })

//     if (!invoice) {
//       console.error('❌ Invoice not found:', invoiceId)
//       return
//     }

//     const amount = paymentType === 'ADVANCE' 
//       ? invoice.advanceAmount 
//       : invoice.remainingAmount

//     const newPayment = await prisma.payment.create({
//       data: {
//         invoiceId: invoice.id,
//         customerId: invoice.customer.id,
//         amount: amount,
//         type: paymentType as 'ADVANCE' | 'REMAINING',
//         status: 'COMPLETED',
//         stripePaymentId: paymentIntent.id,
//       },
//       include: {
//         invoice: {
//           include: {
//             customer: {
//               include: {
//                 paymentMethods: true
//               }
//             }
//           }
//         }
//       }
//     })

//     console.log('✅ Created missing payment record:', newPayment.id)
//     await processPaymentSuccessWithRetry(newPayment, paymentIntent)
//   } catch (error) {
//     console.error('💥 Error creating missing payment record:', error)
//   }
// }

// async function processPaymentSuccessWithRetry(payment: any, paymentIntent: Stripe.PaymentIntent, retries = 3) {
//   try {
//     return await processPaymentSuccess(payment, paymentIntent)
//   } catch (error: any) {
//     if (retries > 0 && (error.code === 'P2028' || error.message.includes('deadlock'))) {
//       console.log(`🔄 Retrying payment processing (${retries} attempts left)`)
//       await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries))) // Exponential backoff
//       return processPaymentSuccessWithRetry(payment, paymentIntent, retries - 1)
//     }
//     throw error
//   }
// }

// async function processPaymentSuccess(payment: any, paymentIntent: Stripe.PaymentIntent) {
//   console.log('🔄 Processing payment success for:', payment.id)

//   // Break into smaller transactions to avoid deadlocks and timeouts
//   try {
//     // Transaction 1: Update payment status
//     await prisma.$transaction(async (tx) => {
//       await tx.payment.update({
//         where: { id: payment.id },
//         data: { 
//           status: 'COMPLETED',
//           stripePaymentId: paymentIntent.id
//         }
//       })
//     }, { timeout: TRANSACTION_TIMEOUT })

//     console.log('✅ Payment status updated to COMPLETED')

//     // Transaction 2: Handle payment method if needed
//     if (payment.type === 'ADVANCE' && paymentIntent.payment_method) {
//       await handlePaymentMethodWithRetry(
//         payment.customerId,
//         paymentIntent.payment_method as string,
//         payment.invoice.customer.paymentMethods
//       )
//     }

//     // Transaction 3: Update invoice status
//     const { updatedInvoice, newInvoiceStatus } = await updateInvoiceStatus(payment)

//     // Transaction 4: Send confirmation email (outside transaction)
//     await sendConfirmationEmailWithRetry(updatedInvoice, payment, newInvoiceStatus)

//     return { success: true }
//   } catch (error) {
//     console.error('💥 Error in processPaymentSuccess:', error)
//     throw error
//   }
// }

// async function handlePaymentMethodWithRetry(customerId: string, paymentMethodId: string, existingMethods: any[], retries = 3) {
//   try {
//     return await handlePaymentMethod(customerId, paymentMethodId, existingMethods)
//   } catch (error: any) {
//     if (retries > 0 && (error.code === 'P2028' || error.message.includes('deadlock'))) {
//       console.log(`🔄 Retrying payment method handling (${retries} attempts left)`)
//       await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
//       return handlePaymentMethodWithRetry(customerId, paymentMethodId, existingMethods, retries - 1)
//     }
//     throw error
//   }
// }

// async function handlePaymentMethod(customerId: string, paymentMethodId: string, existingPaymentMethods: any[]) {
//   console.log('💳 Processing payment method for customer:', customerId)
  
//   const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
//   const cardFingerprint = paymentMethod.card?.fingerprint

//   // Check for existing payment method
//   const existingMethod = existingPaymentMethods.find(
//     pm => pm.stripePaymentMethodId === paymentMethodId
//   )

//   if (existingMethod) {
//     console.log('🔄 Payment method exists, making it default')
//     await updateExistingPaymentMethod(customerId, existingMethod.id, paymentMethod)
//     return
//   }

//   // Check for duplicate card by fingerprint
//   if (cardFingerprint) {
//     const duplicateCard = existingPaymentMethods.find(
//       pm => pm.cardFingerprint === cardFingerprint
//     )

//     if (duplicateCard) {
//       console.log('🔄 Found duplicate card, updating existing record')
//       await updateDuplicateCard(customerId, duplicateCard.id, paymentMethodId, paymentMethod)
//       return
//     }
//   }

//   // Create new payment method
//   console.log('➕ Creating new payment method')
//   await createNewPaymentMethod(customerId, paymentMethod)
// }

// async function updateExistingPaymentMethod(customerId: string, methodId: string, paymentMethod: Stripe.PaymentMethod) {
//   await prisma.$transaction([
//     prisma.paymentMethod.updateMany({
//       where: { 
//         customerId,
//         id: { not: methodId }
//       },
//       data: { isDefault: false }
//     }),
//     prisma.paymentMethod.update({
//       where: { id: methodId },
//       data: { 
//         isDefault: true,
//         expiryMonth: paymentMethod.card?.exp_month,
//         expiryYear: paymentMethod.card?.exp_year
//       }
//     })
//   ])
// }

// async function updateDuplicateCard(customerId: string, duplicateId: string, paymentMethodId: string, paymentMethod: Stripe.PaymentMethod) {
//   await prisma.$transaction([
//     prisma.paymentMethod.updateMany({
//       where: { 
//         customerId,
//         id: { not: duplicateId }
//       },
//       data: { isDefault: false }
//     }),
//     prisma.paymentMethod.update({
//       where: { id: duplicateId },
//       data: { 
//         stripePaymentMethodId: paymentMethodId,
//         last4: paymentMethod.card?.last4,
//         brand: paymentMethod.card?.brand,
//         expiryMonth: paymentMethod.card?.exp_month,
//         expiryYear: paymentMethod.card?.exp_year,
//         isDefault: true
//       }
//     })
//   ])
// }

// async function createNewPaymentMethod(customerId: string, paymentMethod: Stripe.PaymentMethod) {
//   try {
//     await prisma.$transaction([
//       prisma.paymentMethod.updateMany({
//         where: { customerId },
//         data: { isDefault: false }
//       }),
//       prisma.paymentMethod.create({
//         data: {
//           customerId,
//           stripePaymentMethodId: paymentMethod.id,
//           type: paymentMethod.type,
//           last4: paymentMethod.card?.last4 || '',
//           brand: paymentMethod.card?.brand || '',
//           expiryMonth: paymentMethod.card?.exp_month || 0,
//           expiryYear: paymentMethod.card?.exp_year || 0,
//           cardFingerprint: paymentMethod.card?.fingerprint || null,
//           isDefault: true,
//         }
//       })
//     ])
//   } catch (error: any) {
//     if (error.code === 'P2002') {
//       console.log('🔄 Payment method already exists, updating instead')
//       await prisma.paymentMethod.update({
//         where: { stripePaymentMethodId: paymentMethod.id },
//         data: {
//           isDefault: true,
//           last4: paymentMethod.card?.last4,
//           brand: paymentMethod.card?.brand,
//           expiryMonth: paymentMethod.card?.exp_month,
//           expiryYear: paymentMethod.card?.exp_year,
//           cardFingerprint: paymentMethod.card?.fingerprint
//         }
//       })
//     } else {
//       throw error
//     }
//   }
// }

// async function updateInvoiceStatus(payment: any) {
//   const newInvoiceStatus = payment.type === 'ADVANCE' 
//     ? 'ADVANCE_PAID' 
//     : payment.type === 'REMAINING' 
//       ? 'FULLY_PAID' 
//       : payment.invoice.status

//   console.log(`📄 Updating invoice status to ${newInvoiceStatus}`)

//   const updatedInvoice = await prisma.invoice.update({
//     where: { id: payment.invoiceId },
//     data: { 
//       status: newInvoiceStatus,
//       ...(payment.type === 'REMAINING' && { remainingAmount: 0 }),
//       updatedAt: new Date()
//     },
//     include: {
//       items: true,
//       customer: true,
//       payments: {
//         where: { status: 'COMPLETED' }
//       }
//     }
//   })

//   return { updatedInvoice, newInvoiceStatus }
// }

// async function sendConfirmationEmailWithRetry(invoice: any, payment: any, status: InvoiceStatus, retries = 3) {
//   try {
//     const emailData = {
//       to: invoice.customer.email,
//       customerName: invoice.customer.name,
//       invoiceNumber: invoice.invoiceNumber,
//       amount: payment.amount.toNumber(),
//       paymentType: payment.type,
//       advanceAmount: invoice.advanceAmount.toNumber(),
//       dueDate: invoice.dueDate.toISOString().split('T')[0],
//       items: invoice.items.map((item: any) => ({
//         description: item.description,
//         rate: item.rate.toNumber(),
//         quantity: item.quantity,
//         amount: item.amount.toNumber(),
//       })),
//       totalAmount: invoice.totalAmount.toNumber(),
//       totalDue: invoice.remainingAmount.toNumber(),
//       status: status === 'FULLY_PAID' ? 'paid' : 
//               status === 'ADVANCE_PAID' ? 'partial' : 'unpaid',
//       paymentMethod: payment.paymentMethod 
//         ? `${payment.paymentMethod.brand} ****${payment.paymentMethod.last4}`
//         : undefined
//     }

//     console.log('📧 Sending confirmation email to:', invoice.customer.email)
//     await sendPaymentConfirmationEmail(emailData)
//     console.log('✅ Confirmation email sent successfully')
//   } catch (error) {
//     if (retries > 0) {
//       console.log(`🔄 Retrying email send (${retries} attempts left)`)
//       await new Promise(resolve => setTimeout(resolve, 1000))
//       return sendConfirmationEmailWithRetry(invoice, payment, status, retries - 1)
//     }
//     console.error('❌ Failed to send confirmation email after retries:', error)
//   }
// }

// async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
//   console.log('❌ Processing failed payment:', paymentIntent.id)
  
//   try {
//     const payment = await prisma.payment.findUnique({
//       where: { stripePaymentId: paymentIntent.id }
//     })
    
//     if (payment) {
//       await prisma.payment.update({
//         where: { id: payment.id },
//         data: { status: 'FAILED' }
//       })
//       console.log('✅ Payment status updated to FAILED')
//     } else {
//       console.log('⚠️ Payment not found for failed payment intent')
//     }
//   } catch (error) {
//     console.error('💥 Error handling payment failure:', error)
//   }
// }

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
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Webhook verified:', event.type)
    } catch (err) {
      console.error('❌ Webhook verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
        
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('💥 Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('🔍 Processing successful payment:', paymentIntent.id)
  
  try {
    // First try to find existing payment with upsert approach
    const payment = await prisma.payment.upsert({
      where: { stripePaymentId: paymentIntent.id },
      update: {
        status: 'COMPLETED'
      },
      create: {
        invoiceId: paymentIntent.metadata?.invoiceId || '',
        customerId: paymentIntent.metadata?.customerId || '',
        amount: paymentIntent.amount / 100, // Convert from cents to dollars
        type: paymentIntent.metadata?.paymentType as 'ADVANCE' | 'REMAINING' || 'REMAINING',
        status: 'COMPLETED',
        stripePaymentId: paymentIntent.id,
      },
      include: {
        invoice: {
          include: {
            customer: {
              include: {
                paymentMethods: true
              }
            }
          }
        }
      }
    })

    console.log('✅ Payment record processed:', payment.id)
    await processPaymentSuccessWithRetry(payment, paymentIntent)
    
  } catch (error) {
    console.error('💥 Error in handlePaymentSucceeded:', error)
  }
}

async function processPaymentSuccessWithRetry(payment: any, paymentIntent: Stripe.PaymentIntent, retries = 3) {
  try {
    return await processPaymentSuccess(payment, paymentIntent)
  } catch (error: any) {
    if (retries > 0) {
      console.log(`🔄 Retrying payment processing (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
      return processPaymentSuccessWithRetry(payment, paymentIntent, retries - 1)
    }
    console.error('💥 Failed after retries:', error)
    throw error
  }
}

async function processPaymentSuccess(payment: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('🔄 Processing payment success for:', payment.id)

  try {
    // Handle payment method if needed (separate transaction)
    if (payment.type === 'ADVANCE' && paymentIntent.payment_method) {
      await handlePaymentMethodWithRetry(
        payment.invoice.customerId,
        paymentIntent.payment_method as string,
        payment.invoice.customer.paymentMethods
      )
    }

    // Update invoice status (separate transaction)
    const { updatedInvoice, newInvoiceStatus } = await updateInvoiceStatus(payment)

    // Send confirmation email (outside transaction)
    await sendConfirmationEmailWithRetry(updatedInvoice, payment, newInvoiceStatus)

    return { success: true }
  } catch (error) {
    console.error('💥 Error in processPaymentSuccess:', error)
    throw error
  }
}

async function handlePaymentMethodWithRetry(
  customerId: string, 
  paymentMethodId: string, 
  existingMethods: any[], 
  retries = 3
) {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    const cardFingerprint = paymentMethod.card?.fingerprint

    // Check for existing payment method
    const existingMethod = existingMethods.find(
      pm => pm.stripePaymentMethodId === paymentMethodId
    )

    if (existingMethod) {
      console.log('🔄 Payment method exists, making it default')
      await prisma.paymentMethod.update({
        where: { id: existingMethod.id },
        data: { 
          isDefault: true,
          expiryMonth: paymentMethod.card?.exp_month,
          expiryYear: paymentMethod.card?.exp_year
        }
      })
      return
    }

    // Check for duplicate card by fingerprint
    if (cardFingerprint) {
      const duplicateCard = existingMethods.find(
        pm => pm.cardFingerprint === cardFingerprint
      )

      if (duplicateCard) {
        console.log('🔄 Found duplicate card, updating existing record')
        await prisma.paymentMethod.update({
          where: { id: duplicateCard.id },
          data: { 
            stripePaymentMethodId: paymentMethodId,
            last4: paymentMethod.card?.last4,
            brand: paymentMethod.card?.brand,
            expiryMonth: paymentMethod.card?.exp_month,
            expiryYear: paymentMethod.card?.exp_year,
            isDefault: true
          }
        })
        return
      }
    }

    // Create new payment method
    console.log('➕ Creating new payment method')
    await prisma.paymentMethod.create({
      data: {
        customerId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || '',
        brand: paymentMethod.card?.brand || '',
        expiryMonth: paymentMethod.card?.exp_month || 0,
        expiryYear: paymentMethod.card?.exp_year || 0,
        cardFingerprint: paymentMethod.card?.fingerprint || null,
        isDefault: true,
      }
    })

  } catch (error: any) {
    if (retries > 0) {
      console.log(`🔄 Retrying payment method handling (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 500 * (4 - retries)))
      return handlePaymentMethodWithRetry(customerId, paymentMethodId, existingMethods, retries - 1)
    }
    console.error('💥 Failed to handle payment method after retries:', error)
    throw error
  }
}

async function updateInvoiceStatus(payment: any) {
  const newInvoiceStatus: InvoiceStatus = payment.type === 'ADVANCE' 
    ? 'ADVANCE_PAID' as InvoiceStatus
    : 'FULLY_PAID' as InvoiceStatus

  console.log(`📄 Updating invoice status to ${newInvoiceStatus}`)

  const updatedInvoice = await prisma.invoice.update({
    where: { id: payment.invoiceId },
    data: { 
      status: newInvoiceStatus,
      ...(payment.type === 'REMAINING' && { remainingAmount: 0 }),
      updatedAt: new Date()
    },
    include: {
      items: true,
      customer: true,
      payments: {
        where: { status: 'COMPLETED' }
      }
    }
  })

  return { updatedInvoice, newInvoiceStatus }
}

async function sendConfirmationEmailWithRetry(
  invoice: any, 
  payment: any, 
  status: InvoiceStatus, 
  retries = 3
) {
  try {
    const emailData = {
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: payment.amount,
      paymentType: payment.type,
      advanceAmount: invoice.advanceAmount,
      dueDate: invoice.dueDate.toISOString().split('T')[0],
      items: invoice.items.map((item: any) => ({
        description: item.description,
        rate: item.rate,
        quantity: item.quantity,
        amount: item.amount,
      })),
      totalAmount: invoice.totalAmount,
      totalDue: invoice.remainingAmount,
      status: status === 'FULLY_PAID' ? 'paid' : 'partial',
      paymentMethod: payment.paymentMethod 
        ? `${payment.paymentMethod.brand} ****${payment.paymentMethod.last4}`
        : undefined
    }

    console.log('📧 Sending confirmation email to:', invoice.customer.email)
    await sendPaymentConfirmationEmail(emailData)
    console.log('✅ Confirmation email sent successfully')
  } catch (error) {
    if (retries > 0) {
      console.log(`🔄 Retrying email send (${retries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      return sendConfirmationEmailWithRetry(invoice, payment, status, retries - 1)
    }
    console.error('❌ Failed to send confirmation email after retries:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Processing failed payment:', paymentIntent.id)
  
  try {
    await prisma.payment.upsert({
      where: { stripePaymentId: paymentIntent.id },
      update: {
        status: 'FAILED'
      },
      create: {
        invoiceId: paymentIntent.metadata?.invoiceId || '',
        customerId: paymentIntent.metadata?.customerId || '',
        amount: paymentIntent.amount / 100,
        type: paymentIntent.metadata?.paymentType as 'ADVANCE' | 'REMAINING' || 'REMAINING',
        status: 'FAILED',
        stripePaymentId: paymentIntent.id,
      }
    })
    console.log('✅ Payment status updated to FAILED')
  } catch (error) {
    console.error('💥 Error handling payment failure:', error)
  }
}