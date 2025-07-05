"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AlertTriangle, Bell, X, Users, MapPin, Clock, BellRing, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, Server, Home, Bath, ChefHat, Calendar, Mic } from "lucide-react"
import { useHelpRequestNotifications, type HelpRequest } from "@/hooks/use-help-requests"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// Icon mapping
const iconMap = {
  Briefcase,
  Coffee,
  Dumbbell,
  Book,
  ShoppingBag,
  Server,
  Home,
  Bath,
  ChefHat,
  Calendar,
  Mic,
  Users,
  MapPin,
}

interface HelpNotificationsProps {
  currentUserId?: string
  className?: string
}

export const HelpNotifications = ({ currentUserId, className }: HelpNotificationsProps) => {
  const { notifications, clearNotifications, removeNotification } = useHelpRequestNotifications(currentUserId)
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [showBadge, setShowBadge] = useState(false)

  // Show badge animation when new notifications arrive
  useEffect(() => {
    if (notifications.length > 0) {
      setShowBadge(true)
      
      // Add vibration for mobile devices
      if (isMobile && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [notifications.length, isMobile])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setShowBadge(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Gerade eben'
    if (diffInMinutes < 60) return `vor ${diffInMinutes} Min`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `vor ${diffInHours} Std`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `vor ${diffInDays} Tag${diffInDays > 1 ? 'en' : ''}`
  }

  const NotificationTrigger = () => (
    <Button
      variant="outline"
      size={isMobile ? "lg" : "default"}
      className={cn(
        "relative",
        isMobile && "w-full justify-start",
        className
      )}
    >
      <div className="relative">
        {notifications.length > 0 ? (
          <BellRing className={cn("h-4 w-4", showBadge && "animate-bounce")} />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {notifications.length > 0 && (
          <div
            className={cn(
              "absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold leading-none",
              notifications.length > 9 && "w-6 h-5 px-1",
              showBadge && "animate-pulse"
            )}
          >
            {notifications.length > 9 ? '9+' : notifications.length}
          </div>
        )}
      </div>
      {isMobile && (
        <span className="ml-2">
          Benachrichtigungen
          {notifications.length > 0 && ` (${notifications.length})`}
        </span>
      )}
    </Button>
  )

  const NotificationContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Hilfe-Benachrichtigungen</h3>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearNotifications}
            className="text-xs"
          >
            Alle löschen
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Keine neuen Benachrichtigungen
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onRemove={() => removeNotification(notification.id)}
              getTimeAgo={getTimeAgo}
            />
          ))}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <NotificationTrigger />
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hilfe-Benachrichtigungen
            </SheetTitle>
            <SheetDescription>
              Aktuelle Hilfe-Anfragen von anderen Benutzern
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <NotificationContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <NotificationTrigger />
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Benachrichtigungen</SheetTitle>
          <SheetDescription>
            Aktuelle Hilfe-Anfragen von anderen Benutzern
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <NotificationContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface NotificationCardProps {
  notification: HelpRequest
  onRemove: () => void
  getTimeAgo: (dateString: string) => string
}

const NotificationCard = ({ notification, onRemove, getTimeAgo }: NotificationCardProps) => {
  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || MapPin
  }

  return (
    <Card className="border-l-4 border-l-destructive">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${notification.location.color} text-white flex-shrink-0`}>
            {(() => {
              const Icon = getIcon(notification.location.icon)
              return <Icon className="h-4 w-4" />
            })()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {notification.requester.name} braucht Hilfe
                </h4>
                <p className="text-xs text-muted-foreground">
                  {notification.location.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0 hover:text-destructive flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {notification.message && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                {notification.message}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {getTimeAgo(notification.createdAt)}
              </div>
              <Button
                size="sm"
                variant="default"
                className="text-xs h-7"
                onClick={() => {
                  // Navigate to help location
                  // This could trigger navigation to the location
                }}
              >
                <Users className="mr-1 h-3 w-3" />
                Helfen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 