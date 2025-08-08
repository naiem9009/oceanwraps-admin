import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Ocean Wraps Admin",
  description: 'Ocean Wraps administration dashboard for managing boat wrapping payments.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    }
  },

}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <Toaster />
        {children}
      </body>
    </html>
  )
}