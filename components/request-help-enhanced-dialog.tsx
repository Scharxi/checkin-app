"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Users, MessageCircle, Loader2, UserCircle, Radio, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, MapPin, Server, Home, Bath, ChefHat, Calendar, Mic } from "lucide-react"
import { useCreateHelpRequest, type HelpRequest } from "@/hooks/use-help-requests"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Location, User } from "@/hooks/use-checkin-api"

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

interface RequestHelpEnhancedDialogProps {
  user: User
  currentLocation: Location | null
  availableUsers?: Array<{ id: string; name: string; location: Location }>
  trigger?: React.ReactNode
}

export const RequestHelpEnhancedDialog = ({ 
  user, 
  currentLocation, 
  availableUsers = [],
  trigger 
}: RequestHelpEnhancedDialogProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [helpType, setHelpType] = useState<"everyone" | "specific">("everyone")
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
        targetUserId: helpType === "specific" ? targetUserId || undefined : undefined,
        message: message.trim() || undefined,
      })
      
      setMessage("")
      setTargetUserId(null)
      setHelpType("everyone")
      setIsOpen(false)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  const handleCancel = () => {
    setMessage("")
    setTargetUserId(null)
    setHelpType("everyone")
    setIsOpen(false)
  }

  const isDisabled = !currentLocation || createHelpRequest.isPending
  const targetUser = targetUserId ? availableUsers.find(u => u.id === targetUserId) : null

  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Users
  }

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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Hilfe rufen
          </DialogTitle>
          <DialogDescription>
            Rufen Sie andere Benutzer zur Hilfe an Ihrem aktuellen Standort.
          </DialogDescription>
        </DialogHeader>

        {currentLocation ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Aktueller Standort */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${currentLocation.color} text-white`}>
                    {(() => {
                      const Icon = getIcon(currentLocation.icon)
                      return <Icon className="h-4 w-4" />
                    })()}
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

            {/* Hilfe-Typ Auswahl */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Wen möchten Sie um Hilfe bitten?</Label>
              
              <div className="grid gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${helpType === "everyone" ? "ring-2 ring-destructive border-destructive" : "hover:border-muted-foreground"}`}
                  onClick={() => setHelpType("everyone")}
                >
                  <CardContent className="flex items-center gap-3 pt-4">
                                         <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive text-white">
                       <Radio className="h-5 w-5" />
                     </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Alle Benutzer</h4>
                      <p className="text-sm text-muted-foreground">
                        Alle aktiven Benutzer erhalten eine Benachrichtigung
                      </p>
                    </div>
                    {helpType === "everyone" && (
                      <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${helpType === "specific" ? "ring-2 ring-blue-500 border-blue-500" : "hover:border-muted-foreground"}`}
                  onClick={() => setHelpType("specific")}
                >
                  <CardContent className="flex items-center gap-3 pt-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Bestimmte Person</h4>
                      <p className="text-sm text-muted-foreground">
                        Nur eine ausgewählte Person wird benachrichtigt
                      </p>
                    </div>
                    {helpType === "specific" && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Personenauswahl (nur bei "specific") */}
            {helpType === "specific" && (
              <div className="space-y-3">
                <Label htmlFor="target-user">Person auswählen</Label>
                {availableUsers.length > 0 ? (
                  <Select value={targetUserId || ""} onValueChange={setTargetUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie eine Person aus..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((availableUser) => (
                        <SelectItem key={availableUser.id} value={availableUser.id}>
                          <div className="flex items-center gap-3">
                            <UserCircle className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{availableUser.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {availableUser.location.name}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <UserCircle className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Keine anderen Benutzer verfügbar</p>
                  </div>
                )}

                {targetUser && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                          <UserCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900">{targetUser.name}</h4>
                          <p className="text-sm text-blue-700">
                            Aktuell in: {targetUser.location.name}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <Separator />

            {/* Nachricht */}
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

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Hinweis:</strong> {helpType === "everyone" 
                  ? "Alle Benutzer in der App werden über Ihre Hilfe-Anfrage benachrichtigt."
                  : targetUser 
                    ? `Nur ${targetUser.name} wird über Ihre Hilfe-Anfrage benachrichtigt.`
                    : "Bitte wählen Sie eine Person aus, die benachrichtigt werden soll."
                }
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
                disabled={createHelpRequest.isPending || (helpType === "specific" && !targetUserId)}
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
                    {helpType === "everyone" ? "An alle senden" : "An Person senden"}
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