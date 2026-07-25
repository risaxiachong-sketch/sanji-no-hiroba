import { useState } from 'react'
import type { Avatar, Mood, MoodOption } from '../../types'
import styles from './MoodSelect.module.css'

const MOOD_OPTIONS: MoodOption[] = [
  { value: 'tired',    label: 'ちょっと疲れた',       emoji: '😮‍💨', description: '少し休みながら、ここにいよう' },
  { value: 'presence', label: '誰かの気配を感じたい', emoji: '🌙',  description: 'ひとりじゃないって感じたい' },
  { value: 'outing',   label: 'お出かけ先を探したい', emoji: '🗺️',  description: '地域のイベントや施設を調べよう' },
  { value: 'talk',     label: '少し話したい',          emoji: '💬',  description: 'ゆるくつぶやいてみよう' },
  { value: 'observe',  label: '見るだけ',              emoji: '👀',  description: '眺めるだけでも大丈夫' },
]

interface Props {
  avatar: Avatar
  onSelect: (mood: Mood) => void
}

export function MoodSelect({ avatar, onSelect }: Props) {
  const [selected, setSelected] = useState<Mood | null>(null)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatarBadge}>
          <span className={styles.avatarEmoji} aria-hidden="true">{avatar.emoji}</span>
          <span className={styles.avatarLabel}>{avatar.label}</span>
        </div>
        <h1 className={styles.title}>今日はどんな気分？</h1>
        <p className={styles.subtitle}>どれを選んでも大丈夫です</p>
      </div>

      <div className={styles.list} role="group" aria-label="気分・目的の選択">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.moodBtn} ${selected === opt.value ? styles.selected : ''}`}
            aria-pressed={selected === opt.value}
            onClick={() => setSelected(opt.value)}
          >
            <span className={styles.moodEmoji} aria-hidden="true">{opt.emoji}</span>
            <span className={styles.moodText}>
              <span className={styles.moodLabel}>{opt.label}</span>
              <span className={styles.moodDesc}>{opt.description}</span>
            </span>
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
          ひろばへ入る
        </button>
      </div>
    </div>
  )
}
