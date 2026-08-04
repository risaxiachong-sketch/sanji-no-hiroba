import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { CharacterScaleContext, type CharacterScale } from './CharacterScaleContext'

const STORAGE_KEY = 'sanji-character-scale'
const VALID_SCALES: CharacterScale[] = ['small', 'medium', 'large']

function isCharacterScale(value: string | null): value is CharacterScale {
  return value !== null && (VALID_SCALES as string[]).includes(value)
}

function loadScale(): CharacterScale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isCharacterScale(stored) ? stored : 'medium'
  } catch {
    return 'medium'
  }
}

export function CharacterScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<CharacterScale>(loadScale)

  const setScale = useCallback((next: CharacterScale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The preference remains active for this session when storage is unavailable.
    }
    setScaleState(next)
  }, [])

  return (
    <CharacterScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </CharacterScaleContext.Provider>
  )
}
