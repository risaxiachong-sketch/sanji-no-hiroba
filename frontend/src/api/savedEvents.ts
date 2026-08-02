import { apiDelete, apiGet, apiPost, USE_MOCK } from './client'

export async function fetchSavedEventIds(): Promise<string[]> {
  if (USE_MOCK) return []
  const response = await apiGet<{ eventIds: string[] }>('/saved-events')
  return response.eventIds
}

export async function saveEvent(id: string): Promise<void> {
  if (!USE_MOCK) await apiPost(`/saved-events/${encodeURIComponent(id)}`, {})
}

export async function removeSavedEvent(id: string): Promise<void> {
  if (!USE_MOCK) await apiDelete(`/saved-events/${encodeURIComponent(id)}`)
}
