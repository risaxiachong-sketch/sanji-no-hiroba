import { useState } from 'react'
import { useProfile } from '../../hooks/useProfile'
import styles from './SettingsNickname.module.css'

interface Props {
  onBack: () => void
}

export function SettingsNickname({ onBack }: Props) {
  const { profile, saveProfile } = useProfile()
  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const isValid = nickname.trim().length >= 1 && nickname.length <= 20
  const isChanged = nickname.trim() !== (profile?.nickname ?? '')

  const handleSave = async () => {
    if (!isValid || !profile) return
    setIsSaving(true)
    setError('')
    try {
      await saveProfile({ ...profile, nickname: nickname.trim() })
      onBack()
    } catch {
      setError('保存できませんでした。通信状況を確認して、もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="設定に戻る">← 戻る</button>
        <h1 className={styles.title}>ニックネーム</h1>
        <div style={{ width: '60px' }} />
      </header>
      <div className={styles.body}>
        <div className={styles.card}>
          <label className={styles.label} htmlFor="settings-nickname">ニックネーム</label>
          <input
            id="settings-nickname"
            type="text"
            className={styles.input}
            maxLength={20}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="ニックネームを入力"
            autoFocus
          />
          <span className={styles.hint}>1〜20文字</span>
          {error && <span className={styles.hint} role="alert">{error}</span>}
        </div>
        <button type="button" className="btn-primary" disabled={!isValid || !isChanged || isSaving} onClick={handleSave}>
          {isSaving ? '保存しています…' : '保存する'}
        </button>
      </div>
    </div>
  )
}