"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2 } from 'lucide-react'

interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

export function InvoiceForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Client information
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  
  // Invoice details
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  
  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    
    // Calculate amount for this item
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate
    }
    
    setItems(updatedItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNumber,
          clientName,
          clientEmail,
          clientAddress,
          dueDate,
          notes,
          items,
          totalAmount,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/invoices/${data.id}`)
      } else {
        setError(data.error || 'Failed to create invoice')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Enter your client's details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientAddress">Address</Label>
              <Textarea
                id="clientAddress"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="123 Main St, City, State 12345"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
            <CardDescription>Configure invoice settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes or terms..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
          <CardDescription>Add items or services to your invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-12 items-end">
                <div className="md:col-span-5">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Input
                    id={`description-${index}`}
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Service or product description"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor={`rate-${index}`}>Rate ($)</Label>
                  <Input
                    id={`rate-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label>Amount</Label>
                  <div className="text-lg font-semibold py-2">
                    ${item.amount.toFixed(2)}
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Amount:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Invoice'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
