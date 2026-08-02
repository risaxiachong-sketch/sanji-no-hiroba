import type { Page } from '../../types'
import bulletinBoardIcon from '../../assets/navigation/nav-bulletin-board.png'
import fountainIcon from '../../assets/navigation/nav-fountain.png'
import savedHeartIcon from '../../assets/navigation/nav-saved-heart.png'
import settingsGearIcon from '../../assets/navigation/nav-settings-gear.png'
import styles from './BottomNav.module.css'

/** The main sections reachable from the persistent bottom nav. */
export type BottomNavPage = 'plaza' | 'bulletinBoard' | 'savedEvents' | 'settings'

interface Props {
  active: BottomNavPage | null
  onNavigate: (page: Page) => void
}

const ITEMS: Array<{ page: BottomNavPage; icon: string; label: string; ariaLabel: string }> = [
  { page: 'plaza', icon: fountainIcon, label: 'ひろば', ariaLabel: 'ひろば' },
  { page: 'bulletinBoard', icon: bulletinBoardIcon, label: '掲示板', ariaLabel: 'まちの掲示板' },
  { page: 'savedEvents', icon: savedHeartIcon, label: '保存', ariaLabel: '保存イベント' },
  { page: 'settings', icon: settingsGearIcon, label: '設定', ariaLabel: '設定' },
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
          <span className={styles.navIcon} aria-hidden="true">
            <img src={item.icon} alt="" />
          </span>
          <span className={styles.navLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
