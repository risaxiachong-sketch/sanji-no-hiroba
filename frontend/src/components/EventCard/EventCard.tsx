import type { Event } from '../../types'
import { EVENT_STATUS_LABELS } from '../../types'
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

function getStatusStyle(status: Event['status']): string {
  switch (status) {
    case 'canceled':  return styles.statusCanceled
    case 'postponed': return styles.statusPostponed
    case 'closed':    return styles.statusClosed
    case 'ended':     return styles.statusEnded
    default:          return styles.statusScheduled
  }
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
      {/* イベント画像 */}
      {event.imageUrl && (
        <div className={styles.imageWrapper}>
          <img
            src={event.imageUrl}
            alt={`${event.title}のイメージ`}
            className={styles.image}
            loading="lazy"
          />
        </div>
      )}

      <div className={styles.topRow}>
        <h3 className={styles.title}>{event.title}</h3>
        <div className={styles.badgeGroup}>
          {event.status !== 'scheduled' && (
            <span className={`${styles.statusBadge} ${getStatusStyle(event.status)}`}>
              {EVENT_STATUS_LABELS[event.status]}
            </span>
          )}
          <span className={`${styles.priceBadge} ${event.price === 'free' ? styles.free : styles.paid}`}>
            {event.priceLabel}
          </span>
        </div>
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
