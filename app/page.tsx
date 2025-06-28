"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, CheckCircle, MapPin, Heart, LogOut, AlertCircle } from "lucide-react"
import { useLocations, useCreateUser, useCheckIn, useAutoLogin, useLoginWithName, useLogout, userStorage, type Location, type User } from "@/hooks/use-checkin-api"
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
  const [showExistingUserOption, setShowExistingUserOption] = useState(false)

  // Hooks
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const createUserMutation = useCreateUser()
  const loginMutation = useLoginWithName()
  const logoutMutation = useLogout()
  const checkInMutation = useCheckIn()
  const { data: autoLoginUser, isLoading: autoLoginLoading } = useAutoLogin()
  
  // SSE for live updates
  useSSE()

  // Auto-login effect
  useEffect(() => {
    if (autoLoginUser) {
      setUser(autoLoginUser)
    }
  }, [autoLoginUser])

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
        setUserName("")
        setShowExistingUserOption(false)
      } catch (error) {
        console.error('Error creating user:', error)
        // Show option to login with existing name
        if (error instanceof Error && error.message === 'NAME_ALREADY_EXISTS') {
          setShowExistingUserOption(true)
        }
      }
    }
  }

  const handleLoginWithExistingName = async () => {
    if (userName.trim()) {
      try {
        const existingUser = await loginMutation.mutateAsync(userName.trim())
        setUser(existingUser)
        setUserName("")
        setShowExistingUserOption(false)
      } catch (error) {
        console.error('Error logging in:', error)
        setShowExistingUserOption(false)
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setUser(null)
      setCheckedInLocation(null)
      setCheckInTime(null)
      setUserName("")
      setShowExistingUserOption(false)
    } catch (error) {
      console.error('Error logging out:', error)
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

  const getGradientClass = (color: string) => {
    const gradientMap: { [key: string]: string } = {
      'bg-blue-500': 'from-blue-500 to-blue-600',
      'bg-green-500': 'from-green-500 to-green-600',
      'bg-purple-500': 'from-purple-500 to-purple-600',
      'bg-red-500': 'from-red-500 to-red-600',
      'bg-yellow-500': 'from-yellow-500 to-yellow-600',
      'bg-indigo-500': 'from-indigo-500 to-indigo-600',
      'bg-pink-500': 'from-pink-500 to-pink-600',
      'bg-orange-500': 'from-orange-500 to-orange-600',
    }
    return gradientMap[color] || 'from-gray-500 to-gray-600'
  }

  // Loading state for auto-login
  if (autoLoginLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 border-4 border-indigo-200 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-32 h-32 border-4 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-slate-600 text-lg">Anmeldung wird überprüft...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-3xl"></div>
        <Card className="w-full max-w-md relative backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Check-In App
            </CardTitle>
            <CardDescription className="text-slate-600 text-lg">
              Gib deinen Namen ein, um loszulegen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <Input
                  type="text"
                  placeholder="Dein Name"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    setShowExistingUserOption(false)
                  }}
                  className="text-center text-lg h-12 border-2 border-indigo-200 focus:border-indigo-500 bg-white/70 backdrop-blur-sm rounded-xl"
                  required
                />
              </div>

              {showExistingUserOption && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-800 font-medium mb-2">
                        Name bereits vergeben
                      </p>
                      <p className="text-xs text-amber-700 mb-3">
                        Möchtest du dich mit diesem Namen anmelden oder einen anderen Namen wählen?
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          onClick={handleLoginWithExistingName}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? 'Anmelden...' : 'Anmelden'}
                        </Button>
                        <Button 
                          type="button"
                          onClick={() => {
                            setShowExistingUserOption(false)
                            setUserName("")
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Anderen Namen wählen
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
                size="lg"
                disabled={createUserMutation.isPending || showExistingUserOption}
              >
                {createUserMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Wird erstellt...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {showExistingUserOption ? 'Anderen Namen wählen' : 'Los geht\'s'}
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (locationsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 border-4 border-indigo-200 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-32 h-32 border-4 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <p className="text-slate-600 text-lg">Standorte werden geladen...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Hintergrund-Dekoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Hallo, {user.name}! 👋
              </h1>
              <p className="text-slate-600 text-lg">Wo möchtest du heute einchecken?</p>
            </div>
            <div className="flex items-center gap-4">
              {checkedInLocation && checkInTime && (
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 border-green-200 shadow-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Clock className="w-4 h-4" />
                  Eingecheckt seit {formatTime(checkInTime)}
                </Badge>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/90"
                disabled={logoutMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {logoutMutation.isPending ? 'Abmelden...' : 'Abmelden'}
              </Button>
            </div>
          </div>

          {checkedInLocation && (
            <div className="bg-white/70 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-lg">
                    Du bist eingecheckt bei: {locations.find((l) => l.id === checkedInLocation)?.name}
                  </p>
                  <p className="text-slate-600">
                    Status: Aktiv <Heart className="w-4 h-4 inline text-red-500 ml-1" />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {locations.map((location: Location) => {
            const Icon = getIcon(location.icon)
            const isCheckedIn = checkedInLocation === location.id

            return (
              <Card
                key={location.id}
                className={`cursor-pointer transition-all duration-300 transform hover:scale-105 backdrop-blur-lg bg-white/80 border-white/20 shadow-xl hover:shadow-2xl ${
                  isCheckedIn 
                    ? "ring-4 ring-green-400 shadow-2xl bg-gradient-to-br from-green-50/90 to-blue-50/90 scale-105" 
                    : "hover:shadow-2xl"
                } ${
                  checkInMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !checkInMutation.isPending && handleCheckIn(location.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${getGradientClass(location.color)} text-white shadow-lg transform transition-transform duration-300 hover:scale-110`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-md">
                      <Users className="w-3 h-3 text-slate-600" />
                      <span className="text-xs font-medium text-slate-700">{location.users}</span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 mb-1 leading-tight">
                    {location.name}
                  </h3>
                  <p className="text-slate-600 text-xs mb-2 leading-snug line-clamp-2">
                    {location.description}
                  </p>

                  {/* Check-In Status */}
                  {isCheckedIn && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-md">
                        <CheckCircle className="w-3 h-3" />
                        <span className="font-medium text-xs">Eingecheckt</span>
                      </div>
                    </div>
                  )}

                  {/* Show current users */}
                  {location.currentUsers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/30">
                      <p className="text-xs text-slate-500 mb-1 font-medium">Aktuelle Benutzer:</p>
                      <div className="flex flex-wrap gap-1">
                        {location.currentUsers.slice(0, 2).map((currentUser) => (
                          <Badge key={currentUser.id} variant="outline" className="text-xs bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90 transition-all px-1.5 py-0.5">
                            {currentUser.name}
                          </Badge>
                        ))}
                        {location.currentUsers.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-white/70 backdrop-blur-sm border-slate-200 px-1.5 py-0.5">
                            +{location.currentUsers.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Hint */}
                  <div className="mt-2 pt-2 border-t border-white/30">
                    <p className="text-xs text-slate-500 text-center">
                      {isCheckedIn ? "Klicken zum Auschecken" : "Klicken zum Einchecken"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
