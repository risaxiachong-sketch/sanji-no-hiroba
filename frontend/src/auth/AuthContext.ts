import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type {
  FirebaseAuthStatus,
  GoogleAuthenticationResult,
} from '../api/firebase'

export type AppAuthStatus = FirebaseAuthStatus | 'unmanaged'

export interface AuthContextValue {
  status: AppAuthStatus
  user: User | null
  authenticateWithGoogle: () => Promise<GoogleAuthenticationResult>
  signOutGoogle: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
