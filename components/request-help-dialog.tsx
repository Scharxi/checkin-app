"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Users, MessageCircle, Loader2 } from "lucide-react"
import { useCreateHelpRequest, type HelpRequest } from "@/hooks/use-help-requests"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Location, User } from "@/hooks/use-checkin-api"

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

interface RequestHelpDialogProps {
  user: User
  currentLocation: Location | null
  trigger?: React.ReactNode
}

export const RequestHelpDialog = ({ user, currentLocation, trigger }: RequestHelpDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const createHelpRequest = useCreateHelpRequest()
  const isMobile = useIsMobile()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentLocation) {
      return
    }

    try {
      await createHelpRequest.mutateAsync({
        requesterId: user.id,
        locationId: currentLocation.id,
        message: message.trim() || undefined,
      })
      
      setMessage("")
      setIsOpen(false)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleCancel = () => {
    setMessage("")
    setIsOpen(false)
  }

  const isDisabled = !currentLocation || createHelpRequest.isPending

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="destructive"
            size={isMobile ? "lg" : "default"}
            className="w-full sm:w-auto"
            disabled={isDisabled}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Hilfe rufen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Hilfe rufen
          </DialogTitle>
          <DialogDescription>
            Rufen Sie andere Benutzer zu Ihrem aktuellen Standort zur Hilfe.
          </DialogDescription>
        </DialogHeader>

        {currentLocation ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getIconBackgroundClass(currentLocation.color)} text-white`}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{currentLocation.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentLocation.description}
                    </p>
                  </div>
                  <Badge variant="secondary">Aktueller Standort</Badge>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="message" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Nachricht (optional)
              </Label>
              <Textarea
                id="message"
                placeholder="Beschreiben Sie kurz, wobei Sie Hilfe benötigen..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Hinweis:</strong> Alle Benutzer in der App werden über Ihre Hilfe-Anfrage benachrichtigt.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createHelpRequest.isPending}
                className="w-full sm:w-auto"
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={createHelpRequest.isPending}
                className="w-full sm:w-auto"
              >
                {createHelpRequest.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Hilfe rufen
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6 text-center">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Kein Check-in gefunden</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sie müssen an einem Standort eingecheckt sein, um Hilfe zu rufen.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto"
            >
              Verstanden
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 