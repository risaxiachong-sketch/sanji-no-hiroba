import { createContext } from 'react'
import type { Profile } from '../types'

export type ProfileStatus = 'idle' | 'loading' | 'missing' | 'draft' | 'ready' | 'error'

export interface ProfileContextValue {
  profile: Profile | null
  profileStatus: ProfileStatus
  saveProfile: (next: Profile) => Promise<Profile>
  saveDraft: (next: Profile) => void
  refreshProfile: () => Promise<Profile | null>
  isSyncing: boolean
  syncError: string | null
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)
