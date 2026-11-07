const LEGACY_PROFILE_KEY = 'sanji-profile'
const LEGACY_SAVED_EVENTS_KEY = 'sanji-saved-events'
const LEGACY_AVATAR_KEY = 'sanji-avatar-id'

function scopedKey(base: string, userId: string): string {
  return `${base}:${userId}`
}

export function profileCacheKey(userId: string): string {
  return scopedKey(LEGACY_PROFILE_KEY, userId)
}

export function savedEventsCacheKey(userId: string): string {
  return scopedKey(LEGACY_SAVED_EVENTS_KEY, userId)
}

export function avatarCacheKey(userId: string): string {
  return scopedKey(LEGACY_AVATAR_KEY, userId)
}

export function legacyProfileCacheKey(): string {
  return LEGACY_PROFILE_KEY
}

export function legacySavedEventsCacheKey(): string {
  return LEGACY_SAVED_EVENTS_KEY
}

export function legacyAvatarCacheKey(): string {
  return LEGACY_AVATAR_KEY
}

/** Removes only device caches. The user's Firestore data remains untouched. */
export function clearAccountCaches(userId: string): void {
  try {
    localStorage.removeItem(profileCacheKey(userId))
    localStorage.removeItem(savedEventsCacheKey(userId))
    localStorage.removeItem(avatarCacheKey(userId))
  } catch {
    // Browsers can deny storage access; Firebase sign-out must still succeed.
  }
}
