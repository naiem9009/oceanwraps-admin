import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// In production, use environment variables and proper hashing
const ADMIN_EMAIL = 'admin@oceanwraps.com'
const ADMIN_PASSWORD = 'admin123' // Change this in production!

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Simple admin authentication - in production, use proper password hashing
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const cookieStore = await cookies()
      
      // Set session cookie
      cookieStore.set('admin-session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
