"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Users, Clock, MessageCircle, CheckCircle2, X, MapPin, RefreshCw, Loader2, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, Server, Home, Bath, ChefHat, Calendar, Mic } from "lucide-react"
import { useHelpRequests, useUpdateHelpRequest, useDeleteHelpRequest, type HelpRequest } from "@/hooks/use-help-requests"
import { useIsMobile } from "@/hooks/use-mobile"

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

interface HelpRequestsListProps {
  currentUserId?: string
  className?: string
}

export const HelpRequestsList = ({ currentUserId, className = "" }: HelpRequestsListProps) => {
  const { data: helpRequests = [], isLoading, error, refetch } = useHelpRequests()
  const updateHelpRequest = useUpdateHelpRequest()
  const deleteHelpRequest = useDeleteHelpRequest()
  const isMobile = useIsMobile()
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null)

  const handleResolve = async (requestId: string) => {
    await updateHelpRequest.mutateAsync({ id: requestId, status: 'RESOLVED' })
  }

  const handleCancel = async (requestId: string) => {
    await deleteHelpRequest.mutateAsync(requestId)
  }

  const handleToggleExpand = (requestId: string) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId)
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
    return currentUserId && request.requesterId === currentUserId
  }

  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || MapPin
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Hilfe-Anfragen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Hilfe-Anfragen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-4">
              Fehler beim Laden der Hilfe-Anfragen
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Erneut versuchen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Hilfe-Anfragen
            {helpRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {helpRequests.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {helpRequests.length === 0 ? (
          <div className="text-center py-8 px-6">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-2 text-green-800">Alles in Ordnung!</h3>
            <p className="text-sm text-muted-foreground">
              Derzeit gibt es keine aktiven Hilfe-Anfragen.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-0">
              {helpRequests.map((request, index) => (
                <div key={request.id}>
                  <div className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${request.location.color} text-white flex-shrink-0`}>
                        {(() => {
                          const Icon = getIcon(request.location.icon)
                          return <Icon className="h-4 w-4" />
                        })()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {request.requester.name}
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
                          <div className="mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleExpand(request.id)}
                            >
                              <MessageCircle className="mr-1 h-3 w-3" />
                              {expandedRequest === request.id ? 'Nachricht ausblenden' : 'Nachricht anzeigen'}
                            </Button>
                            {expandedRequest === request.id && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                {request.message}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          {isOwner(request) ? (
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolve(request.id)}
                                disabled={updateHelpRequest.isPending}
                                className="flex-1 text-xs"
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Gelöst
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(request.id)}
                                disabled={deleteHelpRequest.isPending}
                                className="flex-1 text-xs"
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
                                className="flex-1 text-xs"
                                onClick={() => {
                                  // Navigate to location or show directions
                                  // This could be implemented to show directions to the help location
                                }}
                              >
                                <Users className="mr-1 h-3 w-3" />
                                Helfen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolve(request.id)}
                                disabled={updateHelpRequest.isPending}
                                className="text-xs"
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Gelöst
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < helpRequests.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// Helper function to format time (could be moved to utils)
const formatTimeAgo = (date: Date) => {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Gerade eben'
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `vor ${diffInMinutes} Min`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `vor ${diffInHours} Std`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `vor ${diffInDays} Tag${diffInDays > 1 ? 'en' : ''}`
} 