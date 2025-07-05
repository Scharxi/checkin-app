"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, Bell, X, Users, MapPin, Clock, BellRing, CheckCircle2, History, Filter, RefreshCw, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, Server, Home, Bath, ChefHat, Calendar, Mic } from "lucide-react"
import { useHelpRequests, useUpdateHelpRequest, useDeleteHelpRequest, type HelpRequest } from "@/hooks/use-help-requests"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

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

// Color mapping to ensure reliable backgrounds
const getIconBackgroundClass = (color: string) => {
  const colorMap: { [key: string]: string } = {
    'bg-gray-500': 'bg-gray-500',
    'bg-blue-500': 'bg-blue-500',
    'bg-cyan-500': 'bg-cyan-500',
    'bg-orange-500': 'bg-orange-500',
    'bg-purple-500': 'bg-purple-500',
    'bg-green-500': 'bg-green-500',
    'bg-red-500': 'bg-red-500',
    'bg-yellow-500': 'bg-yellow-500',
    'bg-indigo-500': 'bg-indigo-500',
    'bg-pink-500': 'bg-pink-500',
    'bg-slate-500': 'bg-slate-500',
  }
  return colorMap[color] || 'bg-slate-500'
}

interface NotificationCenterProps {
  currentUserId?: string
  className?: string
}

