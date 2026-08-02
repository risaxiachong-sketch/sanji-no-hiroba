export interface DeviceIdentity {
  installationId: string
  deviceToken: string
  userId?: string
}

const STORAGE_KEY = 'sanji-device-identity'

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export function getIdentity(): DeviceIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DeviceIdentity
    return parsed.installationId && parsed.deviceToken ? parsed : null
  } catch {
    return null
  }
}

export function ensureIdentity(): DeviceIdentity {
  const current = getIdentity()
  if (current) return current
  const identity: DeviceIdentity = {
    installationId: crypto.randomUUID(),
    deviceToken: randomToken(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  return identity
}

export function completeIdentity(userId: string) {
  const identity = ensureIdentity()
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...identity, userId }))
}

export function authHeaders(): Record<string, string> {
  const identity = getIdentity()
  return identity?.userId
    ? { Authorization: `Bearer ${identity.deviceToken}`, 'x-user-id': identity.userId }
    : {}
}
