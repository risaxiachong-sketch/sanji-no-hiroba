import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSavedEventIds, removeSavedEvent, saveEvent } from '../api/savedEvents'
import { legacySavedEventsCacheKey, savedEventsCacheKey } from '../api/accountCache'
import { USE_FIREBASE } from '../api/client'
import { getIdentity } from '../api/identity'
import { useSoundEffects } from '../audio/SoundContext'

function storageKey(userId?: string): string | null {
  if (USE_FIREBASE) return userId ? savedEventsCacheKey(userId) : null
  return legacySavedEventsCacheKey()
}

function loadCache(userId?: string): string[] {
  try {
    const key = storageKey(userId)
    if (!key) return []
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cache(ids: string[], userId?: string) {
  try {
    const key = storageKey(userId)
    if (!key) return
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Firestore remains the source of truth when device storage is unavailable.
  }
}

export function useSavedEvents(userId?: string) {
  const { play } = useSoundEffects()
  const [savedIds, setSavedIds] = useState<string[]>(() => loadCache(userId))
  const savedIdsRef = useRef(savedIds)
  const operationsRef = useRef(new Map<string, Promise<void>>())
  const activeUserIdRef = useRef(userId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    activeUserIdRef.current = userId
    operationsRef.current.clear()
    const initial = loadCache(userId)
    savedIdsRef.current = initial
    setSavedIds(initial)
    setError(null)
    if (!userId || (!USE_FIREBASE && !getIdentity()?.userId)) return
    let cancelled = false
    fetchSavedEventIds()
      .then(async (remoteIds) => {
        const localIds = loadCache(userId)
        const missing = localIds.filter((id) => !remoteIds.includes(id))
        await Promise.all(missing.map(saveEvent))
        const merged = [...new Set([...remoteIds, ...missing])]
        if (!cancelled && activeUserIdRef.current === userId) {
          cache(merged, userId)
          savedIdsRef.current = merged
          setSavedIds(merged)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('保存一覧を同期できませんでした。')
      })
    return () => { cancelled = true }
  }, [userId])

  const toggleSave = useCallback((id: string) => {
    if (USE_FIREBASE && !userId) {
      setError('Googleアカウントでログインしてください。')
      play('error')
      return
    }
    const current = savedIdsRef.current
    const wasSaved = current.includes(id)
    const next = wasSaved ? current.filter((item) => item !== id) : [...current, id]
    savedIdsRef.current = next
    cache(next, userId)
    setSavedIds(next)

    // Serialize writes for one event so rapid save/un-save taps cannot arrive
    // at Firestore out of order. Keeping the effect outside setState also makes
    // it safe under React StrictMode's updater checks.
    const previous = operationsRef.current.get(id) ?? Promise.resolve()
    const operation = previous
      .catch(() => undefined)
      .then(() => wasSaved ? removeSavedEvent(id) : saveEvent(id))
    operationsRef.current.set(id, operation)
    operation
      .then(() => {
        if (operationsRef.current.get(id) === operation) operationsRef.current.delete(id)
        if (activeUserIdRef.current === userId) setError(null)
      })
      .catch(() => {
        if (operationsRef.current.get(id) === operation) operationsRef.current.delete(id)
        if (activeUserIdRef.current === userId && savedIdsRef.current === next) {
          savedIdsRef.current = current
          cache(current, userId)
          setSavedIds(current)
        }
        if (activeUserIdRef.current === userId) {
          setError('保存一覧を同期できませんでした。')
          play('error')
        }
      })
  }, [play, userId])

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds])
  return { savedIds, toggleSave, isSaved, error }
}
