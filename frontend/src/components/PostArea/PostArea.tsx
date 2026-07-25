import { useState } from 'react'
import type { Avatar, ReactionType, ReactionOption } from '../../types'
import styles from './PostArea.module.css'

const MAX_LENGTH = 60

const REACTIONS: ReactionOption[] = [
  { value: 'otsukare', label: 'おつかれさま', emoji: '🌸' },
  { value: 'wakaru',   label: 'わかるよ',     emoji: '🤝' },
  { value: 'koko',     label: 'ここにいるよ', emoji: '💛' },
  { value: 'sotto',    label: 'そっと見守る', emoji: '🌙' },
]

interface Props {
  avatar: Avatar
  onClose: () => void
}

export function PostArea({ avatar, onClose }: Props) {
  const [text, setText] = useState('')
  const [posted, setPosted] = useState(false)
  const [sentReaction, setSentReaction] = useState<ReactionType | null>(null)

  const handlePost = () => {
    if (!text.trim()) return
    setPosted(true)
    setText('')
    setTimeout(() => setPosted(false), 2500)
  }

  const handleReaction = (value: ReactionType) => {
    setSentReaction(value)
    setTimeout(() => setSentReaction(null), 2000)
  }

  const isOverLimit = text.length >= MAX_LENGTH

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <button type="button" className="btn-back" onClick={onClose} aria-label="広場に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>つぶやく</h1>
        <div style={{ width: '60px' }} />
      </div>

      {/* 投稿フォーム */}
      <div className={styles.card}>
        <div className={styles.userRow}>
          <div
            className={styles.avatarCircle}
            style={{ backgroundColor: avatar.color }}
            aria-hidden="true"
          >
            {avatar.emoji}
          </div>
          <span className={styles.userName}>{avatar.label}</span>
        </div>

        <textarea
          className={styles.textarea}
          value={text}
          maxLength={MAX_LENGTH}
          placeholder="今の気持ちを短く書いてみよう（任意）"
          aria-label="つぶやきの内容"
          onChange={(e) => setText(e.target.value)}
        />

        <div className={`${styles.counter} ${isOverLimit ? styles.limit : ''}`}>
          {text.length} / {MAX_LENGTH}
        </div>
      </div>

      {/* リアクション */}
      <p className={styles.sectionTitle}>リアクションを送る</p>
      <div className={styles.reactions}>
        {REACTIONS.map((r) => (
          <button
            key={r.value}
            type="button"
            className={`${styles.reactionBtn} ${sentReaction === r.value ? styles.sent : ''}`}
            onClick={() => handleReaction(r.value)}
            aria-pressed={sentReaction === r.value}
            aria-label={r.label}
          >
            <span className={styles.reactionEmoji} aria-hidden="true">{r.emoji}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {sentReaction && (
        <p className={styles.sentMessage} role="status" aria-live="polite">
          {REACTIONS.find(r => r.value === sentReaction)?.emoji}
          {' '}「{REACTIONS.find(r => r.value === sentReaction)?.label}」を送りました
        </p>
      )}

      {/* 注意書き */}
      <p className={styles.notice}>
        投稿・リアクションは任意です。<br />
        見るだけでも、いつでも広場に戻れます。
      </p>

      {/* フッター */}
      <div className={styles.footer}>
        {posted && (
          <p className={styles.sentMessage} role="status" aria-live="polite">
            🌸 つぶやきを送りました
          </p>
        )}
        <button
          type="button"
          className="btn-primary"
          disabled={!text.trim()}
          onClick={handlePost}
        >
          つぶやく
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={onClose}
        >
          広場に戻る
        </button>
      </div>
    </div>
  )
}
