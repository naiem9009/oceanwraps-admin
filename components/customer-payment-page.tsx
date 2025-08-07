"use client"

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, CreditCard, Loader2, Shield, Waves } from 'lucide-react'
import Image from 'next/image'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  dueDate: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
}

export function CustomerPaymentPage({ invoice }: { invoice: Invoice }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-sky-600 to-purple-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Image src={'/logo.png'} width={150} height={150} alt='Oceanwraps Logo' />
          </div>
          <h2 className="text-xl">Secure Payment Portal</h2>
          <p className="text-sky-100">Invoice {invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Review your invoice before payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <p className="font-medium">{invoice.customer.name}</p>
                <p className="text-sm text-muted-foreground">{invoice.customer.email}</p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-4">Items</h3>
                <div className="space-y-2">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-muted-foreground">
                          {item.quantity} × ${Number(item.rate).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-medium">${Number(item.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="bg-sky-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-sky-900">Payment Structure</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">${Number(invoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sky-600">
                    <span className="font-semibold">Advance Payment (50%):</span>
                    <span className="font-bold text-lg">${Number(invoice.advanceAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Remaining (50%):</span>
                    <span>${Number(invoice.remainingAmount).toFixed(2)}</span>
                  </div>
                </div>
                <p className="text-xs text-sky-700 mt-3">
                  * Remaining amount will be charged automatically when work is completed
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900">Secure Payment</h4>
                    <p className="text-sm text-green-700">
                      Your card will be securely saved for the remaining payment. 
                      We use Stripe's industry-leading security.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Elements stripe={stripePromise}>
            <PaymentForm invoice={invoice} />
          </Elements>
        </div>
      </div>
    </div>
  )
}


function PaymentForm({ invoice }: { invoice: Invoice }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string; code?: string} | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError({ message: "Stripe is not initialized. Please refresh the page." });
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/payments/create-advance-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      setPaymentIntentId(data.paymentIntentId);

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: invoice.customer.name,
              email: invoice.customer.email,
            },
          },
          setup_future_usage: 'off_session',
          receipt_email: invoice.customer.email,
        }
      );

      if (stripeError) {
        // Handle specific Stripe error codes
        let userFriendlyMessage = stripeError.message || 'Payment failed';
        
        switch (stripeError.code) {
          case 'card_declined':
            userFriendlyMessage = 'Your card was declined. Please try another payment method.';
            break;
          case 'insufficient_funds':
            userFriendlyMessage = 'Insufficient funds. Please use a card with sufficient balance.';
            break;
          case 'expired_card':
            userFriendlyMessage = 'Your card has expired. Please use a different card.';
            break;
          case 'incorrect_cvc':
            userFriendlyMessage = 'Incorrect CVC code. Please check your card details.';
            break;
          case 'processing_error':
            userFriendlyMessage = 'There was an error processing your payment. Please try again.';
            break;
          case 'incorrect_number':
            userFriendlyMessage = 'Invalid card number. Please check your card details.';
            break;
          case 'fraudulent':
            userFriendlyMessage = 'Payment was flagged as potentially fraudulent. Please contact support.';
            break;
          case 'card_not_supported':
            userFriendlyMessage = 'This card type is not supported. Please use a different card.';
            break;
        }
        
        throw {
          message: userFriendlyMessage,
          code: stripeError.code,
          details: stripeError
        };
      }

      if (paymentIntent?.status === 'succeeded') {
        setSuccess(true);
        
        // Verify payment status with our backend
        try {
          await fetch('/api/payments/verify-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              paymentIntentId: paymentIntent.id,
              invoiceId: invoice.id 
            }),
          });
        } catch (err) {
          console.error('Error verifying payment status:', err);
          // Don't show this error to user - we'll handle it on the backend
        }
      } else {
        throw { message: 'Payment processing incomplete. Please verify your payment status.' };
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      
      setError({
        message: err.message || 'An unexpected error occurred. Please try again.',
        code: err.code
      });

      // Log the error to your backend for investigation
      if (paymentIntentId) {
        try {
          await fetch('/api/payments/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId,
              error: err.message,
              errorCode: err.code,
              invoiceId: invoice.id
            }),
          });
        } catch (loggingError) {
          console.error('Error logging payment failure:', loggingError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Payment Successful!</h2>
          <p className="text-green-700 mb-4">
            Your advance payment of ${Number(invoice.advanceAmount).toFixed(2)} has been processed successfully.
          </p>
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-left">
            <h3 className="font-semibold text-green-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Your card has been securely saved for the remaining payment</li>
              <li>• We'll charge the remaining ${Number(invoice.remainingAmount).toFixed(2)} when work is completed</li>
              <li>• You'll receive an email confirmation shortly</li>
              <li>• We'll start working on your project immediately</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <Button 
              onClick={() => window.close()} 
              variant="outline"
              className="mr-2"
            >
              Close Window
            </Button>
            <Button 
              onClick={() => window.location.href = 'mailto:oceanwraps@gmail.com'}
            >
              Contact Us
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pay Advance Amount
        </CardTitle>
        <CardDescription>
          Secure payment powered by Stripe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Payment Error {error.code && `(${error.code})`}</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.code === 'fraudulent' && (
                  <div className="mt-2">
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-destructive"
                      onClick={() => window.location.href = 'mailto:support@oceanwraps.com'}
                    >
                      Contact support immediately
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-sky-50 p-4 rounded-lg text-center">
            <p className="text-sm text-sky-700 mb-2">Amount to Pay</p>
            <p className="text-3xl font-bold text-sky-900">
              ${Number(invoice.advanceAmount).toFixed(2)}
            </p>
            <p className="text-xs text-sky-600">50% Advance Payment</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Card Information
              </label>
              <div className="border rounded-md p-3 bg-white">
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                          color: '#aab7c4',
                        },
                      },
                    },
                    hidePostalCode: true,
                  }}
                  onChange={(e) => {
                    if (e.error) {
                      // Show real-time validation errors
                      setError({
                        message: e.error.message,
                        code: e.error.code
                      });
                    } else if (error) {
                      // Clear error when user fixes the issue
                      setError(null);
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Payment Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Advance Payment (50%):</span>
                  <span className="font-semibold">${Number(invoice.advanceAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Remaining (charged later):</span>
                  <span>${Number(invoice.remainingAmount).toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total Project Value:</span>
                  <span>${Number(invoice.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={!stripe || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${Number(invoice.advanceAmount).toFixed(2)} Now`
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                By clicking "Pay Now", you agree to save your payment method for the remaining payment.
                Your card information is encrypted and stored securely by Stripe.
              </p>
              <div className="flex justify-center mt-2 gap-4">
                <Image 
                  src="/visa.png" 
                  alt="Visa" 
                  width={32} 
                  height={20} 
                  className="opacity-70"
                />
                <Image 
                  src="/mastercard.png" 
                  alt="Mastercard" 
                  width={32} 
                  height={20} 
                  className="opacity-70"
                />
                <Image 
                  src="/amex.png" 
                  alt="American Express" 
                  width={32} 
                  height={20} 
                  className="opacity-70"
                />
                <Image 
                  src="/discover.png" 
                  alt="Discover" 
                  width={32} 
                  height={20} 
                  className="opacity-70"
                />
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}