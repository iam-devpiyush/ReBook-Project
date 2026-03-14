import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { ToastProvider } from '@/components/common/Toast'
import SkipNav from '@/components/common/SkipNav'
import Navbar from '@/components/common/Navbar'
import Footer from '@/components/common/Footer'
import { CartProvider } from '@/lib/cart/CartContext'
import CartDrawer from '@/components/cart/CartDrawer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ReBook — Sustainable Reads',
  description: 'Buy and sell second-hand books sustainably. Give every book a second chapter.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen bg-gray-50`}>
        <SkipNav />
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <Navbar />
              <CartDrawer />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
