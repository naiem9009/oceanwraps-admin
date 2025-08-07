import { NextResponse } from 'next/server'
import { testEmailConfiguration, sendPaymentConfirmationEmail } from '@/lib/email'

export async function POST() {
  try {
    console.log('🧪 Testing email configuration...')
    
    // Test SMTP connection
    await testEmailConfiguration()
    
    // Send test confirmation email
    await sendPaymentConfirmationEmail({
      to: process.env.SMTP_USER!, // Send to yourself for testing
      customerName: 'Test Customer',
      invoiceNumber: 'TEST-001',
      amount: 500,
      paymentType: 'ADVANCE',
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully' 
    })
  } catch (error) {
    console.error('❌ Email test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
