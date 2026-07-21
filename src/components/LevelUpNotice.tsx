import { useEffect } from 'react'
import { townLevel, unlocksBetween } from '../types/townLevel'

type LevelUpNoticeProps = {
  /** The level the town was at before this post. */
  from: number
  /** The level it has just reached. */
  to: number
  onClose: () => void
}

/** Shown once when a post pushes the town up one or more levels. */
export function LevelUpNotice({ from, to, onClose }: LevelUpNoticeProps) {
  const reached = townLevel(to)
  // A single post can cross more than one level, so gather everything new.
  const newThings = unlocksBetween(from, to).flatMap((entry) => entry.unlocks)

  useEffect(() => {
    const timer = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <div className="levelup-backdrop" role="dialog" aria-live="assertive" onClick={onClose}>
      <div className="levelup-card" onClick={(event) => event.stopPropagation()}>
        <span className="levelup-eyebrow">まちが育ちました</span>
        <strong className="levelup-level">レベル {to}</strong>
        <p className="levelup-title">{reached.title}</p>
        <p className="levelup-summary">{reached.summary}</p>

        {newThings.length > 0 && (
          <ul className="levelup-unlocks">
            {newThings.map((thing) => (
              <li key={thing}>
                <span aria-hidden="true">✦</span>
                {thing}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="levelup-close" onClick={onClose}>
          広場を見る
        </button>
      </div>
    </div>
  )
}
