import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../types'
import { fetchMyProfile, updateMyProfile } from '../api/users'
import { getIdentity } from '../api/identity'

const STORAGE_KEY = 'sanji-profile'

export function loadCachedProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Profile>
    if (typeof parsed.nickname !== 'string' || typeof parsed.childAgeGroup !== 'string') return null
    return {
      userId: parsed.userId ?? getIdentity()?.userId ?? '',
      nickname: parsed.nickname,
      childAgeGroup: parsed.childAgeGroup,
      avatarId: parsed.avatarId ?? '',
    }
  } catch {
    return null
  }
}

function cache(profile: Profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(loadCachedProfile)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!getIdentity()?.userId) return
    let cancelled = false
    setIsSyncing(true)
    fetchMyProfile()
      .then((remote) => {
        if (!cancelled && remote) {
          cache(remote)
          setProfile(remote)
          setSyncError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setSyncError('プロフィールを同期できませんでした。')
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false)
      })
    return () => { cancelled = true }
  }, [])

  const saveProfile = useCallback(async (next: Profile) => {
    setIsSyncing(true)
    try {
      const remote = getIdentity()?.userId
        ? await updateMyProfile({
            nickname: next.nickname,
            childAgeGroup: next.childAgeGroup,
            avatarId: next.avatarId,
          })
        : next
      cache(remote)
      setProfile(remote)
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
    cache(next)
    setProfile(next)
  }, [])

  return { profile, saveProfile, saveDraft, isSyncing, syncError }
}
