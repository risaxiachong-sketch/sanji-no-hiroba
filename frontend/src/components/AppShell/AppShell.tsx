import type { ReactNode } from 'react'
import type { Avatar, Page } from '../../types'
import { AGE_GROUPS } from '../../data/ageGroups'
import { useProfile } from '../../hooks/useProfile'
import { BottomNav } from '../BottomNav/BottomNav'
import { MuteButton } from '../MuteButton/MuteButton'
import styles from './AppShell.module.css'

interface Props {
  avatar: Avatar | null
  onNavigate: (page: Page) => void
  children: ReactNode
  showDesktopNav?: boolean
}

/** Shared desktop chrome. The existing page layouts remain the mobile source of truth. */
export function AppShell({ avatar, onNavigate, children, showDesktopNav = false }: Props) {
  const { profile } = useProfile()
  const ageLabel = AGE_GROUPS.find((group) => group.value === profile?.childAgeGroup)?.label
    ?? profile?.childAgeGroup
    ?? '年齢未設定'

  return (
    <div className={styles.shell}>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="プロフィールとショートカット">
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">✦</span>
            <span>さんじのひろば</span>
          </div>

          <section className={styles.profile} aria-label="現在のプロフィール">
            <div className={styles.avatarFrame} style={{ backgroundColor: avatar?.color ?? '#f8e1e4' }}>
              {avatar?.selectionImageUrl ? (
                <img src={avatar.selectionImageUrl} alt="" />
              ) : (
                <span aria-hidden="true">{avatar?.emoji ?? '🐏'}</span>
              )}
            </div>
            <p className={styles.profileEyebrow}>いまのあなた</p>
            <p className={styles.profileName}>{profile?.nickname || 'ニックネーム未設定'}</p>
            <p className={styles.profileMeta}>{ageLabel}</p>
          </section>

          <nav className={styles.shortcuts} aria-label="プロフィールショートカット">
            <button type="button" data-sfx="navigate" onClick={() => onNavigate('settings')}>
              <span aria-hidden="true">⚙</span>
              <span>プロフィールを整える</span>
            </button>
            <button type="button" data-sfx="navigate" onClick={() => onNavigate('plaza')}>
              <span aria-hidden="true">⌂</span>
              <span>ひろばへ戻る</span>
            </button>
          </nav>

          <p className={styles.sidebarNote}>子育ての途中に、ひとりじゃない時間を。</p>
        </aside>

        <main className={styles.content}>{children}</main>
        {showDesktopNav && (
          <div className={styles.desktopNav}>
            <BottomNav active={null} onNavigate={onNavigate} />
          </div>
        )}
      </div>
      <MuteButton />
    </div>
  )
}
