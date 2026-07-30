import type { Avatar } from '../../types'
import { AVATARS } from '../../data/avatars'
import styles from './SettingsAvatar.module.css'

interface Props {
  avatar: Avatar
  onAvatarChange: (avatar: Avatar) => void
  onBack: () => void
}

export function SettingsAvatar({ avatar, onAvatarChange, onBack }: Props) {
  const handleSelect = (next: Avatar) => {
    if (next.id !== avatar.id) onAvatarChange(next)
    onBack()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="設定に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>アバター</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        <div className={styles.grid} role="group" aria-label="アバター選択">
          {AVATARS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${styles.avatarBtn} ${avatar.id === option.id ? styles.selected : ''}`}
              style={{ backgroundColor: option.color }}
              aria-pressed={avatar.id === option.id}
              aria-label={option.label}
              onClick={() => handleSelect(option)}
            >
              <span className={styles.emoji} aria-hidden="true">{option.emoji}</span>
              <span className={styles.label}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
