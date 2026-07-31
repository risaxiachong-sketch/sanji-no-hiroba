import type { Avatar, Page } from '../../types'
import { useProfile } from '../../hooks/useProfile'
import { BottomNav } from '../BottomNav/BottomNav'
import styles from './Settings.module.css'

interface Props {
  avatar: Avatar
  onBack: () => void
  onNavigate: (page: Page) => void
}

/** Settings is a menu of editable fields; tapping a row opens its own editor screen. */
export function Settings({ avatar, onBack, onNavigate }: Props) {
  const { profile } = useProfile()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="広場に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>設定</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        <ul className={styles.menu}>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsNickname')}
            >
              <span className={styles.menuLabel}>ニックネーム</span>
              <span className={styles.menuValue}>{profile?.nickname || '未設定'}</span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsChildAge')}
            >
              <span className={styles.menuLabel}>お子さんの年齢</span>
              <span className={styles.menuValue}>{profile?.childAgeGroup || '未設定'}</span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsAvatar')}
            >
              <span className={styles.menuLabel}>アバター</span>
              <span className={styles.menuValue}>
                <span aria-hidden="true">{avatar.emoji}</span> {avatar.label}
              </span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </div>

      <BottomNav active="settings" onNavigate={onNavigate} />
    </div>
  )
}
