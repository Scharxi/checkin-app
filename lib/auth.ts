export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

export interface LoginCredentials {
  username: string
  password: string
}

// Auth storage key
export const AUTH_STORAGE_KEY = 'checkin-app-auth'

// Check if user is authenticated by checking localStorage
export function getStoredAuthState(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    return stored === 'authenticated'
  } catch {
    return false
  }
}

// Store authentication state
export function setStoredAuthState(isAuthenticated: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (isAuthenticated) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated')
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  } catch {
    // Handle localStorage errors silently
  }
}

// Validate credentials against environment variables
export function validateCredentials(username: string, password: string): boolean {
  const envUsername = process.env.NEXT_PUBLIC_LOGIN_USERNAME
  const envPassword = process.env.NEXT_PUBLIC_LOGIN_PASSWORD
  
  return username === envUsername && password === envPassword
} 