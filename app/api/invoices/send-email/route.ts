import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, clientEmail } = await request.json()
    
    // Mock email sending
    // In production, use actual email service like Resend, SendGrid, or Nodemailer:
    /*
    const nodemailer = require('nodemailer')
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
    
    await transporter.sendMail({
      from: 'admin@oceanwraps.com',
      to: clientEmail,
      subject: `Invoice ${invoiceId} from OceanWraps`,
      html: `
        <h2>Invoice from OceanWraps</h2>
        <p>Please find your invoice attached.</p>
        <p>You can pay online using this link: [Payment Link]</p>
      `,
    })
    */
    
    // Mock success response
    console.log(`Mock: Sending invoice ${invoiceId} to ${clientEmail}`)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
