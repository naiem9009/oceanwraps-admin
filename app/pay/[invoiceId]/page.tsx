import { CustomerPaymentPage } from '@/components/customer-payment-page'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Payment | Ocean Wraps',
  description: 'Make a payment for your boat wrapping invoice.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    }
  },
  themeColor: '#020817',
  metadataBase: new URL(process.env.ADMIN_BASE_URL || 'http://localhost:3000'),
}

export default async function PaymentPage({ 
  params 
}: { 
  params: { invoiceId: string } 
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      customer: true,
      items: true,
    }
  })

  if (!invoice) {
    notFound()
  }

  if (invoice.status !== 'ADVANCE_PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Available</h1>
          <p className="text-gray-600">
            This invoice is not available for payment or has already been paid.
          </p>
        </div>
      </div>
    )
  }

  // Convert Decimal values to numbers
  const serializedInvoice = {
    ...invoice,
    totalAmount: invoice.totalAmount.toNumber(),
    advanceAmount: invoice.advanceAmount.toNumber(),
    remainingAmount: invoice.remainingAmount.toNumber(),
    dueDate: invoice.dueDate.toISOString(),
    items: invoice.items.map(item => ({
      ...item,
      rate: item.rate.toNumber(),
      amount: item.amount.toNumber()
    }))
  }

  return <CustomerPaymentPage invoice={serializedInvoice} />
}