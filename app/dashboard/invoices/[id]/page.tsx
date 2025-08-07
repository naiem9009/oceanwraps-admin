import { InvoiceDetail } from '@/components/invoice-detail'

export default async function InvoiceDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  return (
    <div className="space-y-8">
      <InvoiceDetail invoiceId={(await params).id} />
    </div>
  )
}
