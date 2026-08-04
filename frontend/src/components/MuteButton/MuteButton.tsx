import { useSoundEffects } from '../../audio/SoundContext'
import styles from './MuteButton.module.css'

export function MuteButton() {
  const { enabled, setEnabled } = useSoundEffects()

  return (
    <button
      type="button"
      className={styles.muteButton}
      data-sfx="none"
      aria-label={enabled ? '音を消す' : '音を再生する'}
      aria-pressed={!enabled}
      onClick={() => setEnabled(!enabled)}
    >
      <span aria-hidden="true">{enabled ? '🔊' : '🔇'}</span>
    </button>
  )
}
