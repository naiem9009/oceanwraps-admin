import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendInvoiceEmail } from '@/lib/email'
import { generatePdfFromHtml } from '@/lib/pdf-generate'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: true,
      }
    })
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    
    // Create payment URL for customer
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.id}`


    
    await sendInvoiceEmail({
      to: invoice.customer.email,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      totalAmount: Number(invoice.totalAmount),
      advanceAmount: Number(invoice.advanceAmount || 0),
      dueDate: invoice.dueDate.toISOString(),
      paymentUrl,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: Number(item.rate),
        amount: Number(item.amount),
      })),
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
