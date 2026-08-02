import { useCallback, useEffect, useState } from 'react'
import { fetchSavedEventIds, removeSavedEvent, saveEvent } from '../api/savedEvents'
import { getIdentity } from '../api/identity'

const STORAGE_KEY = 'sanji-saved-events'

function loadCache(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cache(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function useSavedEvents(userId?: string) {
  const [savedIds, setSavedIds] = useState<string[]>(loadCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !getIdentity()?.userId) return
    let cancelled = false
    fetchSavedEventIds()
      .then(async (remoteIds) => {
        const localIds = loadCache()
        const missing = localIds.filter((id) => !remoteIds.includes(id))
        await Promise.all(missing.map(saveEvent))
        const merged = [...new Set([...remoteIds, ...missing])]
        if (!cancelled) {
          cache(merged)
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
    setSavedIds((current) => {
      const wasSaved = current.includes(id)
      const next = wasSaved ? current.filter((item) => item !== id) : [...current, id]
      cache(next)
      const operation = wasSaved ? removeSavedEvent(id) : saveEvent(id)
      operation.catch(() => {
        cache(current)
        setSavedIds(current)
        setError('保存一覧を同期できませんでした。')
      })
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds])
  return { savedIds, toggleSave, isSaved, error }
}
