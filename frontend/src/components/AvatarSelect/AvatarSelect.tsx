import { useState } from 'react'
import type { Avatar } from '../../types'
import { AVATARS } from '../../data/avatars'
import styles from './AvatarSelect.module.css'

interface Props {
  onSelect: (avatar: Avatar) => void
}

export function AvatarSelect({ onSelect }: Props) {
  const [selected, setSelected] = useState<Avatar | null>(null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>アバターを選んでね</h1>
        <p className={styles.subtitle}>あなたの広場でのすがたです</p>
      </div>

      <div className={styles.grid} role="group" aria-label="アバター選択">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            className={`${styles.avatarBtn} ${selected?.id === avatar.id ? styles.selected : ''}`}
            style={{ backgroundColor: avatar.color }}
            aria-pressed={selected?.id === avatar.id}
            aria-label={avatar.label}
            onClick={() => setSelected(avatar)}
          >
            <span className={styles.emoji} aria-hidden="true">{avatar.emoji}</span>
            <span className={styles.label}>{avatar.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className="btn-primary"
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
        >
          次へ
        </button>
      </div>
    </div>
  )
}
