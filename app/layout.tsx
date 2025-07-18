import type { Metadata, Viewport } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { WebSocketProvider } from '@/components/providers/websocket-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Check-In App',
  description: 'Live Check-In System für Teams',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Check-In App',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className="touch-manipulation tap-highlight-none scroll-smooth-mobile safe-area-padding">
        <AuthProvider>
          <QueryProvider>
            <WebSocketProvider>
              {children}
              <Toaster />
            </WebSocketProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
