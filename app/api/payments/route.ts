import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    
    const skip = (page - 1) * limit
    
    // Build where clause for search and filters
    const where: any = {}
    
    if (search) {
      where.OR = [
        {
          invoice: {
            invoiceNumber: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          customer: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          customer: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          stripePaymentId: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    if (type && type !== 'ALL') {
      where.type = type
    }
    
    console.log('Payment query:', { page, limit, search, status, type, where })
    
    // Get total count for pagination
    const totalCount = await prisma.payment.count({ where })
    
    // Get payments with pagination
    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: true,
        customer: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
    
    const totalPages = Math.ceil(totalCount / limit)
    
    console.log(`Found ${payments.length} payments (${totalCount} total, page ${page}/${totalPages})`)
    
    return NextResponse.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
