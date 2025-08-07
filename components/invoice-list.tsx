"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Eye, Send, Download, Mail, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    name: string
    email: string
  }
  totalAmount: number
  advanceAmount: number
  remainingAmount: number
  status: string
  createdAt: string
  dueDate: string
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  const [loading, setLoading] = useState(true)
  const [emailLoading, setEmailLoading] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchInvoices()
  }, [currentPage, searchTerm, statusFilter])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        status: statusFilter,
      })
      
      const response = await fetch(`/api/invoices?${params}`)
      const data = await response.json()
      
      setInvoices(data.invoices || [])
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      })
    } catch (error) {
      console.error('Error fetching invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSendEmail = async (invoiceId: string) => {
    setEmailLoading(invoiceId)
    setEmailSuccess(null)
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
      })
      
      if (response.ok) {
        setEmailSuccess(invoiceId)
        setTimeout(() => setEmailSuccess(null), 3000)
      } else {
        alert('Failed to send invoice email')
      }
    } catch (error) {
      alert('Error sending invoice email')
    } finally {
      setEmailLoading(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_PAID':
        return 'bg-green-100 text-green-800'
      case 'ADVANCE_PAID':
        return 'bg-blue-100 text-blue-800'
      case 'ADVANCE_PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FULLY_PAID':
        return 'Fully Paid'
      case 'ADVANCE_PAID':
        return 'Advance Paid'
      case 'ADVANCE_PENDING':
        return 'Advance Pending'
      case 'OVERDUE':
        return 'Overdue'
      default:
        return status
    }
  }

  const canSendEmail = (status: string) => {
    // Hide send email button for advance paid and fully paid invoices
    return status === 'ADVANCE_PENDING' || status === 'OVERDUE'
  }

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 5
    
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === pagination.currentPage ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePageChange(i)}
          disabled={loading}
        >
          {i}
        </Button>
      )
    }
    
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalCount)} of {pagination.totalCount} invoices
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPreviousPage || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          {pages}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {emailSuccess && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            Invoice email sent successfully! Customer will receive payment instructions.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                Manage and track all your invoices with payment status
              </CardDescription>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ADVANCE_PENDING">Advance Pending</SelectItem>
                  <SelectItem value="ADVANCE_PAID">Advance Paid</SelectItem>
                  <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                {searchTerm || statusFilter !== 'ALL' ? (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      No invoices found matching your search criteria.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('ALL')
                        setCurrentPage(1)
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted-foreground mb-4">
                      No invoices found. Create your first invoice to get started.
                    </p>
                    <Link href="/dashboard/invoices/new">
                      <Button>Create Invoice</Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusText(invoice.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invoice.customer.name}</p>
                      <p className="text-xs text-muted-foreground">{invoice.customer.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Advance: ${Number(invoice.advanceAmount).toFixed(2)}</span>
                        <span>•</span>
                        <span>Remaining: ${Number(invoice.remainingAmount).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">${Number(invoice.totalAmount).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link href={`/dashboard/invoices/${invoice.id}`}>
                          <Button variant="outline" size="sm" title="View Invoice">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {canSendEmail(invoice.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(invoice.id)}
                            disabled={emailLoading === invoice.id}
                            title="Send Invoice Email"
                          >
                            {emailLoading === invoice.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm" title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="border-t pt-4">
                    {renderPagination()}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
