import { createContext, useContext } from 'react'

export type CharacterScale = 'small' | 'medium' | 'large'

export interface CharacterScaleContextValue {
  scale: CharacterScale
  setScale: (scale: CharacterScale) => void
}

export const CharacterScaleContext = createContext<CharacterScaleContextValue | null>(null)

export function useCharacterScale() {
  const value = useContext(CharacterScaleContext)
  if (!value) throw new Error('useCharacterScale must be used inside CharacterScaleProvider')
  return value
}
