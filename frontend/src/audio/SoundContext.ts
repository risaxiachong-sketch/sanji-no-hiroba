import { createContext, useContext } from 'react'
import type { SoundEffect } from './soundEffects'

export interface SoundContextValue {
  enabled: boolean
  play: (effect: SoundEffect) => void
  setEnabled: (enabled: boolean) => void
  unlock: () => void
}

export const SoundContext = createContext<SoundContextValue | null>(null)

export function useSoundEffects() {
  const value = useContext(SoundContext)
  if (!value) throw new Error('useSoundEffects must be used inside SoundProvider')
  return value
}
