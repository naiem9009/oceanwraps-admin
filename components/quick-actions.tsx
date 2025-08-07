import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Eye, CreditCard } from 'lucide-react'

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks you can perform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/dashboard/invoices/new">
            <Button className="w-full h-20 flex-col gap-2">
              <Plus className="h-6 w-6" />
              Create Invoice
            </Button>
          </Link>
          
          <Link href="/dashboard/invoices">
            <Button variant="outline" className="w-full h-20 flex-col gap-2">
              <Eye className="h-6 w-6" />
              View Invoices
            </Button>
          </Link>
          
          <Link href="/dashboard/payments">
            <Button variant="outline" className="w-full h-20 flex-col gap-2">
              <CreditCard className="h-6 w-6" />
              Manage Payments
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
