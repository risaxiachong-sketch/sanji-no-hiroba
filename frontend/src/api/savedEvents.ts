import { collection, deleteDoc, doc, getDocs, limit, query, runTransaction, serverTimestamp } from 'firebase/firestore'
import { ApiError, apiDelete, apiGet, apiPost, USE_FIREBASE, USE_MOCK } from './client'
import { firebaseApiError, getFirebaseContext } from './firebase'

function validateEventId(id: string): void {
  if (id.length === 0 || id.length > 128 || id.includes('/')) {
    throw new ApiError(400, 'イベントIDが不正です。')
  }
}

export async function fetchSavedEventIds(): Promise<string[]> {
  if (USE_MOCK) return []
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    try {
      const snapshot = await getDocs(query(
        collection(db, 'users', user.uid, 'savedEvents'),
        limit(200),
      ))
      return snapshot.docs.flatMap((savedDocument) => {
        const eventId = savedDocument.get('eventId')
        return typeof eventId === 'string' && eventId === savedDocument.id ? [eventId] : []
      })
    } catch (cause) {
      throw firebaseApiError(cause, '保存一覧を読み込めませんでした。')
    }
  }
  const response = await apiGet<{ eventIds: string[] }>('/saved-events')
  return response.eventIds
}

export async function saveEvent(id: string): Promise<void> {
  validateEventId(id)
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    try {
      const savedEventRef = doc(db, 'users', user.uid, 'savedEvents', id)
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(savedEventRef)
        if (!existing.exists()) {
          transaction.set(savedEventRef, {
            eventId: id,
            createdAt: serverTimestamp(),
          })
        }
      })
    } catch (cause) {
      throw firebaseApiError(cause, 'イベントを保存できませんでした。')
    }
  } else if (!USE_MOCK) {
    await apiPost(`/saved-events/${encodeURIComponent(id)}`, {})
  }
}

export async function removeSavedEvent(id: string): Promise<void> {
  validateEventId(id)
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedEvents', id))
    } catch (cause) {
      throw firebaseApiError(cause, 'イベントの保存を解除できませんでした。')
    }
  } else if (!USE_MOCK) {
    await apiDelete(`/saved-events/${encodeURIComponent(id)}`)
  }
}
