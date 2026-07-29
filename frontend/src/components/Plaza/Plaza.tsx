import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Avatar, Page, Post } from '../../types'
import { DUMMY_USERS } from '../../data/dummyUsers'
import { fetchPosts } from '../../api/posts'
import { usePlazaJoin } from '../../hooks/usePlazaJoin'
import { Plaza3D } from '../Plaza3D/Plaza3D'
import type { BubblePosition, SpeechAssignment } from '../Plaza3D/PlazaSpeechBubbles3D'
import styles from './Plaza.module.css'

interface Props {
  avatar: Avatar
  onNavigate: (page: Page) => void
  onExit: () => void
}

/** At most this many posts get a speech bubble; keeps the overlay readable. */
const MAX_SPEECH_BUBBLES = 6

function hashStringToInt(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/**
 * Pins each post to a dummy crowd member so their message shows as a speech
 * bubble. The mapping is deterministic (hashed by post id), so a given post
 * always lands on the same visitor instead of jumping around on re-renders.
 */
function assignPostsToVisitors(posts: Post[], totalVisitors: number): SpeechAssignment[] {
  if (totalVisitors <= 0) return []
  const taken = new Set<number>()
  const assignments: SpeechAssignment[] = []

  for (const post of posts.slice(0, MAX_SPEECH_BUBBLES)) {
    if (assignments.length >= totalVisitors) break
    let index = hashStringToInt(post.id) % totalVisitors
    let attempts = 0
    while (taken.has(index) && attempts < totalVisitors) {
      index = (index + 1) % totalVisitors
      attempts += 1
    }
    if (taken.has(index)) continue
    taken.add(index)
    assignments.push({ visitorIndex: index, postId: post.id, text: post.text })
  }

  return assignments
}

export function Plaza({ avatar, onNavigate, onExit }: Props) {
  const totalCount = DUMMY_USERS.length + 1
  const { assignedCluster } = usePlazaJoin()
  const [posts, setPosts] = useState<Post[]>([])
  const [bubblePositions, setBubblePositions] = useState<BubblePosition[]>([])

  useEffect(() => {
    let cancelled = false
    fetchPosts().then((response) => {
      if (!cancelled) setPosts(response.posts)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const speechAssignments = useMemo(
    () => assignPostsToVisitors(posts, DUMMY_USERS.length),
    [posts],
  )

  const handleBubblePositionsChange = useCallback((positions: BubblePosition[]) => {
    setBubblePositions(positions)
  }, [])

  return (
    <div className={styles.page}>

      {/* トップバー */}
      <header className={styles.topBar}>
        <span className={styles.sunIcon} aria-hidden="true">☀️</span>
        <h1 className={styles.topTitle}>さんじのひろば</h1>
        <button type="button" className={styles.exitBtn} onClick={onExit} aria-label="広場を退出する">
          <span aria-hidden="true">🚪</span>退出
        </button>
      </header>

      {/* 在室バナー */}
      <div className={styles.presenceBanner} role="status" aria-live="polite">
        <span className={styles.presenceDot} aria-hidden="true" />
        <span>いま{totalCount}人がひろばで過ごしています</span>
      </div>

      {/* 広場シーン（3D） */}
      <div className={styles.plazaScene} role="region" aria-label="バーチャル広場">
        <Plaza3D
          assignedCluster={assignedCluster}
          viewMode="immersive"
          totalVisitors={DUMMY_USERS.length}
          speechAssignments={speechAssignments}
          onBubblePositionsChange={handleBubblePositionsChange}
        />

        {/* 投稿の吹き出し（3D空間から投影） */}
        <div className={styles.bubbleLayer} aria-hidden="true">
          {bubblePositions
            .filter((bubble) => bubble.visible)
            .map((bubble) => (
              <span
                key={bubble.postId}
                className={styles.speechBubble}
                style={{ left: `${bubble.xPct}%`, top: `${bubble.yPct}%` }}
              >
                {bubble.text}
              </span>
            ))}
        </div>

        {/* 施設カード */}
        <div className={styles.facilityColumn}>
          <button type="button" className={styles.facilityCard}
            onClick={() => onNavigate('bulletinBoard')} aria-label="まちの掲示板を開く">
            <span className={styles.facilityCardIcon} aria-hidden="true">📋</span>
            <span className={styles.facilityCardLabel}>まちの<br />掲示板</span>
          </button>
        </div>

        {/* あなたチップ */}
        <div className={styles.youChip} aria-label="あなたのアバター">
          <span className={styles.youChipAvatar} style={{ backgroundColor: avatar.color }} aria-hidden="true">
            {avatar.emoji}
          </span>
          <span className={styles.youChipLabel}>あなた</span>
        </div>
      </div>

      {/* ボトムナビ */}
      <nav className={styles.bottomNav} aria-label="メインナビゲーション">
        <button type="button" className={`${styles.navBtn} ${styles.navActive}`} aria-current="page" aria-label="ひろば">
          <span className={styles.navIcon} aria-hidden="true">🏠</span>
          <span className={styles.navLabel}>Hiroba</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('bulletinBoard')} aria-label="まちの掲示板">
          <span className={styles.navIcon} aria-hidden="true">📋</span>
          <span className={styles.navLabel}>Board</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('postArea')} aria-label="つぶやく">
          <span className={styles.navIcon} aria-hidden="true">💬</span>
          <span className={styles.navLabel}>Post</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('savedEvents')} aria-label="保存イベント">
          <span className={styles.navIcon} aria-hidden="true">🔖</span>
          <span className={styles.navLabel}>Saved</span>
        </button>
      </nav>
    </div>
  )
}
