'use client'

import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface ConnectionStatusProps {
  isConnected: boolean
  error: string | null
}

export const ConnectionStatus = ({ isConnected, error }: ConnectionStatusProps) => {
  const isMobile = useIsMobile()
  
  if (error) {
    return (
      <Badge variant="destructive" className={`flex items-center gap-2 ${isMobile ? 'px-3 py-1' : ''}`}>
        <WifiOff className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
        <span className={isMobile ? "text-sm" : "text-xs"}>Offline</span>
      </Badge>
    )
  }

  if (!isConnected) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-2 ${isMobile ? 'px-3 py-1' : ''}`}>
        <Loader2 className={`${isMobile ? "w-4 h-4" : "w-3 h-3"} animate-spin`} />
        <span className={isMobile ? "text-sm" : "text-xs"}>Verbinde...</span>
      </Badge>
    )
  }

  return (
    <Badge variant="default" className={`flex items-center gap-2 bg-green-500 hover:bg-green-600 ${isMobile ? 'px-3 py-1' : ''}`}>
      <Wifi className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
      <span className={isMobile ? "text-sm" : "text-xs"}>Online</span>
    </Badge>
  )
} 