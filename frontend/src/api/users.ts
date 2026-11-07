import type { Profile } from '../types'
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { ApiError, apiGet, apiPatch, apiPost, USE_FIREBASE, USE_MOCK } from './client'
import { firebaseApiError, getFirebaseContext } from './firebase'
import { completeIdentity, ensureIdentity, getIdentity } from './identity'

interface RegisterInput {
  nickname: string
  childAgeGroup: string
  avatarId: string
}

let firebaseProfileCache: Profile | null = null

function profileFromUnknown(value: unknown, userId: string): Profile | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  if (
    data.userId !== userId
    || typeof data.nickname !== 'string'
    || typeof data.childAgeGroup !== 'string'
    || typeof data.avatarId !== 'string'
  ) return null
  return {
    userId,
    nickname: data.nickname,
    childAgeGroup: data.childAgeGroup,
    avatarId: data.avatarId,
  }
}

async function registerFirebaseUser(input: RegisterInput): Promise<Profile> {
  const { db, user } = await getFirebaseContext()
  const requestedProfile: Profile = { ...input, userId: user.uid }
  const userRef = doc(db, 'users', user.uid)
  try {
    const profile = await runTransaction(db, async (transaction) => {
      const current = await transaction.get(userRef)
      if (current.exists()) {
        const existingProfile = profileFromUnknown(current.data(), user.uid)
        if (!existingProfile) throw new ApiError(500, '保存済みプロフィールの形式が不正です。')
        return existingProfile
      }

      transaction.set(userRef, {
        ...requestedProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return requestedProfile
    })
    firebaseProfileCache = profile
    return profile
  } catch (cause) {
    throw firebaseApiError(cause, 'プロフィールを登録できませんでした。')
  }
}

export async function registerUser(input: RegisterInput): Promise<Profile> {
  if (USE_FIREBASE) return registerFirebaseUser(input)
  const identity = ensureIdentity()
  if (USE_MOCK) {
    const profile = { ...input, userId: identity.userId ?? crypto.randomUUID() }
    completeIdentity(profile.userId)
    return profile
  }
  const profile = await apiPost<Profile>('/users/register', {
    ...input,
    installationId: identity.installationId,
    deviceToken: identity.deviceToken,
  }, { authenticated: false })
  completeIdentity(profile.userId)
  return profile
}

export async function fetchMyProfile(): Promise<Profile | null> {
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    const userRef = doc(db, 'users', user.uid)
    try {
      const profile = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef)
        if (snapshot.exists()) {
          const remote = profileFromUnknown(snapshot.data(), user.uid)
          if (!remote) throw new ApiError(500, '保存済みプロフィールの形式が不正です。')
          return remote
        }

        return null
      })
      firebaseProfileCache = profile
      return profile
    } catch (cause) {
      throw firebaseApiError(cause, 'プロフィールを読み込めませんでした。')
    }
  }
  if (!getIdentity()?.userId) return null
  if (USE_MOCK) return null
  return apiGet<Profile>('/users/me')
}

export async function updateMyProfile(input: Partial<Pick<Profile, 'nickname' | 'childAgeGroup' | 'avatarId'>>): Promise<Profile> {
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    const userRef = doc(db, 'users', user.uid)
    try {
      const profile = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef)
        const current = snapshot.exists()
          ? profileFromUnknown(snapshot.data(), user.uid)
          : firebaseProfileCache?.userId === user.uid
            ? firebaseProfileCache
            : null
        if (!current) throw new ApiError(400, '先にプロフィールを登録してください。')
        const next: Profile = { ...current, ...input, userId: user.uid }
        if (snapshot.exists()) {
          transaction.update(userRef, {
            ...next,
            updatedAt: serverTimestamp(),
          })
        } else {
          transaction.set(userRef, {
            ...next,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        return next
      })
      firebaseProfileCache = profile
      return profile
    } catch (cause) {
      throw firebaseApiError(cause, 'プロフィールを更新できませんでした。')
    }
  }
  if (USE_MOCK) {
    return { userId: getIdentity()?.userId ?? '', nickname: input.nickname ?? '', childAgeGroup: input.childAgeGroup ?? '', avatarId: input.avatarId ?? '' }
  }
  return apiPatch<Profile>('/users/me', input)
}

export async function getFirebaseProfileForWrite(userId: string): Promise<Profile> {
  if (firebaseProfileCache?.userId === userId) return firebaseProfileCache
  const remote = await fetchMyProfile()
  if (!remote) throw new ApiError(400, '先にプロフィールを登録してください。')
  return remote
}
