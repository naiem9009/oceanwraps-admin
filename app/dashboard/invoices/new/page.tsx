import { InvoiceForm } from '@/components/invoice-form'

export default function NewInvoicePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground">
          Create a new invoice for your client
        </p>
      </div>
      
      <InvoiceForm />
    </div>
  )
}
