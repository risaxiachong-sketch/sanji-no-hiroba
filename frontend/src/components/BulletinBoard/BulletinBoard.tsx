import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { Event as BoardEvent, FacilityType, FilterCondition, Page } from '../../types'
import { EVENT_STATUS_LABELS } from '../../types'
import { fetchEvents } from '../../api/events'
import boardAlpaca from '../../assets/bulletin-board/board-alpaca.png'
import { getEventImageUrl } from '../../data/eventImages'
import { BottomNav } from '../BottomNav/BottomNav'
import styles from './BulletinBoard.module.css'

interface Props {
  onSelectEvent: (id: string) => void
  onNavigate: (page: Page) => void
  isSaved: (id: string) => boolean
  onToggleSave: (id: string) => void
}

type BoardFilter = Omit<FilterCondition, 'childAge'> & {
  childAges?: number[]
}

const INITIAL_FILTER: BoardFilter = {
  childAges: [0, 1],
  price: 'free',
  indoor: true,
}

const AGE_OPTIONS = [
  { label: '0歳', value: 0 },
  { label: '1歳', value: 1 },
  { label: '2歳', value: 2 },
  { label: '3歳', value: 3 },
]

const FACILITY_OPTIONS: { label: string; value: FacilityType }[] = [
  { label: '公民館', value: 'community-center' },
  { label: '図書館', value: 'library' },
  { label: '博物館・科学館', value: 'museum' },
  { label: '子育て支援施設', value: 'childcare-center' },
]

const FACILITY_LABEL: Record<FacilityType, string> = {
  'community-center': '公民館',
  library: '図書館',
  museum: '博物館・科学館',
  'childcare-center': '子育て支援施設',
  other: 'その他',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type TagTone = 'free' | 'paid' | 'reservation' | 'indoor' | 'status'

function toLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayStr() {
  return toLocalDateString(new Date())
}

function tomorrowStr() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return toLocalDateString(date)
}

function hasConditionFilter(filter: BoardFilter) {
  return filter.price === 'free' || filter.indoor === true || filter.reservationRequired === false
}

function applyFilter(events: BoardEvent[], filter: BoardFilter) {
  return events.filter((event) => {
    if (filter.date === 'today' && event.date !== todayStr()) return false
    if (filter.date === 'tomorrow' && event.date !== tomorrowStr()) return false
    if (filter.childAges?.length) {
      const matchesAge = filter.childAges.some((age) => event.ageMin <= age && event.ageMax >= age)
      if (!matchesAge) return false
    }
    if (filter.price === 'free' && event.price !== 'free') return false
    if (filter.indoor === true && !event.indoor) return false
    if (filter.reservationRequired === false && event.reservationRequired) return false
    if (filter.facilityType && event.facilityType !== filter.facilityType) return false
    return true
  })
}

function formatEventDate(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return dateString

  const date = new Date(year, month - 1, day)
  return `${year}年${month}月${day}日（${WEEKDAYS[date.getDay()]}）`
}

function buildTags(event: BoardEvent): Array<{ label: string; tone: TagTone }> {
  const tags: Array<{ label: string; tone: TagTone }> = []

  if (event.status !== 'scheduled') {
    tags.push({ label: EVENT_STATUS_LABELS[event.status], tone: 'status' })
  }

  tags.push({ label: event.priceLabel, tone: event.price === 'free' ? 'free' : 'paid' })
  tags.push({ label: event.reservationRequired ? '要予約' : '予約不要', tone: 'reservation' })
  if (event.indoor) tags.push({ label: '屋内', tone: 'indoor' })

  return tags
}

function getDisplayImageUrl(event: BoardEvent, featured: boolean) {
  return featured ? getEventImageUrl({ ...event, id: 'ev-01' }) : getEventImageUrl(event)
}

interface BoardEventCardProps {
  event: BoardEvent
  featured: boolean
  saved: boolean
  onSelectEvent: (id: string) => void
  onToggleSave: (id: string) => void
}

