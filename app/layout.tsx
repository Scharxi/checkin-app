import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { WebSocketProvider } from '@/components/providers/websocket-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'Check-In App',
  description: 'Live Check-In System für Teams',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body>
        <QueryProvider>
          <WebSocketProvider>
            {children}
            <Toaster />
          </WebSocketProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
