import { useEffect, useState } from 'react'
import type { Avatar, Page, Post } from '../../types'
import { DUMMY_USERS } from '../../data/dummyUsers'
import { fetchPosts } from '../../api/posts'
import postStarButton from '../../assets/navigation/post-star-button.png'
import { BottomNav } from '../BottomNav/BottomNav'
import { Plaza2D } from '../Plaza2D/Plaza2D'
import styles from './Plaza.module.css'

interface Props {
  avatar: Avatar
  onNavigate: (page: Page) => void
  onExit: () => void
}

export function Plaza({ avatar, onNavigate, onExit }: Props) {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    let cancelled = false
    fetchPosts()
      .then((response) => {
        if (!cancelled) setPosts(response.posts)
      })
      .catch(() => {
        if (!cancelled) setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <h1 className={styles.topTitle}>さんじのひろば</h1>
        <button type="button" className={styles.exitBtn} onClick={onExit} aria-label="広場を退出する">
          <span aria-hidden="true">🚪</span>退出
        </button>
      </header>

      <div className={styles.plazaScene}>
        <Plaza2D
          avatar={avatar}
          visitors={DUMMY_USERS}
          posts={posts}
          onOpenBulletinBoard={() => onNavigate('bulletinBoard')}
        />
      </div>

      <button
        type="button"
        className={styles.postButton}
        data-testid="plaza-post-button"
        aria-label="つぶやく"
        onClick={() => onNavigate('postArea')}
      >
        <span className={styles.postButtonVisual} aria-hidden="true">
          <img className={styles.postButtonArt} src={postStarButton} alt="" />
          <span className={styles.postButtonLabel}>つぶやく</span>
        </span>
      </button>

      <BottomNav active="plaza" onNavigate={onNavigate} />
    </div>
  )
}
