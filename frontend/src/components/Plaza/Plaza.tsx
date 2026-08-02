import { useEffect, useState } from 'react'
import type { Avatar, DummyUser, Page, Post } from '../../types'
import { fetchPosts } from '../../api/posts'
import { fetchRecentPlazaUsers } from '../../api/plaza'
import postStarButton from '../../assets/navigation/post-star-button.png'
import { BottomNav } from '../BottomNav/BottomNav'
import { Plaza2D } from '../Plaza2D/Plaza2D'
import styles from './Plaza.module.css'

interface Props {
  avatar: Avatar
  onNavigate: (page: Page) => void
}

export function Plaza({ avatar, onNavigate }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [visitors, setVisitors] = useState<DummyUser[]>([])

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

  return (
    <div className={styles.page}>
      <div className={styles.plazaScene}>
        <Plaza2D avatar={avatar} visitors={visitors} posts={posts} onOpenBulletinBoard={() => onNavigate('bulletinBoard')} />
      </div>

      <button type="button" className={styles.postButton} data-testid="plaza-post-button" aria-label="つぶやく" onClick={() => onNavigate('postArea')}>
        <span className={styles.postButtonVisual} aria-hidden="true">
          <img className={styles.postButtonArt} src={postStarButton} alt="" />
          <span className={styles.postButtonLabel}>つぶやく</span>
        </span>
      </button>

      <BottomNav active="plaza" onNavigate={onNavigate} />
    </div>
  )
}
