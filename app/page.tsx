"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Coffee, Briefcase, Dumbbell, Book, ShoppingBag } from "lucide-react"
import { useLocations, useCreateUser, useCheckIn, type Location, type User } from "@/hooks/use-checkin-api"
import { useSSE } from "@/hooks/use-sse"

// Icon mapping
const iconMap = {
  Briefcase,
  Coffee,
  Dumbbell,
  Book,
  ShoppingBag,
  Users,
}

export default function CheckInApp() {
  const [userName, setUserName] = useState<string>("")
  const [user, setUser] = useState<User | null>(null)
  const [checkedInLocation, setCheckedInLocation] = useState<string | null>(null)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)

  // Hooks
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const createUserMutation = useCreateUser()
  const checkInMutation = useCheckIn()
  
  // SSE for live updates
  useSSE()

  // Update checked in location from user's active check-ins
  useEffect(() => {
    if (user?.checkIns && user.checkIns.length > 0) {
      const activeCheckIn = user.checkIns.find(checkIn => checkIn.isActive)
      if (activeCheckIn) {
        setCheckedInLocation(activeCheckIn.locationId)
        setCheckInTime(new Date(activeCheckIn.checkedInAt))
      } else {
        setCheckedInLocation(null)
        setCheckInTime(null)
      }
    }
  }, [user])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      try {
        const newUser = await createUserMutation.mutateAsync({ name: userName.trim() })
        setUser(newUser)
      } catch (error) {
        console.error('Error creating user:', error)
      }
    }
  }

  const handleCheckIn = async (locationId: string) => {
    if (!user) return

    try {
      const result = await checkInMutation.mutateAsync({
        userId: user.id,
        locationId,
      })

      if (result.type === 'checkout') {
        setCheckedInLocation(null)
        setCheckInTime(null)
      } else {
        setCheckedInLocation(locationId)
        setCheckInTime(new Date(result.checkIn.checkedInAt))
      }
    } catch (error) {
      console.error('Error during check-in:', error)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getIcon = (iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || Users
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Check-In App
            </CardTitle>
            <CardDescription>Melde dich an, um Orte zu entdecken und einzuchecken</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Dein Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="text-center text-lg"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? 'Wird erstellt...' : 'Los geht\'s'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (locationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Standorte werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Hallo, {user.name}! 👋</h1>
              <p className="text-slate-600 mt-1">Wo möchtest du heute einchecken?</p>
            </div>
            {checkedInLocation && checkInTime && (
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-2">
                <Clock className="w-4 h-4" />
                Eingecheckt seit {formatTime(checkInTime)}
              </Badge>
            )}
          </div>

          {checkedInLocation && (
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${locations.find((l) => l.id === checkedInLocation)?.color} animate-pulse`}
                />
                <span className="font-medium text-slate-700">
                  Du bist eingecheckt bei: {locations.find((l) => l.id === checkedInLocation)?.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {locations.map((location: Location) => {
            const Icon = getIcon(location.icon)
            const isCheckedIn = checkedInLocation === location.id

            return (
              <Card
                key={location.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                  isCheckedIn ? "ring-2 ring-blue-500 shadow-lg bg-blue-50" : "hover:shadow-md"
                } ${checkInMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !checkInMutation.isPending && handleCheckIn(location.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${location.color} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{location.users}</span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg text-slate-800 mb-2">{location.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{location.description}</p>

                  {/* Show current users */}
                  {location.currentUsers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">Aktuelle Benutzer:</p>
                      <div className="flex flex-wrap gap-1">
                        {location.currentUsers.slice(0, 3).map((currentUser) => (
                          <Badge key={currentUser.id} variant="outline" className="text-xs">
                            {currentUser.name}
                          </Badge>
                        ))}
                        {location.currentUsers.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.currentUsers.length - 3} weitere
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* User Management */}

      </div>
    </div>
  )
}
