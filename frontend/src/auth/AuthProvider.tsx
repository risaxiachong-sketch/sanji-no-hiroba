import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { clearAccountCaches } from '../api/accountCache'
import { USE_FIREBASE } from '../api/client'
import {
  authenticateWithGoogle,
  firebaseAuthStatus,
  observeFirebaseAuth,
  signOutFirebase,
} from '../api/firebase'
import { clearCompletedIdentity } from '../api/identity'
import { AuthContext, type AppAuthStatus } from './AuthContext'

interface Props {
  children: ReactNode
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AppAuthStatus>(USE_FIREBASE ? 'loading' : 'unmanaged')

  useEffect(() => {
    if (!USE_FIREBASE) return
    setStatus('loading')
    return observeFirebaseAuth((nextUser) => {
      setUser(nextUser)
      setStatus(firebaseAuthStatus(nextUser))
    })
  }, [])

  const signOutGoogle = useCallback(async () => {
    if (!USE_FIREBASE) return
    const previousUserId = user?.uid
    await signOutFirebase()
    if (previousUserId) clearAccountCaches(previousUserId)
    clearCompletedIdentity()
  }, [user?.uid])

  const value = useMemo(() => ({
    status,
    user,
    authenticateWithGoogle,
    signOutGoogle,
  }), [signOutGoogle, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
