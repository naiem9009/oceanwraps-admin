import { DashboardStats } from '@/components/dashboard-stats'
import { RecentInvoices } from '@/components/recent-invoices'
import { QuickActions } from '@/components/quick-actions'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Ocean Wraps payment management system
        </p>
      </div>
      
      <DashboardStats />
      <QuickActions />
      <RecentInvoices />
    </div>
  )
}
