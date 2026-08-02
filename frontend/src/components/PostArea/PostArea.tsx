import { useEffect, useState } from 'react'
import type { Avatar, Page, Post, ReactionOption, ReactionType } from '../../types'
import { createPost, fetchPosts } from '../../api/posts'
import { addReaction, fetchReactionUsers, removeReaction } from '../../api/reactions'
import { useProfile } from '../../hooks/useProfile'
import { BottomNav } from '../BottomNav/BottomNav'
import styles from './PostArea.module.css'

const MAX_LENGTH = 60
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

function AvatarBadge({ avatar }: { avatar: Avatar }) {
  return (
    <span className={styles.avatarCircle} style={{ backgroundColor: avatar.color }} aria-hidden="true">
      {avatar.selectionImageUrl
        ? <img src={avatar.selectionImageUrl} alt="" className={styles.avatarImage} />
        : <span className={styles.avatarEmoji}>{avatar.emoji}</span>}
    </span>
  )
}

interface Props {
  avatar: Avatar
  onClose: () => void
  onNavigate: (page: Page) => void
}

export function PostArea({ avatar, onClose, onNavigate }: Props) {
  const { profile } = useProfile()
  const [text, setText] = useState('')
  const [posted, setPosted] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedReaction, setExpandedReaction] = useState<{ postId: string; type: ReactionType } | null>(null)

  const reloadPosts = async () => {
    const response = await fetchPosts()
    setPosts(response.posts)
  }

  useEffect(() => {
    reloadPosts().catch(() => setError('投稿を読み込めませんでした。'))
  }, [])

  const handlePost = async () => {
    if (!text.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      const post = await createPost(text.trim())
      setPosts((current) => [post, ...current])
      setText('')
      setPosted(true)
      setError(null)
      window.setTimeout(() => setPosted(false), 2500)
    } catch {
      setError('投稿できませんでした。入力内容はそのまま残しています。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReaction = async (postId: string, type: ReactionType) => {
    const target = posts.find((post) => post.id === postId)
    if (!target) return
    const wasMine = target.myReactions.includes(type)
    setPosts((current) => current.map((post) => {
      if (post.id !== postId) return post
      return {
        ...post,
        reactions: { ...post.reactions, [type]: Math.max(0, post.reactions[type] + (wasMine ? -1 : 1)) },
        myReactions: wasMine ? post.myReactions.filter((item) => item !== type) : [...post.myReactions, type],
      }
    }))
    try {
      if (wasMine) await removeReaction(postId, type)
      else await addReaction(postId, type)
      setError(null)
    } catch {
      await reloadPosts().catch(() => undefined)
      setError('リアクションを更新できませんでした。')
    }
  }

  const toggleReactionGroup = async (postId: string, type: ReactionType) => {
    if (expandedReaction?.postId === postId && expandedReaction.type === type) {
      setExpandedReaction(null)
      return
    }
    setExpandedReaction({ postId, type })
    try {
      const users = await fetchReactionUsers(postId, type)
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, reactionUsers: { ...post.reactionUsers, [type]: users } }
        : post))
    } catch {
      setError('リアクションした人を読み込めませんでした。')
    }
  }

  const formatTime = (value?: string) => {
    if (!value) return ''
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
    if (minutes < 1) return 'たった今'
    if (minutes < 60) return String(minutes) + '分前'
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return String(hours) + '時間前'
    return String(Math.floor(hours / 24)) + '日前'
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <button type="button" className={styles.backButton} onClick={onClose} aria-label="広場に戻る"><span aria-hidden="true">‹</span><span>ひろば</span></button>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Voice</p>
          <h1 className={styles.title}>つぶやく</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>小さな気持ちを、そっと置いていけます</p>
        </div>
        <span className={`${styles.heroCloud} ${styles.heroCloudOne}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerOne}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerTwo}`} aria-hidden="true" />
      </header>

      <main className={styles.body}>
        <section className={styles.card} aria-label="つぶやきを投稿">
          <div className={styles.userRow}>
            <AvatarBadge avatar={avatar} />
            <div><span className={styles.userLabel}>いまのあなた</span><span className={styles.userName}>{profile?.nickname ?? avatar.label}</span></div>
          </div>
          <textarea className={styles.textarea} value={text} maxLength={MAX_LENGTH} placeholder="今の気持ちを短く書いてみよう" aria-label="つぶやきを投稿" onChange={(event) => setText(event.target.value)} />
          <div className={`${styles.counter} ${text.length >= MAX_LENGTH ? styles.limit : ''}`}>{text.length} / {MAX_LENGTH}</div>
          <button type="button" className={styles.postButton} disabled={!text.trim() || isSubmitting} onClick={handlePost}>{isSubmitting ? '送信中…' : 'つぶやく'}</button>
          {posted && <p className={styles.sentMessage} role="status">🌸 つぶやきを送りました</p>}
        </section>

        {error
          ? <p className={styles.notice} role="alert">{error} <button type="button" onClick={() => reloadPosts().catch(() => undefined)}>再試行</button></p>
          : <p className={styles.notice}>投稿・リアクションは任意です。見るだけでも、いつでも広場に戻れます。</p>}

        <section className={styles.postList} aria-label="みんなのつぶやき">
          <h2 className={styles.sectionTitle}>みんなのつぶやき</h2>
          {posts.map((post) => (
            <article key={post.id} className={styles.postCard}>
              <div className={styles.postHeader}>
                <AvatarBadge avatar={post.avatar} />
                <div className={styles.postMeta}><span className={styles.postNickname}>{post.nickname}</span><span className={styles.postTime}>{formatTime(post.createdAt ?? post.timestamp)}</span></div>
              </div>
              <p className={styles.postText}>{post.text}</p>
              <div className={styles.postReactions}>
                {REACTIONS.map((reaction) => {
                  const count = post.reactions[reaction.value]
                  const isMine = post.myReactions.includes(reaction.value)
                  const isExpanded = expandedReaction?.postId === post.id && expandedReaction.type === reaction.value
                  return (
                    <div key={reaction.value} className={styles.reactionWrapper}>
                      <button type="button" className={`${styles.postReactionBtn} ${isMine ? styles.myReaction : ''}`} onClick={() => handleReaction(post.id, reaction.value)} aria-pressed={isMine} aria-label={reaction.label + (count ? '（' + count + '件）' : '')}>
                        <span aria-hidden="true">{reaction.emoji}</span>{count > 0 && <span className={styles.reactionCount}>{count}</span>}
                      </button>
                      {count > 0 && <button type="button" className={styles.groupToggle} onClick={() => toggleReactionGroup(post.id, reaction.value)} aria-expanded={isExpanded} aria-label={reaction.label + 'をした人を表示'}>▾</button>}
                      {isExpanded && (
                        <div className={styles.reactionGroup} role="list" aria-label={reaction.label + 'をした人'}>
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
            </article>
          ))}
        </section>

        <div className={styles.footer}><button type="button" className={styles.returnButton} onClick={onClose}>広場に戻る</button></div>
      </main>
      <BottomNav active={null} onNavigate={onNavigate} />
    </div>
  )
}
