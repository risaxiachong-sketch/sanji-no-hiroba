import { useState } from 'react'
import type { Avatar } from '../../types'
import { AVATARS } from '../../data/avatars'
import styles from './AvatarPicker.module.css'

interface Props {
  initialAvatar?: Avatar | null
  onConfirm: (avatar: Avatar) => void
  onBack?: () => void
}

export function AvatarPicker({ initialAvatar, onConfirm, onBack }: Props) {
  const [selected, setSelected] = useState<Avatar>(initialAvatar ?? AVATARS[0])

  return (
    <main className={styles.page}>
      <span className={`${styles.sparkle} ${styles.sparkleOne}`} aria-hidden="true">✦</span>
      <span className={`${styles.sparkle} ${styles.sparkleTwo}`} aria-hidden="true">✧</span>
      <span className={`${styles.sparkle} ${styles.sparkleThree}`} aria-hidden="true">✦</span>

      <header className={styles.header}>
        {onBack ? (
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="前の画面に戻る">
            <span aria-hidden="true">←</span>
          </button>
        ) : (
          <span className={styles.headerSpacer} aria-hidden="true" />
        )}

        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>AVATAR CLOSET</span>
          <h1 className={styles.title}>どの子でひろばに行く？</h1>
        </div>

        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <section className={styles.stage} aria-label="選択中のアバター">
        <span className={styles.cloudLeft} aria-hidden="true" />
        <span className={styles.cloudRight} aria-hidden="true" />
        <span className={styles.heart} aria-hidden="true">♡</span>

        <div key={selected.id} className={styles.previewEntrance}>
          {selected.selectionImageUrl ? (
            <img
              className={styles.previewImage}
              src={selected.selectionImageUrl}
              alt=""
            />
          ) : (
            <span className={styles.previewFallback} aria-hidden="true">{selected.emoji}</span>
          )}
        </div>

        <span className={styles.visuallyHidden} aria-live="polite">
          {selected.label}を選択中
        </span>
      </section>

      <div className={styles.chooser}>
        <p className={styles.hint}>すきな子をタップしてね</p>
        <div className={styles.thumbnailRail} role="radiogroup" aria-label="アバター選択">
          {AVATARS.map((avatar) => {
            const isSelected = selected.id === avatar.id
            return (
              <button
                key={avatar.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${avatar.label}を選ぶ`}
                className={`${styles.thumbnailButton} ${isSelected ? styles.selected : ''}`}
                style={{ '--avatar-color': avatar.color } as React.CSSProperties}
                onClick={() => setSelected(avatar)}
              >
                {avatar.selectionImageUrl ? (
                  <img className={styles.thumbnailImage} src={avatar.selectionImageUrl} alt="" />
                ) : (
                  <span className={styles.thumbnailFallback} aria-hidden="true">{avatar.emoji}</span>
                )}
                {isSelected && <span className={styles.checkmark} aria-hidden="true">♥</span>}
              </button>
            )
          })}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" className={styles.confirmButton} onClick={() => onConfirm(selected)}>
          <span>この子にする</span>
          <span className={styles.confirmArrow} aria-hidden="true">→</span>
        </button>
      </footer>
    </main>
  )
}
