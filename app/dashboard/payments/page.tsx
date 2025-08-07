import { PaymentList } from '@/components/payment-list'

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">
          Track all payments and transactions
        </p>
      </div>
      
      <PaymentList />
    </div>
  )
}