export const NotificationCenter = ({ currentUserId, className }: NotificationCenterProps) => {
  const { data: helpRequests = [], isLoading, error, refetch } = useHelpRequests()
  const updateHelpRequest = useUpdateHelpRequest()
  const deleteHelpRequest = useDeleteHelpRequest()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("active")
  const [showBadge, setShowBadge] = useState(false)

  // Kategorisiere Hilfe-Anfragen
  const activeRequests = helpRequests.filter(req => 
    req.status === 'ACTIVE' && req.requesterId !== currentUserId
  )
  const resolvedRequests = helpRequests.filter(req => req.status === 'RESOLVED')
  const myRequests = helpRequests.filter(req => 
    req.requesterId === currentUserId && req.status === 'ACTIVE'
  )

  // Zeige Badge-Animation bei neuen Anfragen
  useEffect(() => {
    if (activeRequests.length > 0) {
      setShowBadge(true)
      
      // Mobile Vibration
      if (isMobile && 'navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [activeRequests.length, isMobile])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setShowBadge(false)
    }
  }

  const handleResolve = async (requestId: string) => {
    await updateHelpRequest.mutateAsync({ id: requestId, status: 'RESOLVED' })
  }

  const handleCancel = async (requestId: string) => {
    await deleteHelpRequest.mutateAsync(requestId)
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

  const isOwner = (request: HelpRequest) => {
    return Boolean(currentUserId && request.requesterId === currentUserId)
  }

  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || MapPin
  }

  const handleHelp = (request: HelpRequest) => {
    toast({
      title: "🏃‍♂️ Auf dem Weg zur Hilfe!",
      description: `Sie helfen ${request.requester.name} im ${request.location.name}`,
      duration: 5000,
    })
    
    // Optional: Hier könnte später eine Navigation implementiert werden
    // oder eine Benachrichtigung an den Anfragenden gesendet werden
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
      onClick={() => {
        console.log('Notification Center clicked, opening:', !isOpen)
        setIsOpen(!isOpen)
      }}
    >
      <div className="relative">
        {activeRequests.length > 0 ? (
          <BellRing className={cn("h-4 w-4", showBadge && "animate-bounce")} />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {activeRequests.length > 0 && (
          <div
            className={cn(
              "absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold leading-none",
              activeRequests.length > 9 && "w-6 h-5 px-1",
              showBadge && "animate-pulse"
            )}
          >
            {activeRequests.length > 9 ? '9+' : activeRequests.length}
          </div>
        )}
      </div>
      {isMobile && (
        <span className="ml-2">
          Benachrichtigungen
          {activeRequests.length > 0 && ` (${activeRequests.length})`}
        </span>
      )}
    </Button>
  )

  const NotificationContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold">Hilfe-Zentrale</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Aktiv
            {activeRequests.length > 0 && (
              <div className="h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-medium leading-none min-w-[16px]">
                {activeRequests.length > 9 ? '9+' : activeRequests.length}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="mine" className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            Meine
            {myRequests.length > 0 && (
              <div className="h-4 w-4 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-xs font-medium leading-none min-w-[16px]">
                {myRequests.length > 9 ? '9+' : myRequests.length}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex items-center gap-2">
            <History className="h-3 w-3" />
            Verlauf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          <RequestList 
            requests={activeRequests}
            currentUserId={currentUserId}
            onResolve={handleResolve}
            onCancel={handleCancel}
            onHelp={handleHelp}
            getTimeAgo={getTimeAgo}
            isOwner={isOwner}
            getIcon={getIcon}
            emptyMessage="Keine aktiven Hilfe-Anfragen"
            emptyIcon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
            updatePending={updateHelpRequest.isPending}
            deletePending={deleteHelpRequest.isPending}
          />
        </TabsContent>

        <TabsContent value="mine" className="space-y-3 mt-4">
          <RequestList 
            requests={myRequests}
            currentUserId={currentUserId}
            onResolve={handleResolve}
            onCancel={handleCancel}
            getTimeAgo={getTimeAgo}
            isOwner={isOwner}
            getIcon={getIcon}
            emptyMessage="Sie haben keine Hilfe-Anfragen"
            emptyIcon={<Users className="h-6 w-6 text-muted-foreground" />}
            updatePending={updateHelpRequest.isPending}
            deletePending={deleteHelpRequest.isPending}
          />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3 mt-4">
          <RequestList 
            requests={resolvedRequests.slice(0, 10)} // Nur letzte 10 anzeigen
            currentUserId={currentUserId}
            onResolve={handleResolve}
            onCancel={handleCancel}
            getTimeAgo={getTimeAgo}
            isOwner={isOwner}
            getIcon={getIcon}
            emptyMessage="Keine erledigten Anfragen"
            emptyIcon={<History className="h-6 w-6 text-muted-foreground" />}
            updatePending={updateHelpRequest.isPending}
            deletePending={deleteHelpRequest.isPending}
            isHistory={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <NotificationTrigger />
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="max-h-[85vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Hilfe-Zentrale
              </SheetTitle>
              <SheetDescription>
                Übersicht aller Hilfe-Anfragen und Benachrichtigungen
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <NotificationContent />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <>
      <NotificationTrigger />
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Hilfe-Zentrale</SheetTitle>
            <SheetDescription>
              Übersicht aller Hilfe-Anfragen und Benachrichtigungen
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <NotificationContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

interface RequestListProps {
  requests: HelpRequest[]
  currentUserId?: string
  onResolve: (id: string) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onHelp?: (request: HelpRequest) => void
  getTimeAgo: (dateString: string) => string
  isOwner: (request: HelpRequest) => boolean
  getIcon: (iconName: string) => React.ComponentType<{ className?: string }>
  emptyMessage: string
  emptyIcon: React.ReactNode
  updatePending?: boolean
  deletePending?: boolean
  isHistory?: boolean
}

const RequestList = ({ 
  requests, 
  currentUserId, 
  onResolve, 
  onCancel,
  onHelp, 
  getTimeAgo, 
  isOwner,
  getIcon, 
  emptyMessage, 
  emptyIcon,
  updatePending = false,
  deletePending = false,
  isHistory = false
}: RequestListProps) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
          {emptyIcon}
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-0">
        {requests.map((request, index) => (
          <div key={request.id}>
            <div className="px-3 py-2 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg ${getIconBackgroundClass(request.location.color)} text-white flex-shrink-0`}>
                  {(() => {
                    const Icon = getIcon(request.location.icon)
                    return <Icon className="h-4 w-4" />
                  })()}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {request.requester.name}
                        {isHistory && request.status === 'RESOLVED' && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-green-500 text-white hover:bg-green-600 hover:text-white">
                            Gelöst
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {request.location.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {getTimeAgo(request.createdAt)}
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-3 p-2 bg-muted rounded text-xs">
                      {request.message}
                    </div>
                  )}

                  {!isHistory && (
                    <div className="flex items-center gap-2">
                      {isOwner(request) ? (
                        <div className="flex gap-2 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onResolve(request.id)}
                            disabled={updatePending}
                            className="flex-1 text-xs h-7 bg-green-500 text-white hover:bg-green-600 hover:text-white"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Gelöst
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onCancel(request.id)}
                            disabled={deletePending}
                            className="flex-1 text-xs h-7 bg-red-500 text-white hover:bg-red-600 hover:text-white"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Abbrechen
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 text-xs h-7"
                            onClick={() => onHelp?.(request)}
                          >
                            <Users className="mr-1 h-3 w-3" />
                            Helfen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onResolve(request.id)}
                            disabled={updatePending}
                            className="text-xs h-7 bg-green-500 text-white hover:bg-green-600 hover:text-white"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Gelöst
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {index < requests.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
} 