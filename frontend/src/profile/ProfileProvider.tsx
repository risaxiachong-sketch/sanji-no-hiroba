import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  legacyProfileCacheKey,
  profileCacheKey,
} from '../api/accountCache'
import { USE_FIREBASE } from '../api/client'
import { getIdentity } from '../api/identity'
import { fetchMyProfile, updateMyProfile } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import type { Profile } from '../types'
import { ProfileContext, type ProfileStatus } from './ProfileContext'

interface Props {
  children: ReactNode
}

function parseProfile(raw: string | null, expectedUserId?: string): Profile | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>
    const userId = typeof parsed.userId === 'string'
      ? parsed.userId
      : expectedUserId ?? getIdentity()?.userId ?? ''
    if (
      (expectedUserId && userId !== expectedUserId)
      || typeof parsed.nickname !== 'string'
      || typeof parsed.childAgeGroup !== 'string'
      || (expectedUserId && typeof parsed.avatarId !== 'string')
    ) return null
    return {
      userId,
      nickname: parsed.nickname,
      childAgeGroup: parsed.childAgeGroup,
      avatarId: parsed.avatarId ?? '',
    }
  } catch {
    return null
  }
}

function readCachedProfile(userId?: string): Profile | null {
  try {
    return parseProfile(
      localStorage.getItem(userId ? profileCacheKey(userId) : legacyProfileCacheKey()),
      userId,
    )
  } catch {
    return null
  }
}

function cacheProfile(profile: Profile, scoped: boolean): void {
  try {
    localStorage.setItem(
      scoped ? profileCacheKey(profile.userId) : legacyProfileCacheKey(),
      JSON.stringify(profile),
    )
  } catch {
    // The remote profile remains the source of truth if storage is unavailable.
  }
}

function removeCachedProfile(userId: string): void {
  try {
    localStorage.removeItem(profileCacheKey(userId))
  } catch {
    // Ignore storage denial; the in-memory state is still cleared.
  }
}

export function ProfileProvider({ children }: Props) {
  const auth = useAuth()
  const initialProfile = USE_FIREBASE ? null : readCachedProfile()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [profileOwnerId, setProfileOwnerId] = useState<string | null>(initialProfile?.userId ?? null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(initialProfile ? 'ready' : 'idle')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const firebaseUserId = auth.status === 'google' ? auth.user?.uid : undefined

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    const requestId = ++requestIdRef.current
    if (USE_FIREBASE && !firebaseUserId) {
      setProfile(null)
      setProfileOwnerId(null)
      setProfileStatus('idle')
      setIsSyncing(false)
      return null
    }

    setIsSyncing(true)
    setProfileStatus('loading')
    try {
      const remote = await fetchMyProfile()
      if (requestId !== requestIdRef.current) return remote
      if (remote) {
        cacheProfile(remote, USE_FIREBASE)
        setProfile(remote)
        setProfileOwnerId(remote.userId)
        setProfileStatus('ready')
      } else if (USE_FIREBASE && firebaseUserId) {
        removeCachedProfile(firebaseUserId)
        setProfile(null)
        setProfileOwnerId(firebaseUserId)
        setProfileStatus('missing')
      }
      setSyncError(null)
      return remote
    } catch (cause) {
      if (requestId === requestIdRef.current) {
        setProfileStatus('error')
        setSyncError('プロフィールを同期できませんでした。')
      }
      throw cause
    } finally {
      if (requestId === requestIdRef.current) setIsSyncing(false)
    }
  }, [firebaseUserId])

  useEffect(() => {
    if (USE_FIREBASE) {
      requestIdRef.current += 1
      if (!firebaseUserId) {
        setProfile(null)
        setProfileOwnerId(null)
        setProfileStatus(auth.status === 'loading' ? 'loading' : 'idle')
        setIsSyncing(auth.status === 'loading')
        setSyncError(null)
        return
      }

      const cached = readCachedProfile(firebaseUserId)
      setProfile(cached)
      setProfileOwnerId(firebaseUserId)
      setProfileStatus('loading')
      setSyncError(null)
      void refreshProfile().catch(() => undefined)
      return
    }

    if (!getIdentity()?.userId) return
    void refreshProfile().catch(() => undefined)
  }, [auth.status, firebaseUserId, refreshProfile])

  const saveProfile = useCallback(async (next: Profile): Promise<Profile> => {
    setIsSyncing(true)
    try {
      const remote = USE_FIREBASE || getIdentity()?.userId
        ? await updateMyProfile({
            nickname: next.nickname,
            childAgeGroup: next.childAgeGroup,
            avatarId: next.avatarId,
          })
        : next
      cacheProfile(remote, USE_FIREBASE)
      setProfile(remote)
      setProfileOwnerId(remote.userId)
      setProfileStatus('ready')
      setSyncError(null)
      return remote
    } catch (cause) {
      setSyncError('プロフィールを同期できませんでした。')
      throw cause
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const saveDraft = useCallback((next: Profile) => {
    const ownerId = USE_FIREBASE ? firebaseUserId ?? next.userId : next.userId
    const normalized = ownerId ? { ...next, userId: ownerId } : next
    if (!USE_FIREBASE || normalized.avatarId) cacheProfile(normalized, USE_FIREBASE)
    setProfile(normalized)
    setProfileOwnerId(ownerId || null)
    setProfileStatus(normalized.avatarId ? 'ready' : 'draft')
    setSyncError(null)
  }, [firebaseUserId])

  const visibleProfile = USE_FIREBASE && profileOwnerId !== (firebaseUserId ?? null)
    ? null
    : profile
  const visibleStatus = USE_FIREBASE && auth.status === 'google' && profileOwnerId !== firebaseUserId
    ? 'loading'
    : profileStatus

  const value = useMemo(() => ({
    profile: visibleProfile,
    profileStatus: visibleStatus,
    saveProfile,
    saveDraft,
    refreshProfile,
    isSyncing,
    syncError,
  }), [
    isSyncing,
    refreshProfile,
    saveDraft,
    saveProfile,
    syncError,
    visibleProfile,
    visibleStatus,
  ])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
