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
        <button type="button" className="btn-back" onClick={onBack} aria-label="設定に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>ニックネーム</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        <div className={styles.card}>
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
          <span className={styles.hint}>1〜20文字</span>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={!isValid || !isChanged}
          onClick={handleSave}
        >
          保存する
        </button>
      </div>
    </div>
  )
}
