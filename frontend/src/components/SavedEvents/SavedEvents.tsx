import { EVENTS } from '../../data/events'
import { EventCard } from '../EventCard/EventCard'
import styles from './SavedEvents.module.css'

interface Props {
  savedIds: string[]
  onSelectEvent: (id: string) => void
  onBack: () => void
}

export function SavedEvents({ savedIds, onSelectEvent, onBack }: Props) {
  const saved = EVENTS.filter(ev => savedIds.includes(ev.id))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="広場に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>行ってみたい一覧</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        {saved.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">🔖</span>
            <p className={styles.emptyText}>まだ保存したイベントはありません</p>
            <p className={styles.emptyHint}>
              イベント詳細画面の「♡ 行ってみたい」ボタンから保存できます
            </p>
          </div>
        ) : (
          <>
            <p className={styles.count}>{saved.length}件保存中</p>
            {saved.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                onClick={() => onSelectEvent(ev.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
