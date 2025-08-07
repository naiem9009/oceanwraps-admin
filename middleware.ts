import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isLoginPage = pathname === '/login'
  const isApiAuth = pathname.startsWith('/api/auth')
  const isStripeWebhook = pathname.startsWith('/api/webhooks/stripe') // <-- এই লাইন যুক্ত করো

  // Allow access to login, auth, and Stripe webhook
  if (isLoginPage || isApiAuth || isStripeWebhook) {
    return NextResponse.next()
  }

  const isAuthenticated = request.cookies.get('admin-session')

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
