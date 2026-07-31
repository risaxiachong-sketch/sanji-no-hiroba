import type { Page } from '../../types'
import styles from './BottomNav.module.css'

/** The main sections reachable from the persistent bottom nav. */
export type BottomNavPage = 'plaza' | 'bulletinBoard' | 'postArea' | 'savedEvents' | 'settings'

interface Props {
  active: BottomNavPage
  onNavigate: (page: Page) => void
}

const ITEMS: Array<{ page: BottomNavPage; icon: string; label: string; ariaLabel: string }> = [
  { page: 'plaza', icon: '🏠', label: 'Hiroba', ariaLabel: 'ひろば' },
  { page: 'bulletinBoard', icon: '📋', label: 'Board', ariaLabel: 'まちの掲示板' },
  { page: 'postArea', icon: '💬', label: 'Post', ariaLabel: 'つぶやく' },
  { page: 'savedEvents', icon: '🔖', label: 'Saved', ariaLabel: '保存イベント' },
  { page: 'settings', icon: '⚙️', label: 'Settings', ariaLabel: '設定' },
]

/** Fixed to the viewport bottom, so it stays visible while a page's own content scrolls. */
export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className={styles.bottomNav} aria-label="メインナビゲーション">
      {ITEMS.map((item) => (
        <button
          key={item.page}
          type="button"
          className={`${styles.navBtn} ${active === item.page ? styles.navActive : ''}`}
          aria-current={active === item.page ? 'page' : undefined}
          aria-label={item.ariaLabel}
          onClick={() => item.page !== active && onNavigate(item.page)}
        >
          <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
          <span className={styles.navLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
