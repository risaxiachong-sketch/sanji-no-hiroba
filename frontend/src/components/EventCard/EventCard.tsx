import type { Event } from '../../types'
import styles from './EventCard.module.css'

interface Props {
  event: Event
  onClick: () => void
}

const FACILITY_LABEL: Record<string, string> = {
  'community-center': '公民館',
  'library':          '図書館',
  'museum':           '博物館・科学館',
  'childcare-center': '子育て支援施設',
  'other':            'その他',
}

export function EventCard({ event, onClick }: Props) {
  const tags: string[] = []
  if (!event.reservationRequired) tags.push('予約不要')
  if (event.indoor) tags.push('屋内')
  if (event.nursingRoom) tags.push('授乳室あり')
  if (event.strollerOk) tags.push('ベビーカーOK')

  return (
    <article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${event.title}の詳細を見る`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
    >
      <div className={styles.topRow}>
        <h3 className={styles.title}>{event.title}</h3>
        <span className={`${styles.priceBadge} ${event.price === 'free' ? styles.free : styles.paid}`}>
          {event.priceLabel}
        </span>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span aria-hidden="true">📅</span>
          {event.date} {event.time}
        </span>
        <span className={styles.metaItem}>
          <span aria-hidden="true">📍</span>
          {event.location}
        </span>
        <span className={styles.metaItem}>
          <span aria-hidden="true">👶</span>
          {event.ageRange}
        </span>
        <span className={styles.metaItem}>
          <span aria-hidden="true">🏛️</span>
          {FACILITY_LABEL[event.facilityType]}
        </span>
      </div>

      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
    </article>
  )
}
