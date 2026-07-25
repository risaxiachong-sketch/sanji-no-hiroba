import { useState, useMemo } from 'react'
import type { FacilityType, FilterCondition } from '../../types'
import { EVENTS } from '../../data/events'
import { EventCard } from '../EventCard/EventCard'
import { AiSearch } from '../AiSearch/AiSearch'
import styles from './BulletinBoard.module.css'

type Tab = 'list' | 'ai'

interface Props {
  onSelectEvent: (id: string) => void
  onBack: () => void
}

// 今日・明日の日付文字列
function todayStr()    { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

const AGE_OPTIONS = [
  { label: '0歳', value: 0 },
  { label: '1歳', value: 1 },
  { label: '2歳', value: 2 },
  { label: '3歳', value: 3 },
]

const FACILITY_OPTIONS: { label: string; value: FacilityType }[] = [
  { label: '公民館',         value: 'community-center' },
  { label: '図書館',         value: 'library' },
  { label: '博物館・科学館', value: 'museum' },
  { label: '子育て支援施設', value: 'childcare-center' },
]

function applyFilter(filter: FilterCondition) {
  return EVENTS.filter(ev => {
    if (filter.date === 'today'    && ev.date !== todayStr())    return false
    if (filter.date === 'tomorrow' && ev.date !== tomorrowStr()) return false
    if (filter.childAge !== null && filter.childAge !== undefined) {
      if (ev.ageMin > filter.childAge || ev.ageMax < filter.childAge) return false
    }
    if (filter.price === 'free' && ev.price !== 'free') return false
    if (filter.indoor === true  && !ev.indoor) return false
    if (filter.reservationRequired === false && ev.reservationRequired) return false
    if (filter.facilityType && ev.facilityType !== filter.facilityType) return false
    return true
  })
}

export function BulletinBoard({ onSelectEvent, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('list')
  const [filter, setFilter] = useState<FilterCondition>({})

  const filtered = useMemo(() => applyFilter(filter), [filter])

  const toggle = (key: keyof FilterCondition, value: FilterCondition[typeof key]) => {
    setFilter(prev => {
      const current = prev[key]
      return { ...prev, [key]: current === value ? null : value }
    })
  }

  const clearAll = () => setFilter({})

  const hasFilter = Object.values(filter).some(v => v !== null && v !== undefined)

  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button type="button" className="btn-back" onClick={onBack} aria-label="広場に戻る">
            ← 戻る
          </button>
          <h1 className={styles.title}>まちの掲示板</h1>
          <div style={{ width: '60px' }} />
        </div>

        {/* タブ */}
        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            type="button"
            className={`${styles.tab} ${tab === 'list' ? styles.active : ''}`}
            aria-selected={tab === 'list'}
            onClick={() => setTab('list')}
          >
            📋 イベント一覧
          </button>
          <button
            role="tab"
            type="button"
            className={`${styles.tab} ${tab === 'ai' ? styles.active : ''}`}
            aria-selected={tab === 'ai'}
            onClick={() => setTab('ai')}
          >
            ✨ AI検索
          </button>
        </div>
      </header>

      {tab === 'list' && (
        <>
          {/* フィルターパネル */}
          <div className={styles.filterPanel}>
            <div className={styles.filterGroup}>
              <span className={styles.filterTitle}>日程</span>
              <button
                type="button"
                className={`${styles.filterChip} ${filter.date === 'today' ? styles.active : ''}`}
                aria-pressed={filter.date === 'today'}
                onClick={() => toggle('date', 'today')}
              >今日</button>
              <button
                type="button"
                className={`${styles.filterChip} ${filter.date === 'tomorrow' ? styles.active : ''}`}
                aria-pressed={filter.date === 'tomorrow'}
                onClick={() => toggle('date', 'tomorrow')}
              >明日</button>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterTitle}>対象年齢</span>
              {AGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.filterChip} ${filter.childAge === opt.value ? styles.active : ''}`}
                  aria-pressed={filter.childAge === opt.value}
                  onClick={() => toggle('childAge', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterTitle}>条件</span>
              <button
                type="button"
                className={`${styles.filterChip} ${filter.price === 'free' ? styles.active : ''}`}
                aria-pressed={filter.price === 'free'}
                onClick={() => toggle('price', 'free')}
              >無料</button>
              <button
                type="button"
                className={`${styles.filterChip} ${filter.indoor === true ? styles.active : ''}`}
                aria-pressed={filter.indoor === true}
                onClick={() => toggle('indoor', true)}
              >屋内</button>
              <button
                type="button"
                className={`${styles.filterChip} ${filter.reservationRequired === false ? styles.active : ''}`}
                aria-pressed={filter.reservationRequired === false}
                onClick={() => toggle('reservationRequired', false)}
              >予約不要</button>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterTitle}>施設</span>
              {FACILITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.filterChip} ${filter.facilityType === opt.value ? styles.active : ''}`}
                  aria-pressed={filter.facilityType === opt.value}
                  onClick={() => toggle('facilityType', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hasFilter && (
              <button type="button" className={styles.clearBtn} onClick={clearAll}>
                絞り込みをクリア
              </button>
            )}
          </div>

          {/* リスト */}
          <div className={styles.list} role="tabpanel">
            <p className={styles.resultCount}>{filtered.length}件のイベント</p>
            {filtered.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">🔍</span>
                <p className={styles.emptyText}>該当するイベントがありません</p>
              </div>
            ) : (
              filtered.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onClick={() => onSelectEvent(ev.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {tab === 'ai' && (
        <div className={styles.list} role="tabpanel">
          <AiSearch onSelectEvent={onSelectEvent} />
        </div>
      )}
    </div>
  )
}
