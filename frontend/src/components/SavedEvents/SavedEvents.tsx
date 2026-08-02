import { useEffect, useState } from 'react'
import type { Event, FacilityType, Page } from '../../types'
import { EVENT_STATUS_LABELS } from '../../types'
import { fetchEvents } from '../../api/events'
import rhythmEventImage from '../../assets/bulletin-board/rhythm-event.png'
import { BottomNav } from '../BottomNav/BottomNav'
import styles from './SavedEvents.module.css'

interface Props {
  savedIds: string[]
  onSelectEvent: (id: string) => void
  onBack: () => void
  onNavigate: (page: Page) => void
}

const FACILITY_LABEL: Record<FacilityType, string> = {
  'community-center': '公民館',
  library: '図書館',
  museum: '博物館・科学館',
  'childcare-center': '子育て支援施設',
  other: 'その他',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type TagTone = 'free' | 'paid' | 'reservation' | 'indoor' | 'status'

function formatEventDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return dateString

  const date = new Date(year, month - 1, day)
  return `${year}年${month}月${day}日（${WEEKDAYS[date.getDay()]}）`
}

function getDisplayImageUrl(event: Event) {
  if (event.imageUrl && !event.imageUrl.includes('placehold.co')) return event.imageUrl
  return rhythmEventImage
}

function getLeadTimeLabel(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return null

  const eventDate = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eventDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return null
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  return `あと${diffDays}日`
}

function buildTags(event: Event): Array<{ label: string; tone: TagTone }> {
  const tags: Array<{ label: string; tone: TagTone }> = []

  if (event.status !== 'scheduled') {
    tags.push({ label: EVENT_STATUS_LABELS[event.status], tone: 'status' })
  }

  tags.push({ label: event.priceLabel, tone: event.price === 'free' ? 'free' : 'paid' })
  tags.push({ label: event.reservationRequired ? '要予約' : '予約不要', tone: 'reservation' })
  if (event.indoor) tags.push({ label: '屋内', tone: 'indoor' })

  return tags
}

interface SavedEventCardProps {
  event: Event
  onSelectEvent: (id: string) => void
}

function SavedEventCard({ event, onSelectEvent }: SavedEventCardProps) {
  const imageUrl = getDisplayImageUrl(event)
  const tags = buildTags(event)
  const badgeLabel = event.status === 'scheduled'
    ? getLeadTimeLabel(event.date)
    : EVENT_STATUS_LABELS[event.status]

  return (
    <article className={styles.eventCard}>
      <button
        type="button"
        className={styles.cardButton}
        onClick={() => onSelectEvent(event.id)}
        aria-label={`${event.title}の詳細を見る`}
      >
        <div className={styles.eventImageFrame}>
          <img
            src={imageUrl}
            alt={`${event.title}のイメージ`}
            className={styles.eventImage}
            loading="lazy"
          />
          {badgeLabel && <span className={styles.dateBadge}>{badgeLabel}</span>}
        </div>

        <div className={styles.eventContent}>
          <h2 className={styles.eventTitle}>{event.title}</h2>
          <dl className={styles.eventMeta}>
            <div className={styles.metaRow}>
              <dt>
                <span className={`${styles.metaIcon} ${styles.calendarIcon}`} aria-hidden="true" />
                <span className={styles.srOnly}>日程</span>
              </dt>
              <dd>{formatEventDate(event.date)} {event.time}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <span className={`${styles.metaIcon} ${styles.pinIcon}`} aria-hidden="true" />
                <span className={styles.srOnly}>場所</span>
              </dt>
              <dd>{event.location}</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <span className={`${styles.metaIcon} ${styles.faceIcon}`} aria-hidden="true" />
                <span className={styles.srOnly}>対象年齢</span>
              </dt>
              <dd>{event.ageRange}の親子</dd>
            </div>
            <div className={styles.metaRow}>
              <dt>
                <span className={`${styles.metaIcon} ${styles.buildingIcon}`} aria-hidden="true" />
                <span className={styles.srOnly}>施設</span>
              </dt>
              <dd>{FACILITY_LABEL[event.facilityType]}</dd>
            </div>
          </dl>

          <div className={styles.eventTags} aria-label="イベント条件">
            {tags.map((tag) => (
              <span
                key={`${tag.tone}-${tag.label}`}
                className={`${styles.eventTag} ${styles[`tag-${tag.tone}`]}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <span className={styles.savedMark} aria-hidden="true">
            <span className={styles.savedHeart}>♥</span>
            <span className={styles.savedText}>保存中</span>
          </span>
        </div>
      </button>
    </article>
  )
}

export function SavedEvents({ savedIds, onSelectEvent, onBack, onNavigate }: Props) {
  const [saved, setSaved] = useState<Event[]>([])

  useEffect(() => {
    let cancelled = false
    fetchEvents(savedIds).then((response) => { if (!cancelled) setSaved(response.events) }).catch(() => { if (!cancelled) setSaved([]) })
    return () => { cancelled = true }
  }, [savedIds])

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>My list</p>
          <h1 className={styles.title}>行ってみたい一覧</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>気になるイベントを、あとからゆっくり見返せます</p>
        </div>
        <span className={styles.heroHeart} aria-hidden="true">♡</span>
        <span className={`${styles.heroFlower} ${styles.heroFlowerOne}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerTwo}`} aria-hidden="true" />
      </header>

      <main className={styles.body}>
        {saved.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">♡</span>
            <h2 className={styles.emptyText}>まだ保存したイベントはありません</h2>
            <p className={styles.emptyHint}>
              気になるイベントのハートを押すと、ここに集まります。
            </p>
          </div>
        ) : (
          <>
            <div className={styles.summaryCard}>
              <span className={styles.summaryIcon} aria-hidden="true">♡</span>
              <div>
                <p className={styles.summaryLabel}>保存中のイベント</p>
                <p className={styles.count}>{saved.length}件</p>
              </div>
            </div>
            <div className={styles.eventGrid}>
              {saved.map(ev => (
                <SavedEventCard
                  key={ev.id}
                  event={ev}
                  onSelectEvent={onSelectEvent}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav active="savedEvents" onNavigate={onNavigate} />
    </div>
  )
}
