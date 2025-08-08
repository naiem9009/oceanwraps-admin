"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Home, FileText, CreditCard, LogOut } from 'lucide-react'
import Image from 'next/image'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
            <SidebarContent pathname={pathname} onLogout={handleLogout} />
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
                <h1 className="text-lg font-semibold">Ocean Wraps Admin</h1>
              </div>
            </div>
          </div>

          <main className="py-10">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>

        <SheetContent side="left" className="w-64">
          <SidebarContent pathname={pathname} onLogout={handleLogout} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SidebarContent({ 
  pathname, 
  onLogout 
}: { 
  pathname: string
  onLogout: () => void 
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <Image src={'/logo.png'} width={150} height={150} alt='Oceanwraps Logo' />
        </div>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto">
        <nav className="flex-1 px-6 py-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        
        <div className="px-6 py-4">
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start gap-x-3 text-gray-700 hover:text-red-600"
          >
            <LogOut className="h-6 w-6" />
            Sign out
          </Button>
        </div>
      </div>
    </>
  )
}
