"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Clock, Users, Coffee, Briefcase, Dumbbell, Book, ShoppingBag, CheckCircle, MapPin, Heart, LogOut, AlertCircle, AlertTriangle, RefreshCw, Menu, X, Search, User as UserIcon, Lock } from "lucide-react"
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
import { useAuth } from "@/components/providers/auth-provider"

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
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Hooks
  const { data: locations = [], isLoading: locationsLoading } = useLocations()
  const createUserMutation = useCreateUser({ silent: true })
  const loginMutation = useLoginWithName({ silent: true })
  const logoutMutation = useLogout()
  const checkInMutation = useCheckIn()
  const { data: autoLoginUser, isLoading: autoLoginLoading } = useAutoLogin()
  const { isAuthenticated, isLoading: authLoading, login, logout: authLogout } = useAuth()
  
  // State for login form
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
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
    
    locations.forEach((location: Location) => {
      location.currentUsers.forEach((currentUser: { id: string; name: string; checkedInAt: Date }) => {
        if (currentUser.name.toLowerCase().includes(query)) {
          results.push({
            user: {
              id: currentUser.id,
              name: currentUser.name,
              checkedInAt: currentUser.checkedInAt.toString()
            },
            location
          })
        }
      })
    })
    
    return results
  }, [searchQuery, locations])

  // Get current user's location by checking all locations for their presence
  const currentLocation = useMemo(() => {
    if (!user || !locations.length) return null
    
    for (const location of locations) {
      const isUserHere = location.currentUsers.some((currentUser: { id: string; name: string; checkedInAt: Date }) => currentUser.id === user.id)
      if (isUserHere) {
        return location
      }
    }
    return null
  }, [user, locations])

  // Get available users for help requests (excluding current user)
  const availableUsers = useMemo(() => {
    const users: Array<{ id: string; name: string; location: Location }> = []
    
    locations.forEach((location: Location) => {
      location.currentUsers.forEach((currentUser: { id: string; name: string; checkedInAt: Date }) => {
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

  // Manual localStorage check on mount (fallback for SSR issues)
  useEffect(() => {
    if (typeof window !== 'undefined' && !user && !autoLoginLoading) {
      const storedUser = userStorage.getUser()
      if (storedUser) {

        // Verify user still exists and set directly if auto-login failed
        const getApiBaseUrl = () => {
          // Check for environment variable first
          if (process.env.NEXT_PUBLIC_API_URL) {
            return process.env.NEXT_PUBLIC_API_URL
          }
          
          const currentHost = window.location.hostname
          const currentProtocol = window.location.protocol
          
          // For Docker deployment: Use localhost with port 3001 (mapped to host)
          // This works because Docker Compose maps the backend port to localhost:3001
          return `${currentProtocol}//${currentHost}:3001`
        }
        
        fetch(`${getApiBaseUrl()}/api/users?name=${encodeURIComponent(storedUser.name)}`)
          .then(response => {
            if (response.ok) {
              return response.json()
            }
            throw new Error('User not found')
          })
          .then((existingUser) => {
            setUser(existingUser)
            userStorage.setUser(existingUser) // Update with latest data
          })
          .catch((error) => {
            console.error('❌ Auto-login failed:', error)
            userStorage.setUser(null) // Clear invalid user
          })
      }
    }
  }, [user, autoLoginLoading])

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
    } else {
      setCheckedInLocation(null)
      setCheckInTime(null)
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
        console.log('User creation failed, checking if name exists:', error)
        // Show option to login with existing name instead of auto-trying
        setShowExistingUserOption(true)
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
        console.log('Error logging in:', error)
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

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setIsLoggingIn(true)

    try {
      const success = await login(loginUsername, loginPassword)
      
      if (!success) {
        setLoginError('Ungültige Anmeldedaten')
      } else {
        setLoginUsername("")
        setLoginPassword("")
      }
    } catch (error) {
      setLoginError('Ein Fehler ist aufgetreten')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleAdminLogout = async () => {
    try {
      // First logout the user if any
      if (user) {
        await handleLogout()
      }
      // Then logout the admin
      authLogout()
    } catch (error) {
      console.error('Error during admin logout:', error)
      // Even if user logout fails, still logout admin
      authLogout()
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



  // Loading state for auth or auto-login
  if (authLoading || autoLoginLoading) {
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

  // Show admin login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Admin-Anmeldung</h2>
              <p className="text-gray-600 mt-2">
                Melden Sie sich an, um auf die Check-In App zuzugreifen
              </p>
            </div>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Benutzername
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Benutzername eingeben"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    placeholder="Passwort eingeben"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoggingIn || !loginUsername || !loginPassword}
              >
                {isLoggingIn ? 'Wird angemeldet...' : 'Anmelden'}
              </button>
            </form>
          </div>
        </div>
      </div>
        )
  }

  // Show user creation form if authenticated but no user set
  if (isAuthenticated && !user) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center ${isMobile ? 'p-6' : 'p-4'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 backdrop-blur-3xl"></div>
        
        {/* Logout Button - zeigt dass man bereits eingeloggt ist */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={handleAdminLogout}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm shadow-lg"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>

        <Card className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} relative backdrop-blur-lg bg-white/80 border-white/20 shadow-2xl`}>
          <CardHeader className="text-center">
            {/* Status-Indikator dass man eingeloggt ist */}
            <div className="mb-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Admin eingeloggt
            </div>
            
            <div className={`mx-auto ${isMobile ? 'mb-6 w-20 h-20' : 'mb-4 w-16 h-16'} bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center`}>
              <UserIcon className={isMobile ? "w-10 h-10 text-white" : "w-8 h-8 text-white"} />
            </div>
            <CardTitle className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent`}>
              Benutzer erstellen
            </CardTitle>
            <CardDescription className={`text-slate-600 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Erstelle deinen App-Benutzer, um mit dem Check-In zu beginnen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Info-Box */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Benutzer-Erstellung
                  </p>
                  <p className="text-xs text-blue-700">
                    Du bist bereits als Administrator eingeloggt. Erstelle jetzt deinen persönlichen App-Benutzer für das Check-In System.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className={isMobile ? "space-y-4" : "space-y-6"}>
              <div>
                <Input
                  type="text"
                  placeholder="Dein Name für das Check-In"
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
                    <UserIcon className="w-5 h-5" />
                    {showExistingUserOption ? 'Anderen Namen wählen' : 'Benutzer erstellen'}
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
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/70 backdrop-blur-sm border-white/20 hover:bg-white/90"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="max-h-[70vh]">
                    <SheetHeader>
                      <SheetTitle>Menü</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-3 mt-6">
                      <NotificationCenter 
                        currentUserId={user?.id}
                        className="w-full" 
                      />
                      {user && (
                        <RequestHelpEnhancedDialog 
                          user={user}
                          currentLocation={currentLocation}
                          availableUsers={availableUsers}
                          trigger={
                            <Button
                              variant="destructive"
                              size="lg"
                              className="w-full justify-start h-12 text-base min-h-[48px] touch-manipulation"
                              disabled={!currentLocation}
                            >
                              <AlertTriangle className="w-5 h-5 mr-3" />
                              Hilfe rufen
                              {!currentLocation && (
                                <span className="ml-auto text-xs opacity-75">
                                  (Check-in erforderlich)
                                </span>
                              )}
                            </Button>
                          }
                        />
                      )}
                      <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="lg"
                        className="w-full justify-start h-12 text-base"
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`w-5 h-5 mr-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Aktualisiere...' : 'Aktualisieren'}
                      </Button>
                      <Button
                        onClick={handleAdminLogout}
                        variant="outline"
                        size="lg"
                        className="w-full justify-start h-12 text-base border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        Abmelden
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              
              {checkedInLocation && checkInTime && (
                <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 border-green-200 shadow-lg w-full justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Clock className="w-4 h-4" />
                  Eingecheckt seit {formatTime(checkInTime)}
                </Badge>
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
              {user && (
                <RequestHelpEnhancedDialog 
                  user={user}
                  currentLocation={currentLocation}
                  availableUsers={availableUsers}
                  trigger={
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full justify-start h-12 text-base min-h-[48px] touch-manipulation"
                      disabled={!currentLocation}
                    >
                      <AlertTriangle className="w-5 h-5 mr-3" />
                      Hilfe rufen
                      {!currentLocation && (
                        <span className="ml-auto text-xs opacity-75">
                          (Check-in erforderlich)
                        </span>
                      )}
                    </Button>
                  }
                />
              )}
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
                onClick={handleAdminLogout}
                variant="outline"
                size="sm"
                className="bg-red-50/70 backdrop-blur-sm border-red-200/50 text-red-600 hover:bg-red-100/90"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Abmelden
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

        {currentLocation && (
          <div className="bg-white/70 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-lg">
                  Du bist eingecheckt bei: {currentLocation?.name}
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
          {user && (
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
          )}
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