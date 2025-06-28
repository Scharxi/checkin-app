'use client'

import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  error: string | null
}

export const ConnectionStatus = ({ isConnected, error }: ConnectionStatusProps) => {
  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center gap-2">
        <WifiOff className="w-3 h-3" />
        <span className="text-xs">Offline</span>
      </Badge>
    )
  }

  if (!isConnected) {
    return (
      <Badge variant="secondary" className="flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-xs">Verbinde...</span>
      </Badge>
    )
  }

  return (
    <Badge variant="default" className="flex items-center gap-2 bg-green-500 hover:bg-green-600">
      <Wifi className="w-3 h-3" />
      <span className="text-xs">Online</span>
    </Badge>
  )
} 