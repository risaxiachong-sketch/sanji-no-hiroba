import { useMemo } from 'react'
import styles from './ExitResult.module.css'

interface Props {
  onRestart: () => void
  onHome: () => void
}

export function ExitResult({ onRestart, onHome }: Props) {
  // 3〜8のランダム整数（マウント時に1回だけ生成）
  const count = useMemo(
    () => Math.floor(Math.random() * 6) + 3,
    []
  )

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* 花吹雪アイコン */}
        <div className={styles.iconArea} aria-hidden="true">
          <span className={styles.bigIcon}>🌸</span>
          <span className={styles.floatIcon} style={{ top: '-10px', left: '10%' }}>✨</span>
          <span className={styles.floatIcon} style={{ top: '0px',  right: '15%' }}>🌼</span>
          <span className={styles.floatIcon} style={{ bottom: '0', left: '20%' }}>💫</span>
        </div>

        <h1 className={styles.title}>おつかれさまでした</h1>

        {/* すれ違い表示 */}
        <div className={styles.encounterBox}>
          <p className={styles.encounterLabel}>今日のすれ違い</p>
          <p className={styles.encounterCount} aria-label={`今日${count}人とすれ違いました`}>
            <span className={styles.countNumber}>{count}</span>
            <span className={styles.countUnit}>人</span>
          </p>
          <p className={styles.encounterMessage}>
            今日はここで、{count}人の保護者とすれ違いました。<br />
            ひとりじゃなかった、少しの時間。
          </p>
        </div>

        {/* プライバシー注記 */}
        <p className={styles.privacyNote}>
          ※ 相手の個人情報は一切表示・記録されません
        </p>

        {/* アクション */}
        <div className={styles.actions}>
          <button
            type="button"
            className="btn-primary"
            onClick={onRestart}
          >
            もう一度ひろばへ
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onHome}
          >
            トップに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
