import { useEffect, useMemo, useState } from 'react'
import type { Avatar, DummyUser, Page, Post, ReactionType } from '../../types'
import { fetchPosts } from '../../api/posts'
import { fetchRecentPlazaUsers } from '../../api/plaza'
import { addReaction, removeReaction } from '../../api/reactions'
import { useSoundEffects } from '../../audio/SoundContext'
import postStarButton from '../../assets/navigation/post-star-button.png'
import { loadCachedProfile } from '../../hooks/useProfile'
import { BottomNav } from '../BottomNav/BottomNav'
import { Plaza2D } from '../Plaza2D/Plaza2D'
import styles from './Plaza.module.css'

interface Props {
  avatar: Avatar
  onNavigate: (page: Page) => void
}

function latestPostFor(posts: Post[], userId: string | null) {
  if (!userId) return null
  const matches = posts.filter((post) => post.userId === userId)
  if (matches.length === 0) return null
  return matches.reduce((latest, post) => {
    const latestTime = new Date(latest.createdAt ?? latest.timestamp ?? 0).getTime()
    const postTime = new Date(post.createdAt ?? post.timestamp ?? 0).getTime()
    return postTime > latestTime ? post : latest
  })
}

export function Plaza({ avatar, onNavigate }: Props) {
  const { play } = useSoundEffects()
  const currentUserId = loadCachedProfile()?.userId
  const [posts, setPosts] = useState<Post[]>([])
  const [visitors, setVisitors] = useState<DummyUser[]>([])
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null)

  const reloadPosts = async () => {
    const response = await fetchPosts()
    setPosts(response.posts)
  }

  const visibleVisitors = useMemo(() => {
    const visitorIds = new Set<string>()

    return visitors.filter((visitor) => {
      if (visitor.id === currentUserId || visitorIds.has(visitor.id)) {
        return false
      }
      visitorIds.add(visitor.id)
      return true
    })
  }, [currentUserId, visitors])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPosts(), fetchRecentPlazaUsers(7)])
      .then(([postResponse, recentUsers]) => {
        if (!cancelled) {
          setPosts(postResponse.posts)
          setVisitors(recentUsers)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPosts([])
          setVisitors([])
        }
      })
    return () => { cancelled = true }
  }, [])

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
    } catch {
      await reloadPosts().catch(() => undefined)
      play('error')
    }
  }

  const selectedPost = latestPostFor(posts, selectedVisitorId)

  return (
    <div className={styles.page}>
      <div className={styles.plazaScene}>
        <Plaza2D
          avatar={avatar}
          visitors={visibleVisitors}
          posts={posts}
          onOpenBulletinBoard={() => onNavigate('bulletinBoard')}
          onVisitorTap={(id) => setSelectedVisitorId((current) => (id === null || current === id ? null : id))}
          selectedVisitorId={selectedVisitorId}
          selectedPost={selectedPost}
          onReact={(postId, type) => void handleReaction(postId, type)}
        />
      </div>

      <button type="button" className={styles.postButton} data-sfx="navigate" data-testid="plaza-post-button" aria-label="つぶやく" onClick={() => onNavigate('postArea')}>
        <span className={styles.postButtonVisual} aria-hidden="true">
          <img className={styles.postButtonArt} src={postStarButton} alt="" />
          <span className={styles.postButtonLabel}>つぶやく</span>
        </span>
      </button>

      <BottomNav active="plaza" onNavigate={onNavigate} />
    </div>
  )
}
