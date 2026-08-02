import type { Event, EventStatus } from '../types'
import { EVENTS } from '../data/events'
import { apiGet, apiPatch, apiPost, uploadToSignedUrl, USE_MOCK } from './client'

export async function fetchEvents(ids?: string[]): Promise<{ events: Event[] }> {
  if (USE_MOCK) return { events: ids?.length ? EVENTS.filter((event) => ids.includes(event.id)) : EVENTS }
  const query = ids?.length ? `?ids=${ids.map(encodeURIComponent).join(',')}` : ''
  return apiGet<{ events: Event[] }>(`/events${query}`)
}

export async function fetchEvent(id: string): Promise<Event> {
  if (USE_MOCK) {
    const event = EVENTS.find((item) => item.id === id)
    if (!event) throw new Error('イベントが見つかりません。')
    return event
  }
  return apiGet<Event>(`/events/${encodeURIComponent(id)}`)
}

export async function createEvent(event: Omit<Event, 'id'>, apiKey: string): Promise<Event> {
  if (USE_MOCK) return { ...event, id: `ev-${Date.now()}` }
  return apiPost<Event>('/admin/events', event, { apiKey })
}

export async function updateEventStatus(id: string, status: EventStatus, apiKey: string) {
  if (USE_MOCK) return { id, status, updatedAt: new Date().toISOString() }
  return apiPatch(`/admin/events/${encodeURIComponent(id)}/status`, { status }, { apiKey })
}

export async function uploadEventImage(file: File, apiKey: string): Promise<string> {
  if (USE_MOCK) return URL.createObjectURL(file)
  const response = await apiPost<{ uploadUrl: string; key: string }>(
    '/admin/events/upload-url',
    { contentType: file.type, fileSize: file.size },
    { apiKey },
  )
  await uploadToSignedUrl(response.uploadUrl, file)
  return response.key
}
