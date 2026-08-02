import { useState } from 'react'
import { AGE_GROUPS } from '../../data/ageGroups'
import { useSoundEffects } from '../../audio/SoundContext'
import { useProfile } from '../../hooks/useProfile'
import styles from './SettingsChildAge.module.css'

interface Props {
  onBack: () => void
}

export function SettingsChildAge({ onBack }: Props) {
  const { profile, saveProfile } = useProfile()
  const { play } = useSoundEffects()
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
      play('success')
      onBack()
    } catch {
      setError('保存できませんでした。もう一度お試しください。')
      play('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} data-sfx="back" onClick={onBack} aria-label="設定に戻る">
          <span aria-hidden="true">‹</span>
          <span>設定</span>
        </button>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>CHILD PROFILE</span>
          <h1 className={styles.title}>お子さんの年齢</h1>
          <p className={styles.subtitle}>近い年齢をひとつ選んでね</p>
        </div>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>
      <div className={styles.body}>
        <p className={styles.guide}>選んだ年齢に合わせて、イベントを見つけやすくします。</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <ul className={styles.list} role="group" aria-label="お子さんの年齢区分を選択">
          {AGE_GROUPS.map((group) => (
            <li key={group.value}>
              <button
                type="button"
                className={styles.optionRow}
                data-sfx="select"
                aria-pressed={profile?.childAgeGroup === group.value}
                disabled={isSaving}
                onClick={() => void handleSelect(group.value)}
              >
                <span className={styles.optionIcon} aria-hidden="true">☺</span>
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{group.label}</span>
                  <span className={styles.optionHint}>
                    {profile?.childAgeGroup === group.value ? '現在の設定' : 'この年齢にする'}
                  </span>
                </span>
                <span className={styles.check} aria-hidden="true">
                  {profile?.childAgeGroup === group.value ? '✓' : '›'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
