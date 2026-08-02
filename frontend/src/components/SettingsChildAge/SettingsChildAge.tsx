import { useState } from 'react'
import { AGE_GROUPS } from '../../data/ageGroups'
import { useProfile } from '../../hooks/useProfile'
import styles from './SettingsChildAge.module.css'

interface Props {
  onBack: () => void
}

export function SettingsChildAge({ onBack }: Props) {
  const { profile, saveProfile } = useProfile()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async (childAgeGroup: string) => {
    if (!profile || isSaving) return
    if (childAgeGroup === profile.childAgeGroup) {
      onBack()
      return
    }
    setIsSaving(true)
    setError('')
    try {
      await saveProfile({ ...profile, childAgeGroup })
      onBack()
    } catch {
      setError('保存できませんでした。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="設定に戻る">← 戻る</button>
        <h1 className={styles.title}>お子さんの年齢</h1>
        <div style={{ width: '60px' }} />
      </header>
      <div className={styles.body}>
        {error && <p role="alert">{error}</p>}
        <ul className={styles.list} role="group" aria-label="お子さんの年齢区分を選択">
          {AGE_GROUPS.map((group) => (
            <li key={group.value}>
              <button
                type="button"
                className={styles.optionRow}
                aria-pressed={profile?.childAgeGroup === group.value}
                disabled={isSaving}
                onClick={() => void handleSelect(group.value)}
              >
                <span className={styles.optionLabel}>{group.label}</span>
                {profile?.childAgeGroup === group.value && <span className={styles.check} aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}