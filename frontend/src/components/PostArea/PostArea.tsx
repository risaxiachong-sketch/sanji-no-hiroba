import { useState } from 'react'
import type { Avatar, ReactionType, ReactionOption, Post } from '../../types'
import { INITIAL_POSTS } from '../../data/posts'
import styles from './PostArea.module.css'

const MAX_LENGTH = 60

const REACTIONS: ReactionOption[] = [
  { value: 'wakaru',      label: 'わかるよ',         emoji: '🫶' },
  { value: 'otsukare',    label: 'おつかれさま',     emoji: '☕' },
  { value: 'kokoniiruyo', label: 'ここにいるよ',     emoji: '🌿' },
  { value: 'watashimo',   label: '私も同じ',         emoji: '🙋' },
  { value: 'ouen',        label: '応援してるよ',     emoji: '📣' },
  { value: 'kyoumo',      label: '今日もおつかれさま', emoji: '🌙' },
  { value: 'yokattane',   label: 'よかったね',       emoji: '🎉' },
  { value: 'hitoiki',     label: 'ひと息ついてね',   emoji: '🍀' },
]

interface Props {
  avatar: Avatar
  onClose: () => void
}

export function PostArea({ avatar, onClose }: Props) {
  const [text, setText] = useState('')
  const [posted, setPosted] = useState(false)
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS)
  const [expandedReaction, setExpandedReaction] = useState<{ postId: string; type: ReactionType } | null>(null)

  const handlePost = () => {
    if (!text.trim()) return
    const newPost: Post = {
      id: `post-${Date.now()}`,
      nickname: avatar.label,
      avatar,
      text: text.trim(),
      reactions: {
        wakaru: 0, otsukare: 0, kokoniiruyo: 0, watashimo: 0,
        ouen: 0, kyoumo: 0, yokattane: 0, hitoiki: 0,
      },
      reactionUsers: {
        wakaru: [], otsukare: [], kokoniiruyo: [], watashimo: [],
        ouen: [], kyoumo: [], yokattane: [], hitoiki: [],
      },
      myReactions: [],
      timestamp: new Date().toISOString(),
    }
    setPosts(prev => [newPost, ...prev])
    setPosted(true)
    setText('')
    setTimeout(() => setPosted(false), 2500)
  }

  const handleReaction = (postId: string, reactionType: ReactionType) => {
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post
      const isAlreadySent = post.myReactions.includes(reactionType)
      const newReactions = { ...post.reactions }
      const newMyReactions = [...post.myReactions]
      const newReactionUsers = { ...post.reactionUsers }

      if (isAlreadySent) {
        newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1)
        const idx = newMyReactions.indexOf(reactionType)
        if (idx !== -1) newMyReactions.splice(idx, 1)
        newReactionUsers[reactionType] = newReactionUsers[reactionType].filter(u => u.id !== 'me')
      } else {
        newReactions[reactionType] += 1
        newMyReactions.push(reactionType)
        newReactionUsers[reactionType] = [
          ...newReactionUsers[reactionType],
          { id: 'me', nickname: avatar.label, avatarEmoji: avatar.emoji, avatarColor: avatar.color },
        ]
      }
      return { ...post, reactions: newReactions, myReactions: newMyReactions, reactionUsers: newReactionUsers }
    }))
  }

  const toggleReactionGroup = (postId: string, type: ReactionType) => {
    if (expandedReaction?.postId === postId && expandedReaction?.type === type) {
      setExpandedReaction(null)
    } else {
      setExpandedReaction({ postId, type })
    }
  }

  const isOverLimit = text.length >= MAX_LENGTH

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'たった今'
    if (mins < 60) return `${mins}分前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    return `${days}日前`
  }

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

        <button
          type="button"
          className="btn-primary"
          disabled={!text.trim()}
          onClick={handlePost}
          style={{ marginTop: '8px' }}
        >
          つぶやく
        </button>

        {posted && (
          <p className={styles.sentMessage} role="status" aria-live="polite">
            🌸 つぶやきを送りました
          </p>
        )}
      </div>

      {/* 注意書き */}
      <p className={styles.notice}>
        投稿・リアクションは任意です。見るだけでも、いつでも広場に戻れます。
      </p>

      {/* 投稿一覧 */}
      <section className={styles.postList} aria-label="みんなのつぶやき">
        <h2 className={styles.sectionTitle}>みんなのつぶやき</h2>
        {posts.map(post => (
          <article key={post.id} className={styles.postCard}>
            <div className={styles.postHeader}>
              <div
                className={styles.avatarCircle}
                style={{ backgroundColor: post.avatar.color }}
                aria-hidden="true"
              >
                {post.avatar.emoji}
              </div>
              <div className={styles.postMeta}>
                <span className={styles.postNickname}>{post.nickname}</span>
                <span className={styles.postTime}>{formatTime(post.timestamp)}</span>
              </div>
            </div>
            <p className={styles.postText}>{post.text}</p>

            {/* リアクションボタン群 */}
            <div className={styles.postReactions}>
              {REACTIONS.map(r => {
                const count = post.reactions[r.value]
                const isMine = post.myReactions.includes(r.value)
                const isExpanded = expandedReaction?.postId === post.id && expandedReaction?.type === r.value

                return (
                  <div key={r.value} className={styles.reactionWrapper}>
                    <button
                      type="button"
                      className={`${styles.postReactionBtn} ${isMine ? styles.myReaction : ''}`}
                      onClick={() => handleReaction(post.id, r.value)}
                      aria-pressed={isMine}
                      aria-label={`${r.label}${count > 0 ? `（${count}件）` : ''}`}
                      title={r.label}
                    >
                      <span aria-hidden="true">{r.emoji}</span>
                      {count > 0 && <span className={styles.reactionCount}>{count}</span>}
                    </button>
                    {count > 0 && (
                      <button
                        type="button"
                        className={styles.groupToggle}
                        onClick={() => toggleReactionGroup(post.id, r.value)}
                        aria-expanded={isExpanded}
                        aria-label={`${r.label}をした人を表示`}
                      >
                        ▾
                      </button>
                    )}
                    {isExpanded && (
                      <div className={styles.reactionGroup} role="list" aria-label={`${r.label}をした人`}>
                        {post.reactionUsers[r.value].map(user => (
                          <div key={user.id} className={styles.reactionGroupUser} role="listitem">
                            <span
                              className={styles.reactionGroupAvatar}
                              style={{ backgroundColor: user.avatarColor }}
                              aria-hidden="true"
                            >
                              {user.avatarEmoji}
                            </span>
                            <span className={styles.reactionGroupName}>{user.nickname}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        ))}
      </section>

      {/* フッター */}
      <div className={styles.footer}>
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