function BoardEventCard({
  event,
  featured,
  saved,
  onSelectEvent,
  onToggleSave,
}: BoardEventCardProps) {
  const tags = buildTags(event)
  const imageUrl = getDisplayImageUrl(event, featured)

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectEvent(event.id)
    }
  }

  return (
    <article className={`${styles.eventCard} ${styles.featuredCard}`}>
      <div
        className={styles.cardAction}
        role="button"
        data-sfx="navigate"
        tabIndex={0}
        aria-label={`${event.title}の詳細を見る`}
        onClick={() => onSelectEvent(event.id)}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.eventImageFrame}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${event.title}のイメージ`}
              className={styles.eventImage}
              loading={featured ? 'eager' : 'lazy'}
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <span className={styles.placeholderFlag} />
              <span className={styles.placeholderTent} />
              <span className={styles.placeholderShelf} />
              <span className={styles.placeholderBallOne} />
              <span className={styles.placeholderBallTwo} />
              <span className={styles.placeholderMat} />
            </div>
          )}
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
        </div>
      </div>

      <button
        type="button"
        className={`${styles.saveButton} ${saved ? styles.saveButtonActive : ''}`}
        data-sfx={saved ? 'unsave' : 'save'}
        aria-label={saved ? `${event.title}の保存を解除する` : `${event.title}を保存する`}
        aria-pressed={saved}
        onClick={() => onToggleSave(event.id)}
      >
        <span className={styles.saveIcon} aria-hidden="true">{saved ? '♥' : '♡'}</span>
        <span className={styles.saveText}>{saved ? '保存済み' : '保存する'}</span>
      </button>
    </article>
  )
}

export function BulletinBoard({ onSelectEvent, onNavigate, isSaved, onToggleSave }: Props) {
  const [filter, setFilter] = useState<BoardFilter>(INITIAL_FILTER)
  const [events, setEvents] = useState<BoardEvent[]>([])
  const [loadError, setLoadError] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  const loadEvents = () => fetchEvents()
    .then((response) => { setEvents(response.events); setLoadError(false) })
    .catch(() => setLoadError(true))

  useEffect(() => { void loadEvents() }, [])

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const filtered = useMemo(() => applyFilter(events, filter), [events, filter])
  const conditionSelected = hasConditionFilter(filter)

  const toggleSingle = <K extends keyof BoardFilter>(key: K, value: BoardFilter[K]) => {
    setFilter((prev) => {
      const current = prev[key]
      const next = current === value ? undefined : value
      return { ...prev, [key]: next }
    })
  }

  const toggleAge = (age: number) => {
    setFilter((prev) => {
      const current = prev.childAges ?? []
      const next = current.includes(age)
        ? current.filter((selectedAge) => selectedAge !== age)
        : [...current, age].sort((a, b) => a - b)

      return { ...prev, childAges: next.length ? next : undefined }
    })
  }

  const clearField = (key: keyof BoardFilter) => {
    setFilter((prev) => ({ ...prev, [key]: undefined }))
  }

  const clearConditions = () => {
    setFilter((prev) => ({
      ...prev,
      price: undefined,
      indoor: undefined,
      reservationRequired: undefined,
    }))
  }

  const clearAll = () => setFilter({})

  return (
    <div className={styles.page} ref={pageRef}>
      <header className={styles.hero}>
        <span className={`${styles.heroCloud} ${styles.heroCloudOne}`} aria-hidden="true" />
        <span className={`${styles.heroCloud} ${styles.heroCloudTwo}`} aria-hidden="true" />
        <span className={`${styles.heroFlower} ${styles.heroFlowerOne}`} aria-hidden="true" />
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>まちの掲示板</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>地域のイベントや<br />子育て情報をみつけよう</p>
        </div>
        <img src={boardAlpaca} alt="" className={styles.alpacaImage} aria-hidden="true" />
      </header>

      <section className={styles.filterPanel} aria-label="イベントの絞り込み">
        <button
          type="button"
          className={styles.clearAllButton}
          aria-label="すべての選択を解除"
          onClick={clearAll}
        >
          <span aria-hidden="true">↻</span>
          <span>選択なし</span>
        </button>

        <div className={styles.filterRow}>
          <span className={`${styles.filterIcon} ${styles.filterIconDate}`} aria-hidden="true" />
          <span className={styles.filterTitle}>日程</span>
          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${styles.noneChip} ${!filter.date ? styles.active : ''}`}
              aria-pressed={!filter.date}
              onClick={() => clearField('date')}
            >
              選択なし
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter.date === 'today' ? styles.active : ''}`}
              aria-pressed={filter.date === 'today'}
              onClick={() => toggleSingle('date', 'today')}
            >
              今日
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter.date === 'tomorrow' ? styles.active : ''}`}
              aria-pressed={filter.date === 'tomorrow'}
              onClick={() => toggleSingle('date', 'tomorrow')}
            >
              明日
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={`${styles.filterIcon} ${styles.filterIconAge}`} aria-hidden="true" />
          <span className={styles.filterTitle}>対象年齢</span>
          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${styles.noneChip} ${!filter.childAges?.length ? styles.active : ''}`}
              aria-pressed={!filter.childAges?.length}
              onClick={() => clearField('childAges')}
            >
              選択なし
            </button>
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterChip} ${filter.childAges?.includes(option.value) ? styles.active : ''}`}
                aria-pressed={filter.childAges?.includes(option.value) ?? false}
                onClick={() => toggleAge(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={`${styles.filterIcon} ${styles.filterIconTag}`} aria-hidden="true" />
          <span className={styles.filterTitle}>条件</span>
          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${styles.noneChip} ${!conditionSelected ? styles.active : ''}`}
              aria-pressed={!conditionSelected}
              onClick={clearConditions}
            >
              選択なし
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter.price === 'free' ? styles.active : ''}`}
              aria-pressed={filter.price === 'free'}
              onClick={() => toggleSingle('price', 'free')}
            >
              無料
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter.indoor === true ? styles.active : ''}`}
              aria-pressed={filter.indoor === true}
              onClick={() => toggleSingle('indoor', true)}
            >
              屋内
            </button>
            <button
              type="button"
              className={`${styles.filterChip} ${filter.reservationRequired === false ? styles.active : ''}`}
              aria-pressed={filter.reservationRequired === false}
              onClick={() => toggleSingle('reservationRequired', false)}
            >
              予約不要
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={`${styles.filterIcon} ${styles.filterIconFacility}`} aria-hidden="true" />
          <span className={styles.filterTitle}>施設</span>
          <div className={styles.filterChips}>
            <button
              type="button"
              className={`${styles.filterChip} ${styles.noneChip} ${!filter.facilityType ? styles.active : ''}`}
              aria-pressed={!filter.facilityType}
              onClick={() => clearField('facilityType')}
            >
              選択なし
            </button>
            {FACILITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterChip} ${filter.facilityType === option.value ? styles.active : ''}`}
                aria-pressed={filter.facilityType === option.value}
                onClick={() => toggleSingle('facilityType', option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className={styles.list} aria-label="イベント一覧">
        {loadError && <div className={styles.empty} role="alert"><p>イベントを読み込めませんでした</p><button type="button" onClick={loadEvents}>再試行</button></div>}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">♡</span>
            <p className={styles.emptyText}>該当するイベントがありません</p>
            <p className={styles.emptyHint}>選択を少しゆるめると、参加しやすい予定が見つかるかもしれません。</p>
          </div>
        ) : (
          filtered.map((event, index) => (
            <BoardEventCard
              key={event.id}
              event={event}
              featured={index === 0}
              saved={isSaved(event.id)}
              onSelectEvent={onSelectEvent}
              onToggleSave={onToggleSave}
            />
          ))
        )}
      </main>

      <BottomNav active="bulletinBoard" onNavigate={onNavigate} />
    </div>
  )
}
