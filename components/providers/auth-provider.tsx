"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { AuthContextType, AuthState, getStoredAuthState, setStoredAuthState, validateCredentials } from '@/lib/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
  })

  // Check stored auth state on mount
  useEffect(() => {
    const isAuthenticated = getStoredAuthState()
    setAuthState({
      isAuthenticated,
      isLoading: false,
    })
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const isValid = validateCredentials(username, password)
      
      if (isValid) {
        setStoredAuthState(true)
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
        })
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setStoredAuthState(false)
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 