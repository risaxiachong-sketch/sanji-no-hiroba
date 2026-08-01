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
  const [isAgeMenuOpen, setIsAgeMenuOpen] = useState(false)

  const isValid = nickname.trim().length >= 1 && nickname.length <= 20 && childAgeGroup !== ''
  const selectedAgeLabel = AGE_GROUPS.find((group) => group.value === childAgeGroup)?.label ?? '選択してください'

  const handleSubmit = () => {
    if (!isValid) return
    saveProfile({ nickname: nickname.trim(), childAgeGroup })
    onComplete()
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Welcome</p>
          <h1 className={styles.title}>はじめまして</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>広場で使うおなまえを教えてください</p>
        </div>
        <span className={`${styles.heroCloud} ${styles.heroCloudOne}`} aria-hidden="true" />
        <span className={`${styles.heroCloud} ${styles.heroCloudTwo}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerOne}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerTwo}`} aria-hidden="true" />
      </header>

      <form className={styles.card} onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="nickname">
              ニックネーム
            </label>
          </div>
          <div className={styles.inputShell}>
            <input
              id="nickname"
              type="text"
              className={styles.input}
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例: もこママ"
            />
          </div>
          <span className={styles.hint}>広場で表示される名前です。1〜20文字で入力してください。</span>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="childAgeGroup">
              お子さんの年齢
            </label>
          </div>
          <div
            className={`${styles.selectShell} ${isAgeMenuOpen ? styles.selectShellOpen : ''}`}
            onBlur={(e) => {
              const nextFocus = e.relatedTarget
              if (!(nextFocus instanceof Node) || !e.currentTarget.contains(nextFocus)) {
                setIsAgeMenuOpen(false)
              }
            }}
          >
            <button
              id="childAgeGroup"
              type="button"
              className={`${styles.selectButton} ${childAgeGroup === '' ? styles.selectButtonPlaceholder : ''}`}
              aria-haspopup="listbox"
              aria-expanded={isAgeMenuOpen}
              onClick={() => setIsAgeMenuOpen((current) => !current)}
            >
              <span>{selectedAgeLabel}</span>
              <span className={styles.selectChevron} aria-hidden="true" />
            </button>

            {isAgeMenuOpen && (
              <div className={styles.optionPanel} role="listbox" aria-labelledby="childAgeGroup">
                <button
                  type="button"
                  className={`${styles.optionButton} ${childAgeGroup === '' ? styles.optionSelected : ''}`}
                  role="option"
                  aria-selected={childAgeGroup === ''}
                  onClick={() => {
                    setChildAgeGroup('')
                    setIsAgeMenuOpen(false)
                  }}
                >
                  選択してください
                </button>
                {AGE_GROUPS.map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    className={`${styles.optionButton} ${childAgeGroup === group.value ? styles.optionSelected : ''}`}
                    role="option"
                    aria-selected={childAgeGroup === group.value}
                    onClick={() => {
                      setChildAgeGroup(group.value)
                      setIsAgeMenuOpen(false)
                    }}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.nextButton}
            disabled={!isValid}
          >
            次へ
          </button>
        </div>
      </form>
    </div>
  )
}
