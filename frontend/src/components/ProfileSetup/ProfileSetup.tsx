import { useState } from 'react'
import { AGE_GROUPS } from '../../data/ageGroups'
import { useProfile } from '../../hooks/useProfile'
import styles from './ProfileSetup.module.css'

interface Props {
  onComplete: () => void
}

export function ProfileSetup({ onComplete }: Props) {
  const { saveProfile } = useProfile()
  const [nickname, setNickname] = useState('')
  const [childAgeGroup, setChildAgeGroup] = useState('')

  const isValid = nickname.trim().length >= 1 && nickname.length <= 20 && childAgeGroup !== ''

  const handleSubmit = () => {
    if (!isValid) return
    saveProfile({ nickname: nickname.trim(), childAgeGroup })
    onComplete()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>プロフィール登録</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="nickname">
            ニックネーム
          </label>
          <input
            id="nickname"
            type="text"
            className={styles.input}
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ニックネームを入力"
          />
          <span className={styles.hint}>1〜20文字</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="childAgeGroup">
            お子さんの年齢区分
          </label>
          <select
            id="childAgeGroup"
            className={styles.select}
            value={childAgeGroup}
            onChange={(e) => setChildAgeGroup(e.target.value)}
          >
            <option value="">選択してください</option>
            {AGE_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className="btn-primary"
            disabled={!isValid}
            onClick={handleSubmit}
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}
