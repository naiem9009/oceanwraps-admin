import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalRevenue, 
      totalInvoices, 
      advancePending, 
      remainingPending,
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments
    ] = await Promise.all([
      // Total revenue from completed payments
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      
      // Total invoices count
      prisma.invoice.count(),
      
      // Invoices waiting for advance payment
      prisma.invoice.count({
        where: { status: 'ADVANCE_PENDING' }
      }),
      
      // Invoices with advance paid, waiting for remaining
      prisma.invoice.count({
        where: { status: 'ADVANCE_PAID' }
      }),

      // Payment statistics
      prisma.payment.count(),
      
      prisma.payment.count({
        where: { status: 'COMPLETED' }
      }),
      
      prisma.payment.count({
        where: { status: 'PENDING' }
      }),
      
      prisma.payment.count({
        where: { status: 'FAILED' }
      })
    ])

    const stats = {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalInvoices,
      advancePending,
      remainingPending,
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments
    }
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
