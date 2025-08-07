"use server"
import nodemailer from 'nodemailer'
import { generateFileInvoiceData } from './pdf-generate'

// Check if SMTP is configured
const isSmtpConfigured = !!(
  process.env.SMTP_HOST && 
  process.env.SMTP_USER && 
  process.env.SMTP_PASS
)

if (!isSmtpConfigured) {
  console.warn('⚠️ SMTP configuration missing. Email functionality will not work.')
  console.warn('Required environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT')
}

let transporter: nodemailer.Transporter | null = null

if (isSmtpConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    
    console.log('✅ SMTP transporter configured successfully')
  } catch (error) {
    console.error('❌ Failed to configure SMTP transporter:', error)
  }
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  customerName,
  totalAmount,
  advanceAmount,
  dueDate,
  paymentUrl,
  items,
}: {
  to: string
  invoiceNumber: string
  customerName: string
  totalAmount: number
  advanceAmount: number
  dueDate: string
  paymentUrl: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
}) {
  if (!transporter) {
    console.error('❌ Cannot send email: SMTP not configured')
    throw new Error('SMTP not configured')
  }

  console.log('📧 Preparing to send invoice email to:', to)

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; word-break: break-word;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.rate.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.amount.toFixed(2)}</td>
    </tr>
  `).join('')



  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Invoice ${invoiceNumber}</title>
      <style type="text/css">
        @media screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .header {
            padding: 20px 15px !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          .invoice-table {
            width: 100% !important;
          }
          .invoice-table th, 
          .invoice-table td {
            padding: 6px 4px !important;
            font-size: 14px !important;
          }
          .payment-button {
            padding: 12px 25px !important;
            font-size: 16px !important;
          }
          .section-title {
            font-size: 18px !important;
            margin-bottom: 10px !important;
          }
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f5f5f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" valign="top">
            <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 100%; margin: 0 auto;">
              <!-- Header -->
              <tr>
                <td class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <img src="https://oceanwraps.com/images/logo.png" alt="OceanWraps Logo" style="max-width: 120px; margin-bottom: 10px; height: auto; display: block; margin-left: auto; margin-right: auto;" />
                  <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Professional Boat Wrapping Services</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td class="content" style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
                  <div style="margin-bottom: 30px;">
                    <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px;">Invoice ${invoiceNumber}</h2>
                    <p style="color: #666; margin: 0;">Date: ${new Date().toLocaleDateString()}</p>
                    <p style="color: #666; margin: 5px 0 0 0;">Due Date: ${new Date(dueDate).toLocaleDateString()}</p>
                  </div>

                  <div style="margin-bottom: 30px;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 10px 0; font-size: 20px;">Bill To:</h3>
                    <p style="margin: 0; font-weight: bold;">${customerName}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">${to}</p>
                  </div>

                  <div style="margin-bottom: 30px; overflow-x: auto;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Invoice Items</h3>
                    <table class="invoice-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: collapse; border: 1px solid #ddd; min-width: 300px;">
                      <thead>
                        <tr style="background-color: #f8f9fa;">
                          <th style="padding: 12px 8px; text-align: left; border-bottom: 2px solid #ddd; font-weight: bold;">Description</th>
                          <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ddd; font-weight: bold;">Qty</th>
                          <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd; font-weight: bold;">Rate</th>
                          <th style="padding: 12px 8px; text-align: right; border-bottom: 2px solid #ddd; font-weight: bold;">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsHtml}
                      </tbody>
                    </table>
                  </div>

                  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 15px 0; font-size: 20px;">💳 Payment Structure</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <span style="font-weight: bold;">Total Amount:</span>
                      <span style="font-weight: bold; font-size: 18px;">$${totalAmount.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #2563eb;">
                      <span style="font-weight: bold;">Advance Payment (50%):</span>
                      <span style="font-weight: bold; font-size: 18px;">$${advanceAmount.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #6b7280;">
                      <span>Remaining (50%):</span>
                      <span>$${(totalAmount - advanceAmount).toFixed(2)} (charged after advance)</span>
                    </div>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${paymentUrl}" 
                       class="payment-button"
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              text-decoration: none; 
                              padding: 15px 40px; 
                              border-radius: 50px; 
                              font-weight: bold; 
                              font-size: 18px; 
                              display: inline-block; 
                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                              transition: transform 0.2s;">
                      💳 Pay Advance ($${advanceAmount.toFixed(2)}) Now
                    </a>
                  </div>

                  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      Questions? Reply to this email or contact us at oceanwraps@gmail.com
                    </p>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">
                      © ${new Date().getFullYear()} <a href="https://oceanwraps.com" style="color: #059669; text-decoration: none;">Oceanwraps</a>. All rights reserved.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `



  const pdfInvoice = await generateFileInvoiceData({
    invoiceNumber,
    date: new Date().toISOString(),
    dueData: dueDate,
    totalDue: totalAmount.toFixed(2),
    invoiceTo: {
      name: customerName,
      email: to,
    },
    items,
    advanceAmount: advanceAmount.toFixed(2),
    totalAmount : totalAmount.toFixed(2),
    note: '50% deposit is required to begin production unless otherwise stated. A 50% deposit is also required to schedule your project.  We cannot hold dates without a deposit',
    status: 'unpaid',
  })


  const mailOptions = {
    from: `"Oceanwraps" <${process.env.SMTP_USER}>`,
    to,
    bcc: "developernaim83@gmail.com",
    subject: `Invoice ${invoiceNumber} - Advance Payment Required ($${advanceAmount.toFixed(2)})`,
    html: emailHtml,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfInvoice,
        contentType: 'application/pdf',
      },
    ],
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ Invoice email sent successfully:', result.messageId)
    return result
  } catch (error) {
    console.error('❌ Failed to send invoice email:', error)
    throw error
  }
}

