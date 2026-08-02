import { useEffect, useRef, useState } from 'react'
import { fetchEvent } from '../../api/events'
import { EVENT_STATUS_LABELS } from '../../types'
import type { Event, FacilityType } from '../../types'
import rhythmEventImage from '../../assets/bulletin-board/rhythm-event.png'
import {
  buildAppleCalendarIcs,
  buildGoogleCalendarUrl,
  createCalendarEventDraft,
  getCalendarFileName,
} from '../../utils/calendar'
import styles from './EventDetail.module.css'

const FACILITY_LABEL: Record<FacilityType, string> = {
  'community-center': '公民館',
  library: '図書館',
  museum: '博物館・科学館',
  'childcare-center': '子育て支援施設',
  other: 'その他',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type TagTone = 'free' | 'paid' | 'reservation' | 'indoor' | 'status'

function getStatusStyle(status: Event['status']): string {
  switch (status) {
    case 'canceled': return styles.statusCanceled
    case 'postponed': return styles.statusPostponed
    case 'closed': return styles.statusClosed
    case 'ended': return styles.statusEnded
    default: return styles.statusScheduled
  }
}

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

interface Props {
  eventId: string
  isSaved: boolean
  onToggleSave: () => void
  onBack: () => void
}

export function EventDetail({ eventId, isSaved, onToggleSave, onBack }: Props) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loadError, setLoadError] = useState(false)
  const calendarDialogRef = useRef<HTMLDialogElement>(null)
  const appleDownloadUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEvent(eventId)
      .then((value) => { if (!cancelled) { setEvent(value); setLoadError(false) } })
      .catch(() => { if (!cancelled) setLoadError(true) })
    return () => { cancelled = true }
  }, [eventId])

  useEffect(() => () => {
    if (appleDownloadUrlRef.current) {
      URL.revokeObjectURL(appleDownloadUrlRef.current)
    }
  }, [])

  if (!event) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className={styles.backButton} onClick={onBack}>戻る</button>
          <h1 className={styles.headerTitle}>イベント詳細</h1>
          <span className={styles.headerSpacer} />
        </header>
        <main className={styles.body}>
          <div className={styles.emptyCard}>
            <p>{loadError ? 'イベントを読み込めませんでした' : '読み込み中…'}</p>
          </div>
        </main>
      </div>
    )
  }

  const imageUrl = getDisplayImageUrl(event)
  const tags = buildTags(event)
  const calendarDraft = createCalendarEventDraft(event)
  const calendarHint = event.status !== 'scheduled'
    ? `${EVENT_STATUS_LABELS[event.status]}のイベントはカレンダーに追加できません。`
    : !calendarDraft
      ? '日時情報を確認できないため、カレンダーに追加できません。'
      : null
  const canAddToCalendar = calendarHint === null

  const closeCalendarDialog = () => {
    calendarDialogRef.current?.close()
  }

  const openCalendarDialog = () => {
    if (canAddToCalendar) {
      calendarDialogRef.current?.showModal()
    }
  }

  const addToGoogleCalendar = () => {
    if (!calendarDraft) return

    window.open(buildGoogleCalendarUrl(calendarDraft), '_blank', 'noopener,noreferrer')
    closeCalendarDialog()
  }

  const addToAppleCalendar = () => {
    if (!calendarDraft) return

    if (appleDownloadUrlRef.current) {
      URL.revokeObjectURL(appleDownloadUrlRef.current)
    }

    const file = new Blob([buildAppleCalendarIcs(calendarDraft)], { type: 'text/calendar;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(file)
    appleDownloadUrlRef.current = downloadUrl

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = getCalendarFileName(calendarDraft)
    document.body.append(link)
    link.click()
    link.remove()

    window.setTimeout(() => {
      if (appleDownloadUrlRef.current === downloadUrl) {
        URL.revokeObjectURL(downloadUrl)
        appleDownloadUrlRef.current = null
      }
    }, 1000)

    closeCalendarDialog()
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label="前の画面に戻る">
          <span aria-hidden="true">‹</span>
          <span>戻る</span>
        </button>
        <h1 className={styles.headerTitle}>イベント詳細</h1>
        <span className={styles.headerSpacer} />
      </header>

      <main className={styles.body}>
        <article className={styles.heroCard}>
          <div className={styles.imageFrame}>
            <img
              src={imageUrl}
              alt={`${event.title}のイメージ`}
              className={styles.eventImage}
              loading="eager"
            />
            <span className={`${styles.statusBadge} ${getStatusStyle(event.status)}`}>
              {EVENT_STATUS_LABELS[event.status]}
            </span>
          </div>

          <div className={styles.heroContent}>
            <h2 className={styles.eventTitle}>{event.title}</h2>
            <div className={styles.tagList} aria-label="イベント条件">
              {tags.map((tag) => (
                <span
                  key={`${tag.tone}-${tag.label}`}
                  className={`${styles.tag} ${styles[`tag-${tag.tone}`]}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </article>

        <section className={styles.infoCard} aria-label="基本情報">
          <dl className={styles.infoList}>
            <div className={styles.infoRow}>
              <dt>
                <span className={`${styles.infoIcon} ${styles.calendarIcon}`} aria-hidden="true" />
                <span className={styles.infoLabel}>日時</span>
              </dt>
              <dd>{formatEventDate(event.date)}<br />{event.time}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>
                <span className={`${styles.infoIcon} ${styles.pinIcon}`} aria-hidden="true" />
                <span className={styles.infoLabel}>場所</span>
              </dt>
              <dd>{event.location}<span className={styles.address}>{event.address}</span></dd>
            </div>
            <div className={styles.infoRow}>
              <dt>
                <span className={`${styles.infoIcon} ${styles.faceIcon}`} aria-hidden="true" />
                <span className={styles.infoLabel}>対象</span>
              </dt>
              <dd>{event.ageRange}の親子</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>
                <span className={`${styles.infoIcon} ${styles.buildingIcon}`} aria-hidden="true" />
                <span className={styles.infoLabel}>施設</span>
              </dt>
              <dd>{FACILITY_LABEL[event.facilityType]}</dd>
            </div>
            <div className={styles.infoRow}>
              <dt>
                <span className={`${styles.infoIcon} ${styles.ticketIcon}`} aria-hidden="true" />
                <span className={styles.infoLabel}>参加</span>
              </dt>
              <dd>{event.priceLabel}・{event.reservationRequired ? '要予約' : '予約不要'}</dd>
            </div>
          </dl>
          <div className={styles.calendarAction}>
            <button
              type="button"
              className={styles.calendarBtn}
              onClick={openCalendarDialog}
              disabled={!canAddToCalendar}
              aria-describedby={calendarHint ? 'calendar-hint' : undefined}
            >
              <span className={styles.calendarButtonIcon} aria-hidden="true" />
              <span>カレンダーに追加</span>
            </button>
            {calendarHint && <p className={styles.calendarHint} id="calendar-hint">{calendarHint}</p>}
          </div>
        </section>

        <section className={styles.detailGroup} aria-label="イベント詳細情報">
          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>施設設備</h3>
            <div className={styles.facilityList}>
              <span className={`${styles.facilityChip} ${event.nursingRoom ? styles.ok : styles.ng}`}>
                授乳室
              </span>
              <span className={`${styles.facilityChip} ${event.diaperChange ? styles.ok : styles.ng}`}>
                おむつ交換台
              </span>
              <span className={`${styles.facilityChip} ${event.strollerOk ? styles.ok : styles.ng}`}>
                ベビーカーOK
              </span>
              <span className={`${styles.facilityChip} ${event.indoor ? styles.ok : styles.ng}`}>
                屋内
              </span>
            </div>
          </div>

          <div className={styles.detailSection}>
            <h3 className={styles.sectionTitle}>イベント内容</h3>
            <p className={styles.description}>{event.description}</p>
          </div>

          <div className={`${styles.detailSection} ${styles.sourceSection}`}>
            <h3 className={styles.sectionTitle}>確認先</h3>
            <p>情報提供元：{event.source}</p>
            <p>最終確認日：{formatEventDate(event.lastConfirmed)}</p>
            <a
              href={event.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
              aria-label={`${event.title}の公式情報を見る（外部サイト）`}
            >
              <span className={styles.sourceText}>公式情報を確認する</span>
              <span className={styles.sourceArrow} aria-hidden="true">↗</span>
            </a>
            <p className={styles.note}>
              <span className={styles.noteSentence}>情報は変更される場合があります。</span>{' '}
              <span className={styles.noteSentence}>参加前に公式情報をご確認ください。</span>
            </p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <button
          type="button"
          className={`${styles.saveBtn} ${isSaved ? styles.saved : styles.unsaved}`}
          onClick={onToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? '保存を解除する' : 'イベントを保存する'}
        >
          <span className={styles.saveIcon} aria-hidden="true">{isSaved ? '♥' : '♡'}</span>
          <span>{isSaved ? '保存済み' : '保存する'}</span>
        </button>
      </footer>

      <dialog
        ref={calendarDialogRef}
        className={styles.calendarDialog}
        aria-labelledby="calendar-dialog-title"
        onCancel={(event) => {
          event.preventDefault()
          closeCalendarDialog()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCalendarDialog()
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeCalendarDialog()
        }}
      >
        <div className={styles.calendarDialogContent}>
          <button
            type="button"
            className={styles.dialogCloseButton}
            onClick={closeCalendarDialog}
            aria-label="カレンダー選択を閉じる"
          >
            <span aria-hidden="true">×</span>
          </button>
          <span className={styles.dialogIcon} aria-hidden="true" />
          <h2 className={styles.dialogTitle} id="calendar-dialog-title">カレンダーに追加</h2>
          <p className={styles.dialogDescription}>
            追加先を選ぶと、予定が入力済みの登録画面を開きます。最後の追加はカレンダー側で確定してください。
          </p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.googleButton} onClick={addToGoogleCalendar} autoFocus>
              Google カレンダーに追加
              <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className={styles.appleButton} onClick={addToAppleCalendar}>
              Apple カレンダーに追加
              <span aria-hidden="true">↓</span>
            </button>
          </div>
          <button type="button" className={styles.dialogCancelButton} onClick={closeCalendarDialog}>
            キャンセル
          </button>
        </div>
      </dialog>
    </div>
  )
}
