"use client"

import { useAuth } from '@/components/providers/auth-provider'
import { LoginForm } from '@/components/login-form'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, logout } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />
  }

  // Show protected content with logout button
  return (
    <div className="min-h-screen">
      {/* Logout button - fixed position top right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </div>
      
      {/* Protected content */}
      {children}
    </div>
  )
} 