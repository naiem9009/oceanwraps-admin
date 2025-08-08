"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, ArrowLeft, AlertCircle, CheckCircle, RefreshCw, Mail } from 'lucide-react'
import Link from 'next/link'
import { toast, Toaster } from 'sonner'

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    name: string
    email: string
    address: string
    paymentMethods: Array<{
      id: string
      last4: string
      brand: string
      isDefault: boolean
    }>
  }
  totalAmount: number
  advanceAmount: number
  remainingAmount: number
  status: string
  createdAt: string
  dueDate: string
  notes: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
  payments: Array<{
    id: string
    amount: number
    type: string
    status: string
    createdAt: string
    paymentMethod?: {
      last4: string
      brand: string
    }
  }>
}

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchInvoice()
    
    // Auto-refresh every 10 seconds to catch webhook updates
    const interval = setInterval(fetchInvoice, 10000)
    return () => clearInterval(interval)
  }, [invoiceId])

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`)
      const data = await response.json()
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchInvoice()
  }



  const handleChargeRemaining = async () => {
    // Show confirmation dialog
    toast('Confirm Payment', {
      description: `Charge remaining $${Number(invoice?.remainingAmount).toFixed(2)}?`,
      action: {
        label: 'Confirm',
        onClick: async () => {
          setActionLoading(true)
          const toastId = toast.loading('Processing payment...')
          
          try {
            const response = await fetch('/api/payments/charge-remaining', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoiceId: invoice?.id }),
            })
            
            const data = await response.json()
            
            if (response.ok) {
              if (data.requiresAction) {
                toast.info('Action required', {
                  description: 'Please complete authentication in the new window'
                })
                window.open(`/payment/${data.paymentId}?client_secret=${data.clientSecret}`, '_blank')
              } else {
                toast.success('Payment successful!', {
                  description: `Remaining $${Number(invoice?.remainingAmount).toFixed(2)} charged`
                })
                fetchInvoice()
              }
            } else {
              toast.error('Payment failed', {
                description: data.error || 'Could not process payment'
              })
            }
          } catch (error) {
            toast.error('Payment error', {
              description: 'An unexpected error occurred'
            })
          } finally {
            toast.dismiss(toastId)
            setActionLoading(false)
          }
        }
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {}
      }
    })
  }


  const handleSendEmail = async () => {
    setActionLoading(true)
    const toastId = toast.loading('Sending invoice email...')
    
    try {
      const response = await fetch(`/api/invoices/${invoice?.id}/send-email`, {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Email sent successfully!')
      } else {
        toast.error('Failed to send email')
      }
    } catch (error) {
      toast.error('Error sending email')
    } finally {
      toast.dismiss(toastId)
      setActionLoading(false)
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
        return 'Advance Paid - Ready to Charge Remaining'
      case 'ADVANCE_PENDING':
        return 'Advance Payment Pending'
      case 'OVERDUE':
        return 'Overdue'
      default:
        return status
    }
  }

  const canSendEmail = (status: string) => {
    // Only show send email button for advance pending and overdue invoices
    return status === 'ADVANCE_PENDING' || status === 'OVERDUE'
  }

  if (loading) {
    return <div>Loading invoice...</div>
  }

  if (!invoice) {
    return <div>Invoice not found</div>
  }

  const hasDefaultPaymentMethod = invoice?.customer?.paymentMethods?.some(pm => pm.isDefault)

  return (
    <div className="space-y-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">Invoice Details</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {canSendEmail(invoice.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={actionLoading}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          )}
        
          
          {invoice.status === 'ADVANCE_PAID' && hasDefaultPaymentMethod && (
            <Button onClick={handleChargeRemaining} disabled={actionLoading}>
              <CreditCard className="h-4 w-4 mr-2" />
              {actionLoading ? 'Charging...' : 'Charge Remaining 50%'}
            </Button>
          )}
        </div>
      </div>

      {/* Payment Status Alert */}
      {invoice.status === 'ADVANCE_PAID' && !hasDefaultPaymentMethod && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No saved payment method found. Customer needs to complete advance payment first to save their card.
          </AlertDescription>
        </Alert>
      )}

      {invoice.status === 'ADVANCE_PAID' && hasDefaultPaymentMethod && (
        <Alert className='bg-green-100 text-green-800'>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className='text-green-800'>
            Advance payment completed. You can now charge the remaining 50% using the saved payment method.
          </AlertDescription>
        </Alert>
      )}

      {invoice.status === 'FULLY_PAID' && (
        <Alert className='bg-green-100 text-green-800'>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className='text-green-800'>
            Invoice fully paid. Both advance and remaining payments have been completed successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Invoice {invoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    Created on {new Date(invoice.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusText(invoice.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{invoice.customer.name}</p>
                  <p>{invoice.customer.email}</p>
                  {invoice.customer.address && (
                    <p className="whitespace-pre-line">{invoice.customer.address}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Payment Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Payment Structure</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">Advance Payment (50%)</p>
                    <p className="text-2xl font-bold text-blue-600">${Number(invoice.advanceAmount).toFixed(2)}</p>
                    <p className="text-blue-700">Required upfront</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">Remaining Payment (50%)</p>
                    <p className="text-2xl font-bold text-gray-600">${Number(invoice.remainingAmount).toFixed(2)}</p>
                    <p className="text-gray-700">Charged after advance</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Invoice Items */}
              <div>
                <h3 className="font-semibold mb-4">Items</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                    <div className="col-span-6">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  
                  {invoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 text-sm py-2 border-b">
                      <div className="col-span-6">{item.description}</div>
                      <div className="col-span-2 text-center">{item.quantity}</div>
                      <div className="col-span-2 text-right">${Number(item.rate).toFixed(2)}</div>
                      <div className="col-span-2 text-right">${Number(item.amount).toFixed(2)}</div>
                    </div>
                  ))}
                  
                  <div className="grid grid-cols-12 gap-4 text-lg font-semibold pt-4">
                    <div className="col-span-10 text-right">Total:</div>
                    <div className="col-span-2 text-right">${Number(invoice.totalAmount).toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {invoice.payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4">Payment History</h3>
                    <div className="space-y-2">
                      {invoice.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{payment.type} Payment</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleDateString()}
                              {payment.paymentMethod && (
                                <span> • {payment.paymentMethod.brand} ****{payment.paymentMethod.last4}</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">${Number(payment.amount).toFixed(2)}</p>
                            <Badge variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {invoice.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusText(invoice.status)}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">${Number(invoice.totalAmount).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Advance (50%):</span>
                <span className="font-semibold text-blue-600">${Number(invoice.advanceAmount).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining (50%):</span>
                <span className="font-semibold text-gray-600">${Number(invoice.remainingAmount).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              
              <Separator />
              
              {/* Saved Payment Methods */}
              {invoice.customer.paymentMethods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Saved Payment Methods</h4>
                  {invoice.customer.paymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center justify-between text-sm">
                      <span>{pm.brand} ****{pm.last4}</span>
                      {pm.isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                  ))}
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                
                {invoice.status === 'ADVANCE_PAID' && hasDefaultPaymentMethod && (
                  <Button className="w-full" onClick={handleChargeRemaining} disabled={actionLoading}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {actionLoading ? 'Charging...' : 'Charge Remaining 50%'}
                  </Button>
                )}
                
                {canSendEmail(invoice.status) && (
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleSendEmail}
                    disabled={actionLoading}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invoice Email
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
