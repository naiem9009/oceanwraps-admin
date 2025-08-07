import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    
    const skip = (page - 1) * limit
    
    // Build where clause for search and filters
    const where: any = {}
    
    if (search) {
      where.OR = [
        {
          invoiceNumber: {
            contains: search,
            mode: 'insensitive'
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
        }
      ]
    }
    
    if (status && status !== 'ALL') {
      where.status = status
    }
    
    console.log('Invoice query:', { page, limit, search, status, where })
    
    // Get total count for pagination
    const totalCount = await prisma.invoice.count({ where })
    
    // Get invoices with pagination
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
    
    const totalPages = Math.ceil(totalCount / limit)
    
    console.log(`Found ${invoices.length} invoices (${totalCount} total, page ${page}/${totalPages})`)
    
    return NextResponse.json({
      invoices,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { clientName, clientEmail, clientAddress, invoiceNumber, dueDate, notes, items, totalAmount } = data
    
    // Calculate advance (50%) and remaining amounts
    const advanceAmount = totalAmount * 0.5
    const remainingAmount = totalAmount * 0.5
    
    // Create or find customer
    let customer = await prisma.customer.findUnique({
      where: { email: clientEmail }
    })
    
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: clientName,
          email: clientEmail,
          address: clientAddress,
        }
      })
    }
    
    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        totalAmount,
        advanceAmount,
        remainingAmount,
        status: 'ADVANCE_PENDING',
        dueDate: new Date(dueDate),
        notes,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        }
      },
      include: {
        customer: true,
        items: true,
      }
    })
    
    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
