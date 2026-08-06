import type { ReactNode } from 'react'

export const FONT_STACK =
  '"Hiragino Maru Gothic ProN", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif'

export const COLORS = {
  ink: '#5c3b2d',
  inkSoft: '#7b5a48',
  cream: '#fff8eb',
  creamDeep: '#f9ead7',
  coral: '#ef9d96',
  blush: '#f8c5c2',
  lavender: '#c9c2f4',
  green: '#9ecb97',
  blue: '#78bdd4',
  yellow: '#f5c268',
} as const

/**
 * The frame is authored so the screen area is exactly the captured viewport,
 * then scaled to fill the 1080px canvas height. Keeping the screen at the
 * capture's own aspect ratio is what stops the footage from being letterboxed.
 */
export const PHONE_SCREEN = { width: 430, height: 932 } as const
const BEZEL = 12
const BORDER = 2
const INSET = BEZEL + BORDER

export const PHONE_BASE = {
  width: PHONE_SCREEN.width + INSET * 2,
  height: PHONE_SCREEN.height + INSET * 2,
} as const

/** Vertical breathing room above and below the phone, in canvas pixels. */
const CANVAS_MARGIN = 12
export const PHONE_SCALE = (1080 - CANVAS_MARGIN * 2) / PHONE_BASE.height

export const PhoneFrame = ({ children }: Readonly<{ children: ReactNode }>) => (
  <div
    style={{
      position: 'relative',
      width: PHONE_BASE.width * PHONE_SCALE,
      height: PHONE_BASE.height * PHONE_SCALE,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: PHONE_BASE.width,
        height: PHONE_BASE.height,
        boxSizing: 'border-box',
        padding: BEZEL,
        border: `${BORDER}px solid rgba(80, 57, 47, 0.36)`,
        borderRadius: 58,
        background: 'linear-gradient(150deg, #5e554f, #2f2b2a 58%, #6f6259)',
        boxShadow: '0 34px 72px rgba(88, 55, 40, 0.24), inset 0 0 0 2px rgba(255,255,255,0.16)',
        transform: `scale(${PHONE_SCALE})`,
        transformOrigin: 'top left',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: PHONE_SCREEN.width,
          height: PHONE_SCREEN.height,
          overflow: 'hidden',
          borderRadius: 46,
          background: COLORS.cream,
        }}
      >
        {/*
          No notch or home indicator: the app draws all the way to the edges of
          the captured viewport, and a decorative overlay would cover its own UI.
        */}
        {children}
      </div>
    </div>
  </div>
)
