import { useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import styles from './SettingsNickname.module.css'

interface Props {
  onBack: () => void
}

export function SettingsNickname({ onBack }: Props) {
  const { profile, saveProfile } = useProfile()
  const [nickname, setNickname] = useState(profile?.nickname ?? '')

  const isValid = nickname.trim().length >= 1 && nickname.length <= 20
  const isChanged = nickname.trim() !== (profile?.nickname ?? '')

  const handleSave = () => {
    if (!isValid) return
    saveProfile({ nickname: nickname.trim(), childAgeGroup: profile?.childAgeGroup ?? '' })
    onBack()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="設定に戻る">
          <span aria-hidden="true">‹</span>
          <span>設定</span>
        </button>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>PROFILE</span>
          <h1 className={styles.title}>ニックネーム</h1>
          <p className={styles.subtitle}>ひろばで呼ばれる名前を決めよう</p>
        </div>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
          <div className={styles.cardHeading}>
            <span className={styles.cardIcon} aria-hidden="true">✎</span>
            <div>
              <p className={styles.cardTitle}>呼ばれたい名前</p>
              <p className={styles.cardDescription}>本名でなくても大丈夫です</p>
            </div>
          </div>
          <label className={styles.label} htmlFor="settings-nickname">
            ニックネーム
          </label>
          <input
            id="settings-nickname"
            type="text"
            className={styles.input}
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ニックネームを入力"
            autoFocus
          />
          <span className={styles.hint}>{nickname.length} / 20文字</span>
        </div>

        <button
          type="button"
          className={styles.saveButton}
          disabled={!isValid || !isChanged}
          onClick={handleSave}
        >
          保存する
        </button>
      </div>
    </div>
  )
}
