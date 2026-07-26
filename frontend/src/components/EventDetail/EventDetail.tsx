import { EVENTS } from '../../data/events'
import { EVENT_STATUS_LABELS } from '../../types'
import type { Event } from '../../types'
import styles from './EventDetail.module.css'

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

interface Props {
  eventId: string
  isSaved: boolean
  onToggleSave: () => void
  onBack: () => void
}

export function EventDetail({ eventId, isSaved, onToggleSave, onBack }: Props) {
  const event = EVENTS.find(ev => ev.id === eventId)

  if (!event) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button type="button" className="btn-back" onClick={onBack}>← 戻る</button>
        </div>
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-sub)' }}>
          イベントが見つかりませんでした
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="前の画面に戻る">
          ← 戻る
        </button>
        <h1 className={styles.headerTitle}>イベント詳細</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        {/* イベント画像 */}
        {event.imageUrl && (
          <div className={styles.imageCard}>
            <img
              src={event.imageUrl}
              alt={`${event.title}のイメージ`}
              className={styles.eventImage}
              loading="lazy"
            />
          </div>
        )}

        {/* タイトル + ステータス */}
        <div className={styles.titleCard}>
          <div className={styles.titleRow}>
            <h2 className={styles.eventTitle}>{event.title}</h2>
            <span className={`${styles.statusBadge} ${getStatusStyle(event.status)}`}>
              {EVENT_STATUS_LABELS[event.status]}
            </span>
          </div>
          <span className={styles.facilityBadge}>{FACILITY_LABEL[event.facilityType]}</span>
        </div>

        {/* 基本情報 */}
        <div className={styles.infoCard}>
          <dl className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>📅 日時</dt>
              <dd className={styles.infoValue}>{event.date}（{event.time}）</dd>
            </div>
            <hr className={styles.divider} />
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>👶 対象</dt>
              <dd className={styles.infoValue}>{event.ageRange}</dd>
            </div>
            <hr className={styles.divider} />
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>📍 場所</dt>
              <dd className={styles.infoValue}>
                {event.location}<br />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-sub)' }}>
                  {event.address}
                </span>
              </dd>
            </div>
            <hr className={styles.divider} />
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>💴 料金</dt>
              <dd className={styles.infoValue}>{event.priceLabel}</dd>
            </div>
            <hr className={styles.divider} />
            <div className={styles.infoRow}>
              <dt className={styles.infoLabel}>📝 予約</dt>
              <dd className={styles.infoValue}>
                {event.reservationRequired ? '要予約' : '予約不要（当日参加OK）'}
              </dd>
            </div>
          </dl>
        </div>

        {/* 設備情報 */}
        <div className={styles.facilitiesCard}>
          <p className={styles.sectionTitle}>施設設備</p>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${event.nursingRoom ? styles.ok : styles.ng}`}>
              {event.nursingRoom ? '✓' : '✗'} 授乳室
            </span>
            <span className={`${styles.badge} ${event.diaperChange ? styles.ok : styles.ng}`}>
              {event.diaperChange ? '✓' : '✗'} おむつ交換台
            </span>
            <span className={`${styles.badge} ${event.strollerOk ? styles.ok : styles.ng}`}>
              {event.strollerOk ? '✓' : '✗'} ベビーカーOK
            </span>
            <span className={`${styles.badge} ${event.indoor ? styles.ok : styles.ng}`}>
              {event.indoor ? '✓' : '✗'} 屋内
            </span>
          </div>
        </div>

        {/* 説明 */}
        <p className={styles.descCard}>{event.description}</p>

        {/* 情報提供元 */}
        <div className={styles.sourceCard}>
          <div>情報提供元：{event.source}</div>
          <div>最終確認日：{event.lastConfirmed}</div>
          <div style={{ marginTop: 'var(--space-xs)' }}>
            <a
              href={event.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
              aria-label={`${event.title}の公式情報を見る（外部サイト）`}
            >
              🔗 公式情報を確認する ↗
            </a>
          </div>
          <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', color: '#aaa' }}>
            ※ 情報は変更される場合があります。参加前に公式情報をご確認ください。
          </div>
        </div>
      </div>

      {/* 行ってみたいボタン */}
      <footer className={styles.footer}>
        <button
          type="button"
          className={`${styles.saveBtn} ${isSaved ? styles.saved : styles.unsaved}`}
          onClick={onToggleSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? '「行ってみたい」を解除する' : '「行ってみたい」に保存する'}
        >
          {isSaved ? '✓ 保存済み（タップで解除）' : '♡ 行ってみたい'}
        </button>
      </footer>
    </div>
  )
}
