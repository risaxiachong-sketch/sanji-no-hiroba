import type { Profile } from '../types'
import { apiGet, apiPatch, apiPost, USE_MOCK } from './client'
import { completeIdentity, ensureIdentity, getIdentity } from './identity'

interface RegisterInput {
  nickname: string
  childAgeGroup: string
  avatarId: string
}

export async function registerUser(input: RegisterInput): Promise<Profile> {
  const identity = ensureIdentity()
  if (USE_MOCK) {
    const profile = { ...input, userId: identity.userId ?? crypto.randomUUID() }
    completeIdentity(profile.userId)
    return profile
  }
  const profile = await apiPost<Profile>('/users/register', {
    ...input,
    installationId: identity.installationId,
    deviceToken: identity.deviceToken,
  }, { authenticated: false })
  completeIdentity(profile.userId)
  return profile
}

export async function fetchMyProfile(): Promise<Profile | null> {
  if (!getIdentity()?.userId) return null
  if (USE_MOCK) return null
  return apiGet<Profile>('/users/me')
}

export async function updateMyProfile(input: Partial<Pick<Profile, 'nickname' | 'childAgeGroup' | 'avatarId'>>): Promise<Profile> {
  if (USE_MOCK) {
    return { userId: getIdentity()?.userId ?? '', nickname: input.nickname ?? '', childAgeGroup: input.childAgeGroup ?? '', avatarId: input.avatarId ?? '' }
  }
  return apiPatch<Profile>('/users/me', input)
}
