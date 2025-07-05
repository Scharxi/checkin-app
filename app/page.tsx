"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, CheckCircle, MapPin, Heart, LogOut, AlertCircle, AlertTriangle, RefreshCw, Menu, X, Search, User as UserIcon } from "lucide-react"
import { useLocations, useCreateUser, useCheckIn, useAutoLogin, useLoginWithName, useLogout, useWebsocketStatus, userStorage, type Location, type User } from "@/hooks/use-checkin-api"
import { ConnectionStatus } from "@/components/ui/connection-status"
import { PullToRefresh } from "@/components/ui/pull-to-refresh"
import { useIsMobile } from "@/hooks/use-mobile"
import { CreateTemporaryLocationDialog } from "@/components/create-temporary-location-dialog"
import { RequestHelpDialog } from "@/components/request-help-dialog"
import { RequestHelpEnhancedDialog } from "@/components/request-help-enhanced-dialog"
import { HelpRequestsList } from "@/components/help-requests-list"
import { HelpNotifications } from "@/components/help-notifications"
import { NotificationCenter } from "@/components/notification-center"

// Icon mapping
const iconMap = {
  Briefcase,
  Coffee,
  Dumbbell,
  Book,
  ShoppingBag,
  Users,
  MapPin,
}


export default function CheckInApp() {
  const [userName, setUserName] = useState<string>("")
  const [user, setUser] = useState<User | null>(null)
  const [checkedInLocation, setCheckedInLocation] = useState<string | null>(null)
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [showExistingUserOption, setShowExistingUserOption] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Hooks
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const createUserMutation = useCreateUser()
  const loginMutation = useLoginWithName()
  const logoutMutation = useLogout()
  const checkInMutation = useCheckIn()
  const { data: autoLoginUser, isLoading: autoLoginLoading } = useAutoLogin()
  const { isConnected, error: wsError } = useWebsocketStatus()
  const isMobile = useIsMobile()
  

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !locations.length) return []
    
    const results: Array<{
      user: { id: string; name: string; checkedInAt: string }
      location: Location
    }> = []
    
    const query = searchQuery.toLowerCase().trim()
    
    locations.forEach(location => {
      location.currentUsers.forEach(currentUser => {
        if (currentUser.name.toLowerCase().includes(query)) {
          results.push({
            user: currentUser,
            location
          })
        }
      })
    })
    
    return results
  }, [searchQuery, locations])

  // Get available users for help requests (excluding current user)
  const availableUsers = useMemo(() => {
    const users: Array<{ id: string; name: string; location: Location }> = []
    
    locations.forEach(location => {
      location.currentUsers.forEach(currentUser => {
        if (currentUser.id !== user?.id) { // Exclude current user
          users.push({
            id: currentUser.id,
            name: currentUser.name,
            location
          })
        }
      })
    })
    
    return users
  }, [locations, user?.id])

  const handleSearchFocus = () => {
    setShowSearchResults(true)
  }

  const handleSearchBlur = () => {
    // Delay hiding to allow clicking on results
    setTimeout(() => setShowSearchResults(false), 200)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setShowSearchResults(true)
  }

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

      if (result) {
        if (result.isActive) {
          // User checked in
          setCheckedInLocation(locationId)
          setCheckInTime(new Date(result.checkedInAt))
        } else {
          // User checked out
          setCheckedInLocation(null)
          setCheckInTime(null)
        }
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate refresh delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
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
      <div className={`min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center ${isMobile ? 'p-6' : 'p-4'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-3xl"></div>
        <Card className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} relative backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl`}>
          <CardHeader className="text-center">
            <div className={`mx-auto ${isMobile ? 'mb-6 w-20 h-20' : 'mb-4 w-16 h-16'} bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center`}>
              <MapPin className={isMobile ? "w-10 h-10 text-white" : "w-8 h-8 text-white"} />
            </div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}>
              Check-In App
            </CardTitle>
            <CardDescription className={`text-slate-600 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Gib deinen Namen ein, um loszulegen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className={isMobile ? "space-y-4" : "space-y-6"}>
              <div>
                <Input
                  type="text"
                  placeholder="Dein Name"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    setShowExistingUserOption(false)
                  }}
                  className={`text-center ${isMobile ? 'text-base h-14' : 'text-lg h-12'} border-2 border-indigo-200 focus:border-indigo-500 bg-white/70 backdrop-blur-sm rounded-xl`}
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
                className={`w-full ${isMobile ? 'h-14' : 'h-12'} bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform ${isMobile ? 'active:scale-95' : 'hover:scale-105'}`} 
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

  const mainContent = (
    <div className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'px-4 py-8'} relative z-10`}>
      {/* Header */}
      <div className={`${isMobile ? 'mb-4' : 'mb-8'}`}>
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex items-center justify-between'} mb-6`}>
          <div className={isMobile ? 'text-center' : ''}>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2`}>
              Hallo, {user?.name}! 👋
            </h1>
            <p className={`text-slate-600 ${isMobile ? 'text-base' : 'text-lg'}`}>Wo möchtest du heute einchecken?</p>
          </div>
          
          {/* Mobile Header Controls */}
          {isMobile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <ConnectionStatus isConnected={isConnected} error={wsError} />
                {!showMobileMenu && (
                  <Button
                    onClick={() => setShowMobileMenu(true)}
                    variant="outline"
                    size="sm"
                    className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/90"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              {checkedInLocation && checkInTime && (
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 border-green-200 shadow-lg w-full justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Clock className="w-4 h-4" />
                  Eingecheckt seit {formatTime(checkInTime)}
                </Badge>
              )}
              
              {/* Mobile Menu */}
              {showMobileMenu && (
                <div className="bg-white/90 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">Menü</h3>
                    <Button
                      onClick={() => setShowMobileMenu(false)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <NotificationCenter 
                      currentUserId={user?.id}
                      className="w-full" 
                    />
                    <RequestHelpEnhancedDialog 
                      user={user}
                      currentLocation={checkedInLocation ? locations.find(l => l.id === checkedInLocation) || null : null}
                      availableUsers={availableUsers}
                      trigger={
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full justify-start"
                          disabled={!checkedInLocation}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Hilfe rufen
                        </Button>
                      }
                    />
                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
                    </Button>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      disabled={logoutMutation.isPending}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {logoutMutation.isPending ? 'Abmelden...' : 'Abmelden'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Header Controls */
            <div className="flex items-center gap-4">
              <ConnectionStatus isConnected={isConnected} error={wsError} />
              {checkedInLocation && checkInTime && (
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 border-green-200 shadow-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Clock className="w-4 h-4" />
                  Eingecheckt seit {formatTime(checkInTime)}
                </Badge>
              )}
              <NotificationCenter 
                currentUserId={user?.id}
              />
              <RequestHelpEnhancedDialog 
                user={user}
                currentLocation={checkedInLocation ? locations.find(l => l.id === checkedInLocation) || null : null}
                availableUsers={availableUsers}
              />
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/90"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
              </Button>
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
          )}
        </div>

        {wsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-800 text-lg">
                  Websocket-Verbindung unterbrochen
                </p>
                <p className="text-red-600 text-sm">
                  {wsError}
                </p>
                <p className="text-red-500 text-xs mt-1">
                  Bitte starten Sie das Backend: <code className="bg-red-100 px-1 rounded">cd backend && npm run dev</code>
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Search Section */}
        <div className={`relative ${isMobile ? 'mt-6' : 'mt-8'}`}>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
              <Search className="w-5 h-5 text-slate-700" />
            </div>
            <Input
              type="text"
              placeholder="Nach Personen suchen..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              className={`${isMobile ? 'pl-12 py-3' : 'pl-12 py-3'} bg-white/90 backdrop-blur-lg border-white/30 shadow-lg focus:ring-2 focus:ring-indigo-500/50 transition-all rounded-xl w-full`}
            />
          </div>
          
          {/* Search Results */}
          {showSearchResults && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/95 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="p-2">
                  {searchResults.map((result, index) => {
                    const Icon = getIcon(result.location.icon)
                    return (
                      <div
                        key={`${result.user.id}-${result.location.id}-${index}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/70 transition-colors cursor-pointer"
                        onClick={() => {
                          setSearchQuery("")
                          setShowSearchResults(false)
                          // Scroll to location card
                          const locationCard = document.getElementById(`location-${result.location.id}`)
                          if (locationCard) {
                            locationCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        }}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${getGradientClass(result.location.color)} text-white`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-slate-600" />
                            <span className="font-medium text-slate-800">{result.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <MapPin className="w-3 h-3" />
                            <span>{result.location.name}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTime(new Date(result.user.checkedInAt))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Keine Personen gefunden</p>
                  <p className="text-xs">Versuchen Sie einen anderen Suchbegriff</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Locations Grid */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3 mt-6' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-8'}`}>
          {locations.map((location: Location) => {
            const Icon = getIcon(location.icon)
            const isCheckedIn = checkedInLocation === location.id

            return (
              <Card
                key={location.id}
                id={`location-${location.id}`}
                className={`cursor-pointer transition-all duration-300 ${isMobile ? 'transform active:scale-95' : 'transform hover:scale-105'} backdrop-blur-lg bg-white/80 border-white/20 shadow-xl ${isMobile ? 'active:shadow-2xl' : 'hover:shadow-2xl'} ${
                  isCheckedIn 
                    ? "ring-4 ring-green-400 shadow-2xl bg-gradient-to-br from-green-50/90 to-blue-50/90" 
                    : isMobile ? "" : "hover:shadow-2xl"
                } ${
                  checkInMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !checkInMutation.isPending && handleCheckIn(location.id)}
              >
                <CardContent className={isMobile ? "p-4" : "p-3"}>
                  <div className={`flex items-start justify-between ${isMobile ? 'mb-3' : 'mb-2'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`${isMobile ? 'p-3' : 'p-2'} rounded-lg bg-gradient-to-br ${getGradientClass(location.color)} text-white shadow-lg transform transition-transform duration-300 ${isMobile ? 'active:scale-95' : 'hover:scale-110'}`}>
                        <Icon className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
                      </div>
                      {location.isTemporary && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-200 px-1.5 py-0.5">
                          Temporär • 5min Gnadenfrist
                        </Badge>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full ${isMobile ? 'px-3 py-1' : 'px-2 py-0.5'} shadow-md`}>
                      <Users className={isMobile ? "w-4 h-4 text-slate-600" : "w-3 h-3 text-slate-600"} />
                      <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-slate-700`}>{location.users}</span>
                    </div>
                  </div>

                  <h3 className={`font-bold ${isMobile ? 'text-lg' : 'text-base'} text-slate-800 ${isMobile ? 'mb-2' : 'mb-1'} leading-tight`}>
                    {location.name}
                  </h3>
                  <p className={`text-slate-600 ${isMobile ? 'text-sm mb-3' : 'text-xs mb-2'} leading-snug line-clamp-2`}>
                    {location.description}
                  </p>

                  {/* Show current users */}
                  {location.currentUsers.length > 0 && (
                    <div className={`${isMobile ? 'mt-3 pt-3' : 'mt-2 pt-2'} border-t border-white/30`}>
                      <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-slate-500 ${isMobile ? 'mb-2' : 'mb-1'} font-medium`}>Aktuelle Benutzer:</p>
                      <div className="flex flex-wrap gap-1">
                        {location.currentUsers.slice(0, isMobile ? 8 : 6).map((currentUser) => (
                          <Badge key={currentUser.id} variant="outline" className={`${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs px-1.5 py-0.5'} bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/90 transition-all`}>
                            {currentUser.name}
                          </Badge>
                        ))}
                        {location.currentUsers.length > (isMobile ? 8 : 6) && (
                          <Badge variant="outline" className={`${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs px-1.5 py-0.5'} bg-white/70 backdrop-blur-sm border-slate-200`}>
                            +{location.currentUsers.length - (isMobile ? 8 : 6)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          
          {/* Create Temporary Location Card */}
          <CreateTemporaryLocationDialog 
            user={user}
            trigger={
              <Card className={`cursor-pointer transition-all duration-300 ${isMobile ? 'transform active:scale-95' : 'transform hover:scale-105'} backdrop-blur-lg bg-white/80 border-white/20 shadow-xl ${isMobile ? 'active:shadow-2xl' : 'hover:shadow-2xl'} group`}>
                <CardContent className={isMobile ? "p-4" : "p-3"}>
                  <div className={`flex items-start justify-between ${isMobile ? 'mb-3' : 'mb-2'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`${isMobile ? 'p-3' : 'p-2'} rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg transform transition-transform duration-300 ${isMobile ? 'group-active:scale-95' : 'group-hover:scale-110'}`}>
                        <MapPin className={isMobile ? "w-6 h-6" : "w-4 h-4"} />
                      </div>
                      <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200 px-1.5 py-0.5">
                        Neu erstellen
                      </Badge>
                    </div>
                    <div className={`flex items-center gap-1 bg-white/70 backdrop-blur-sm rounded-full ${isMobile ? 'px-3 py-1' : 'px-2 py-0.5'} shadow-md`}>
                      <MapPin className={isMobile ? "w-4 h-4 text-slate-400" : "w-3 h-3 text-slate-400"} />
                      <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium text-slate-500`}>+</span>
                    </div>
                  </div>

                  <h3 className={`font-bold ${isMobile ? 'text-lg' : 'text-base'} text-slate-800 ${isMobile ? 'mb-2' : 'mb-1'} leading-tight`}>
                    Temporäre Karte erstellen
                  </h3>
                  <p className={`text-slate-600 ${isMobile ? 'text-sm mb-3' : 'text-xs mb-2'} leading-snug line-clamp-2`}>
                    Neue temporäre Check-in-Karte für spontane Meetings oder Events
                  </p>

                  {/* Placeholder "users" section */}
                  <div className={`${isMobile ? 'mt-3 pt-3' : 'mt-2 pt-2'} border-t border-white/30`}>
                    <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-slate-400 ${isMobile ? 'mb-2' : 'mb-1'} font-medium`}>Klicken zum Erstellen</p>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        <div className="w-6 h-6 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full border-2 border-white flex items-center justify-center">
                          <MapPin className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">Temporäre Karte</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            }
          />
        </div>


      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Hintergrund-Dekoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-300/20 to-purple-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl"></div>

      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} disabled={isRefreshing}>
          {mainContent}
        </PullToRefresh>
      ) : (
        mainContent
      )}
    </div>
  )
}
