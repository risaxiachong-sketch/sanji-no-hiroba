import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { SoundContext } from './SoundContext'
import { isSoundEffect, SoundEngine } from './soundEffects'
import type { SoundEffect } from './soundEffects'

const STORAGE_KEY = 'sanji-sound-enabled'

function loadEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function getInteractiveElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>('button, a, [role="button"]')
}

function isUnavailable(element: HTMLElement) {
  return element.getAttribute('aria-disabled') === 'true'
    || (element instanceof HTMLButtonElement && element.disabled)
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(loadEnabled)
  const engineRef = useRef<SoundEngine | null>(null)
  if (!engineRef.current) engineRef.current = new SoundEngine(enabled)

  const unlock = useCallback(() => {
    engineRef.current?.unlock()
  }, [])

  const play = useCallback((effect: SoundEffect) => {
    engineRef.current?.play(effect)
  }, [])

  const setEnabled = useCallback((nextEnabled: boolean) => {
    const engine = engineRef.current
    if (nextEnabled) {
      engine?.setEnabled(true)
      engine?.unlock()
      engine?.play('select')
    } else {
      engine?.play('back')
      engine?.setEnabled(false)
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(nextEnabled))
    } catch {
      // The preference remains active for this session when storage is unavailable.
    }
    setEnabledState(nextEnabled)
  }, [])

  useEffect(() => {
    const handlePointerDown = () => unlock()
    const playForElement = (element: HTMLElement) => {
      if (isUnavailable(element)) return
      const requestedEffect = element.dataset.sfx
      if (requestedEffect === 'none') return
      if (requestedEffect && isSoundEffect(requestedEffect)) {
        play(requestedEffect)
        return
      }
      play(element.hasAttribute('aria-pressed') || element.getAttribute('role') === 'option' ? 'select' : 'tap')
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      unlock()
      const element = getInteractiveElement(event.target)
      if (
        element?.getAttribute('role') === 'button'
        && !(element instanceof HTMLButtonElement)
        && !(element instanceof HTMLAnchorElement)
      ) {
        playForElement(element)
      }
    }
    const handleClick = (event: MouseEvent) => {
      const element = getInteractiveElement(event.target)
      if (element) playForElement(element)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('click', handleClick, true)
      engineRef.current?.close()
    }
  }, [play, unlock])

  return (
    <SoundContext.Provider value={{ enabled, play, setEnabled, unlock }}>
      {children}
    </SoundContext.Provider>
  )
}
