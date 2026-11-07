import { authHeaders } from './identity'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
const firebaseRequiredEnv = [
  import.meta.env.VITE_FIREBASE_API_KEY,
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  import.meta.env.VITE_FIREBASE_PROJECT_ID,
  import.meta.env.VITE_FIREBASE_APP_ID,
]

const hasFirebaseConfig = firebaseRequiredEnv.every((value) => {
  return typeof value === 'string' && value.trim().length > 0
})

export type DataMode = 'api' | 'firebase' | 'mock'

// An explicitly configured AWS API remains the first choice. Firebase is the
// card-free hosted fallback, and a static mock keeps local/demo builds usable.
export const DATA_MODE: DataMode = import.meta.env.VITE_USE_MOCK === 'true'
  ? 'mock'
  : API_BASE
    ? 'api'
    : hasFirebaseConfig
      ? 'firebase'
      : 'mock'

export const USE_FIREBASE = DATA_MODE === 'firebase'
export const USE_MOCK = DATA_MODE === 'mock'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

function headers(options?: { apiKey?: string; authenticated?: boolean }) {
  const result: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options?.authenticated !== false) Object.assign(result, authHeaders())
  if (options?.apiKey) result['x-api-key'] = options.apiKey
  return result
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new ApiError(0, 'APIの接続先が設定されていません。')
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) throw new ApiError(response.status, await response.text())
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request(path, { headers: headers() })
}

export function apiPost<T>(path: string, body: unknown, options?: { apiKey?: string; authenticated?: boolean }): Promise<T> {
  return request(path, { method: 'POST', headers: headers(options), body: JSON.stringify(body) })
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request(path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
}

export function apiPatch<T>(path: string, body: unknown, options?: { apiKey?: string }): Promise<T> {
  return request(path, { method: 'PATCH', headers: headers(options), body: JSON.stringify(body) })
}

export async function apiDelete(path: string): Promise<void> {
  await request(path, { method: 'DELETE', headers: headers() })
}

export async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!response.ok) throw new ApiError(response.status, '画像をアップロードできませんでした。')
}
