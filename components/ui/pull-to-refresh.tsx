'use client'

import React, { useState, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
}

export const PullToRefresh = ({ onRefresh, children, disabled = false }: PullToRefreshProps) => {
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const threshold = 80 // Minimum pull distance to trigger refresh

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return
    
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [disabled, isRefreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, (currentY.current - startY.current) * 0.5)
    
    if (distance > 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance, threshold * 1.5))
    }
  }, [isPulling, disabled, isRefreshing, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh])

  const refreshProgress = Math.min(pullDistance / threshold, 1)
  const showRefreshIcon = pullDistance > 20

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: isPulling || isRefreshing ? `translateY(${Math.min(pullDistance, threshold)}px)` : 'translateY(0)',
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {/* Refresh Indicator */}
      {(showRefreshIcon || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gradient-to-b from-indigo-50 to-transparent"
          style={{
            height: `${Math.min(pullDistance, threshold)}px`,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="flex flex-col items-center justify-center p-4">
            <RefreshCw
              className={`w-6 h-6 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: `rotate(${refreshProgress * 360}deg)`,
                opacity: refreshProgress,
              }}
            />
            <p className="text-xs text-indigo-600 mt-1 opacity-70">
              {isRefreshing ? 'Aktualisiere...' : pullDistance >= threshold ? 'Loslassen zum Aktualisieren' : 'Ziehen zum Aktualisieren'}
            </p>
          </div>
        </div>
      )}
      
      {children}
    </div>
  )
} 