import { useEffect, useRef, useState } from 'react'
import type { DummyUser, Post, ReactionOption, ReactionType } from '../../types'
import styles from './VisitorPostModal.module.css'

const REACTIONS: ReactionOption[] = [
  { value: 'wakaru', label: 'わかるよ', emoji: '🫶' },
  { value: 'otsukare', label: 'おつかれさま', emoji: '☕' },
  { value: 'kokoniiruyo', label: 'ここにいるよ', emoji: '🌿' },
  { value: 'watashimo', label: '私も同じ', emoji: '🙋' },
  { value: 'ouen', label: '応援してるよ', emoji: '📣' },
  { value: 'kyoumo', label: '今日もおつかれさま', emoji: '🌙' },
  { value: 'yokattane', label: 'よかったね', emoji: '🎉' },
  { value: 'hitoiki', label: 'ひと息ついてね', emoji: '🍀' },
]

function formatTime(value?: string) {
  if (!value) return ''
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return String(minutes) + '分前'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return String(hours) + '時間前'
  return String(Math.floor(hours / 24)) + '日前'
}

interface Props {
  visitor: DummyUser
  post: Post | null
  onClose: () => void
  onReact: (postId: string, type: ReactionType) => void
  onLoadReactionUsers: (postId: string, type: ReactionType) => Promise<void>
}

export function VisitorPostModal({ visitor, post, onClose, onReact, onLoadReactionUsers }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [expandedType, setExpandedType] = useState<ReactionType | null>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const close = () => {
    dialogRef.current?.close()
  }

  const toggleGroup = async (type: ReactionType) => {
    if (!post) return
    if (expandedType === type) {
      setExpandedType(null)
      return
    }
    setExpandedType(type)
    await onLoadReactionUsers(post.id, type)
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="visitor-post-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          close()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className={styles.content}>
        <button type="button" className={styles.closeButton} data-sfx="back" onClick={close} aria-label="閉じる">
          <span aria-hidden="true">×</span>
        </button>

        <div className={styles.userRow}>
          <span className={styles.avatarCircle} style={{ backgroundColor: visitor.avatar.color }} aria-hidden="true">
            {visitor.avatar.selectionImageUrl
              ? <img src={visitor.avatar.selectionImageUrl} alt="" className={styles.avatarImage} />
              : <span className={styles.avatarEmoji}>{visitor.avatar.emoji}</span>}
          </span>
          <div className={styles.userMeta}>
            <p className={styles.nickname} id="visitor-post-title">{post?.nickname ?? visitor.avatar.label}</p>
            {post && <p className={styles.time}>{formatTime(post.createdAt ?? post.timestamp)}</p>}
          </div>
        </div>

        {post ? (
          <>
            <p className={styles.text}>{post.text}</p>
            <div className={styles.reactions} aria-label="リアクション">
              {REACTIONS.map((reaction) => {
                const count = post.reactions[reaction.value]
                const isMine = post.myReactions.includes(reaction.value)
                const isExpanded = expandedType === reaction.value
                return (
                  <div key={reaction.value} className={styles.reactionWrapper}>
                    <button
                      type="button"
                      className={`${styles.reactionBtn} ${isMine ? styles.reactionBtnActive : ''}`}
                      data-sfx="select"
                      aria-pressed={isMine}
                      aria-label={reaction.label + (count ? `（${count}件）` : '')}
                      onClick={() => onReact(post.id, reaction.value)}
                    >
                      <span aria-hidden="true">{reaction.emoji}</span>
                      {count > 0 && <span className={styles.reactionCount}>{count}</span>}
                    </button>
                    {count > 0 && (
                      <button
                        type="button"
                        className={styles.groupToggle}
                        onClick={() => void toggleGroup(reaction.value)}
                        aria-expanded={isExpanded}
                        aria-label={`${reaction.label}をした人を表示`}
                      >
                        ▾
                      </button>
                    )}
                    {isExpanded && (
                      <div className={styles.reactionGroup} role="list" aria-label={`${reaction.label}をした人`}>
                        {post.reactionUsers[reaction.value].map((user) => (
                          <div key={user.id} className={styles.reactionGroupUser} role="listitem">
                            <span className={styles.reactionGroupAvatar} style={{ backgroundColor: user.avatarColor }} aria-hidden="true">{user.avatarEmoji}</span>
                            <span className={styles.reactionGroupName}>{user.nickname}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <p className={styles.text}>{visitor.message}</p>
            <p className={styles.emptyNote}>この人はまだつぶやいていません</p>
          </>
        )}
      </div>
    </dialog>
  )
}
