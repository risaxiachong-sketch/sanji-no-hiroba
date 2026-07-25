import { useState } from 'react'
import { EVENTS } from '../../data/events'
import { EventCard } from '../EventCard/EventCard'
import { parseNaturalQuery } from './parseNaturalQuery'
import styles from './AiSearch.module.css'

const EXAMPLE_QUERIES = [
  '明日、1歳の子どもと行ける無料の屋内イベントはある？',
  '今日の無料イベントを教えて',
  '予約不要で行ける図書館のイベント',
  '0歳の赤ちゃんと一緒に行けるところ',
]

interface Props {
  onSelectEvent: (id: string) => void
}

export function AiSearch({ onSelectEvent }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<typeof EVENTS | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = (text: string) => {
    if (!text.trim()) return
    const condition = parseNaturalQuery(text)
    const matched = EVENTS.filter(ev => {
      if (condition.date === 'today') {
        const today = new Date().toISOString().slice(0, 10)
        if (ev.date !== today) return false
      }
      if (condition.date === 'tomorrow') {
        const d = new Date(); d.setDate(d.getDate() + 1)
        if (ev.date !== d.toISOString().slice(0, 10)) return false
      }
      if (condition.childAge !== null && condition.childAge !== undefined) {
        if (ev.ageMin > condition.childAge || ev.ageMax < condition.childAge) return false
      }
      if (condition.price === 'free' && ev.price !== 'free') return false
      if (condition.indoor === true && !ev.indoor) return false
      if (condition.reservationRequired === false && ev.reservationRequired) return false
      if (condition.facilityType && ev.facilityType !== condition.facilityType) return false
      return true
    })
    setResults(matched)
    setSearched(true)
  }

  const useExample = (ex: string) => {
    setQuery(ex)
    handleSearch(ex)
  }

  return (
    <div className={styles.wrap}>
      {/* 入力行 */}
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          value={query}
          placeholder="例：明日、1歳と行ける無料イベントは？"
          aria-label="自然文でイベントを検索"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(query) }}
        />
        <button
          type="button"
          className={styles.searchBtn}
          disabled={!query.trim()}
          onClick={() => handleSearch(query)}
        >
          検索
        </button>
      </div>

      {/* 注意書き */}
      <p className={styles.notice}>
        登録済みのイベントのみを検索します。AIが架空のイベントを作ることはありません。
      </p>

      {/* 例文チップ */}
      {!searched && (
        <>
          <p className={styles.hint}>こんな聞き方ができます：</p>
          <div className={styles.chips}>
            {EXAMPLE_QUERIES.map(ex => (
              <button
                key={ex}
                type="button"
                className={styles.chip}
                onClick={() => useExample(ex)}
              >
                {ex}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 検索結果 */}
      {searched && results !== null && (
        <>
          <p className={styles.resultLabel}>{results.length}件見つかりました</p>
          {results.length === 0 ? (
            <p style={{ color: 'var(--color-text-sub)', fontSize: 'var(--font-size-sm)' }}>
              条件に合うイベントがありませんでした。<br />
              別のキーワードで試してみてください。
            </p>
          ) : (
            results.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                onClick={() => onSelectEvent(ev.id)}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}
