import type { Avatar, Page } from '../../types'
import { AGE_GROUPS } from '../../data/ageGroups'
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
  const nickname = profile?.nickname || '未設定'
  const childAgeLabel = AGE_GROUPS.find(group => group.value === profile?.childAgeGroup)?.label
    ?? profile?.childAgeGroup
    ?? '未設定'

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="広場に戻る">
          <span aria-hidden="true">‹</span>
          <span>ひろば</span>
        </button>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Settings</p>
          <h1 className={styles.title}>設定</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>プロフィールを今の気分に合わせて整えます</p>
        </div>
        <span className={`${styles.heroFlower} ${styles.heroFlowerOne}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerTwo}`} aria-hidden="true" />
      </header>

      <main className={styles.body}>
        <section className={styles.profileCard} aria-label="現在のプロフィール">
          <div className={styles.avatarFrame} style={{ backgroundColor: avatar.color }}>
            {avatar.selectionImageUrl ? (
              <img src={avatar.selectionImageUrl} alt="" className={styles.avatarImage} aria-hidden="true" />
            ) : (
              <span className={styles.avatarEmoji} aria-hidden="true">{avatar.emoji}</span>
            )}
          </div>
          <div className={styles.profileText}>
            <p className={styles.profileLabel}>プロフィール</p>
            <h2 className={styles.profileName}>{nickname}</h2>
            <p className={styles.profileMeta}>{childAgeLabel} / {avatar.label}</p>
          </div>
        </section>

        <ul className={styles.menu}>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsNickname')}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <span className={styles.menuSymbol}>✎</span>
              </span>
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>ニックネーム</span>
                <span className={styles.menuValue}>{nickname}</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsChildAge')}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                <span className={styles.menuSymbol}>☺</span>
              </span>
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>お子さんの年齢</span>
                <span className={styles.menuValue}>{childAgeLabel}</span>
              </span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuRow}
              onClick={() => onNavigate('settingsAvatar')}
            >
              <span className={`${styles.menuIcon} ${styles.avatarIcon}`} style={{ backgroundColor: avatar.color }} aria-hidden="true">
                {avatar.selectionImageUrl ? (
                  <img src={avatar.selectionImageUrl} alt="" className={styles.menuAvatarImage} />
                ) : (
                  <span className={styles.menuSymbol}>{avatar.emoji}</span>
                )}
              </span>
              <span className={styles.menuText}>
                <span className={styles.menuLabel}>アバター</span>
                <span className={styles.menuValue}>
                  <span aria-hidden="true">{avatar.emoji}</span> {avatar.label}
                </span>
              </span>
              <span className={styles.chevron} aria-hidden="true">›</span>
            </button>
          </li>
        </ul>
      </main>

      <BottomNav active="settings" onNavigate={onNavigate} />
    </div>
  )
}
