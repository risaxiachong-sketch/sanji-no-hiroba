import { FirebaseError, getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import {
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onIdTokenChanged,
  signInWithCredential,
  signInWithPopup,
  signOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { ApiError, USE_FIREBASE } from './client'

interface FirebaseContext {
  db: Firestore
  user: User
}

let firebaseApp: FirebaseApp | undefined
let firebaseAuth: Auth | undefined
let appCheckInitialized = false

export type FirebaseAuthStatus = 'loading' | 'signed-out' | 'legacy-anonymous' | 'google'

export interface GoogleAccountConflict {
  kind: 'existing-account-conflict'
  email?: string
  continueWithExistingAccount: () => Promise<User>
}

export interface GoogleAuthenticated {
  kind: 'authenticated'
  user: User
  upgradedAnonymous: boolean
}

export type GoogleAuthenticationResult = GoogleAuthenticated | GoogleAccountConflict

const firebaseEnv = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APPCHECK_SITE_KEY: import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY,
} as const

type FirebaseEnvName = keyof typeof firebaseEnv

function requiredEnv(name: FirebaseEnvName): string {
  const value = firebaseEnv[name]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ApiError(0, `Firebaseの設定（${name}）が不足しています。`)
  }
  return value.trim()
}

function optionalEnv(name: FirebaseEnvName): string | undefined {
  const value = firebaseEnv[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function firebaseOptions(): FirebaseOptions {
  return {
    apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
    authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
    appId: requiredEnv('VITE_FIREBASE_APP_ID'),
    storageBucket: optionalEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: optionalEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  }
}

function app(): FirebaseApp {
  if (!USE_FIREBASE) throw new ApiError(0, 'Firebaseモードが有効ではありません。')
  if (!firebaseApp) firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseOptions())

  const siteKey = optionalEnv('VITE_FIREBASE_APPCHECK_SITE_KEY')
  if (siteKey && !appCheckInitialized) {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    })
    appCheckInitialized = true
  }

  return firebaseApp
}

export function getFirebaseAuth(): Auth {
  firebaseAuth ??= getAuth(app())
  return firebaseAuth
}

export function firebaseAuthStatus(user: User | null): FirebaseAuthStatus {
  if (!user) return 'signed-out'
  if (user.isAnonymous) return 'legacy-anonymous'
  return user.providerData.some((provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID)
    ? 'google'
    : 'signed-out'
}

export function observeFirebaseAuth(listener: (user: User | null) => void): Unsubscribe {
  return onIdTokenChanged(getFirebaseAuth(), listener)
}

function errorCode(cause: unknown): string {
  return typeof cause === 'object' && cause !== null && 'code' in cause
    ? String(cause.code)
    : ''
}

function errorEmail(cause: unknown): string | undefined {
  if (!(cause instanceof FirebaseError)) return undefined
  const value = cause.customData?.email
  return typeof value === 'string' ? value : undefined
}

function isCredentialConflict(cause: unknown): boolean {
  return [
    'auth/credential-already-in-use',
    'auth/email-already-in-use',
    'auth/account-exists-with-different-credential',
  ].includes(errorCode(cause))
}

/**
 * Starts the popup synchronously from the caller's click handler. Do not add an
 * await before linkWithPopup/signInWithPopup or browsers may block the popup.
 */
export async function authenticateWithGoogle(): Promise<GoogleAuthenticationResult> {
  const auth = getFirebaseAuth()
  const current = auth.currentUser
  if (firebaseAuthStatus(current) === 'google' && current) {
    return { kind: 'authenticated', user: current, upgradedAnonymous: false }
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  if (current?.isAnonymous) {
    try {
      const result = await linkWithPopup(current, provider)
      return { kind: 'authenticated', user: result.user, upgradedAnonymous: true }
    } catch (cause) {
      if (!isCredentialConflict(cause)) throw cause
      const credential = cause instanceof FirebaseError
        ? GoogleAuthProvider.credentialFromError(cause)
        : null
      if (!credential) throw cause

      let continuation: Promise<User> | null = null
      return {
        kind: 'existing-account-conflict',
        email: errorEmail(cause),
        continueWithExistingAccount: () => {
          continuation ??= signInWithCredential(auth, credential)
            .then((result) => result.user)
            .catch((continuationError: unknown) => {
              continuation = null
              throw continuationError
            })
          return continuation
        },
      }
    }
  }

  const result = await signInWithPopup(auth, provider)
  return { kind: 'authenticated', user: result.user, upgradedAnonymous: false }
}

export async function signOutFirebase(): Promise<void> {
  await signOut(getFirebaseAuth())
}

export function firebaseAuthErrorCode(cause: unknown): string {
  return errorCode(cause)
}

export async function getFirebaseContext(): Promise<FirebaseContext> {
  const firebaseAppInstance = app()
  const auth = getFirebaseAuth()
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user || firebaseAuthStatus(user) !== 'google') {
    throw new ApiError(401, 'Googleアカウントでログインしてください。')
  }
  return { db: getFirestore(firebaseAppInstance), user }
}

export function firebaseApiError(cause: unknown, fallbackMessage: string): ApiError {
  if (cause instanceof ApiError) return cause
  const code = errorCode(cause)
  const status = code.includes('permission-denied')
    ? 403
    : code.includes('unauthenticated') || code.includes('auth/')
      ? 401
      : code.includes('unavailable') || code.includes('network')
        ? 503
        : 0
  const detail = import.meta.env.DEV && code ? ` (${code})` : ''
  return new ApiError(status, `${fallbackMessage}${detail}`)
}