export async function sendPaymentConfirmationEmail({
  to,
  customerName,
  invoiceNumber,
  amount,
  items,
  paymentType,
  totalAmount,
  advanceAmount,
  dueDate,
  totalDue
  
}: {
  to: string
  customerName: string
  invoiceNumber: string
  amount: number
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>,
  paymentType: 'ADVANCE' | 'REMAINING'
  totalAmount: number
  advanceAmount: number
  dueDate: string
  totalDue : number
}) {
  if (!transporter) {
    console.error('❌ Cannot send confirmation email: SMTP not configured')
    throw new Error('SMTP not configured')
  }

  console.log('📧 Preparing to send confirmation email to:', to)

  const isAdvance = paymentType === 'ADVANCE'
  const title = isAdvance ? 'Advance Payment Confirmed' : 'Final Payment Completed'
  const message = isAdvance 
    ? 'Your advance payment has been successfully processed. We\'ll now begin work on your project.'
    : 'Your final payment has been successfully processed. Thank you for choosing OceanWraps!'

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Payment Confirmation</title>
      <style type="text/css">
        @media screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .header {
            padding: 20px 15px !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          .section-title {
            font-size: 18px !important;
            margin-bottom: 10px !important;
          }
          .payment-details {
            padding: 15px !important;
          }
          .status-box {
            padding: 12px !important;
          }
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f5f5f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
          <td align="center" valign="top">
            <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="width: 600px; max-width: 100%; margin: 0 auto;">
              <!-- Header -->
              <tr>
                <td class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <img src="https://oceanwraps.com/images/logo.png" alt="OceanWraps Logo" style="max-width: 120px; margin-bottom: 10px; height: auto; display: block; margin-left: auto; margin-right: auto;" />
                  <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">${title}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td class="content" style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
                  <div style="margin-bottom: 30px; text-align: center;">
                    <h2 style="color: #333; margin: 0 0 5px 0; font-size: 22px;">Invoice ${invoiceNumber}</h2>
                    <p style="color: #666; margin: 0;">${new Date().toLocaleDateString()}</p>
                  </div>

                  <div style="margin-bottom: 30px;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 10px 0; font-size: 20px;">Customer:</h3>
                    <p style="margin: 0; font-weight: bold;">${customerName}</p>
                    <p style="margin: 5px 0 0 0; color: #666;">${to}</p>
                  </div>

                  <div class="payment-details" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Payment Details</h3>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <span>Payment Type:</span>
                      <span style="font-weight: bold;">${isAdvance ? 'Advance (50%)' : 'Final (50%)'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                      <span>Amount Paid:</span>
                      <span style="font-weight: bold; color: #2563eb; font-size: 18px;">$${amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style="margin-bottom: 30px;">
                    <h3 class="section-title" style="color: #333; margin: 0 0 15px 0; font-size: 20px;">Status</h3>
                    <div class="status-box" style="background: #ecfdf5; color: #065f46; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                      <p style="margin: 0; font-weight: bold;">✅ ${message}</p>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      Questions? Reply to this email or contact us at oceanwraps@gmail.com
                    </p>
                    <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">
                      © ${new Date().getFullYear()} <a href="https://oceanwraps.com" style="color: #2563eb; text-decoration: none;">Oceanwraps</a>. All rights reserved.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `


  const pdfInvoice = await generateFileInvoiceData({
    invoiceNumber,
    date: new Date().toISOString(),
    dueData: dueDate,
    totalDue: totalDue.toFixed(2),
    invoiceTo: {
      name: customerName,
      email: to,
    },
    items,
    totalAmount: totalAmount.toFixed(2),
    advanceAmount: advanceAmount.toFixed(2),
    note: '',
    status: isAdvance ? 'partial' : 'paid',
  })

  const mailOptions = {
    from: `"Oceanwraps" <${process.env.SMTP_USER}>`,
    bcc: "developernaim83@gmail.com",
    to,
    subject: `Payment Confirmed - ${invoiceNumber} ($${amount.toFixed(2)})`,
    html: emailHtml,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfInvoice,
        contentType: 'application/pdf',
      },
    ],
  }

  try {
    const result = await transporter.sendMail(mailOptions)
    console.log('✅ Confirmation email sent successfully:', result.messageId)
    return result
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error)
    throw error
  }
}

// Test email configuration
export async function testEmailConfiguration() {
  if (!transporter) {
    throw new Error('SMTP not configured')
  }

  try {
    await transporter.verify()
    console.log('✅ SMTP configuration is valid')
    return true
  } catch (error) {
    console.error('❌ SMTP configuration test failed:', error)
    throw error
  }
}