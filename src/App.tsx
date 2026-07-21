import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import heroImg from './assets/hero.png'
import bearImg from './assets/generated/avatar-bear.png'
import catImg from './assets/generated/avatar-cat.png'
import chickImg from './assets/generated/avatar-chick.png'
import koalaImg from './assets/generated/avatar-koala.png'
import pandaImg from './assets/generated/avatar-panda.png'
import rabbitImg from './assets/generated/avatar-rabbit.png'
import type { ClusterId, PlazaAvatar } from './types/plaza'
import { PLAZA_VISITOR_COUNT } from './components/plazaCrowd'
import { MAX_TOWN_LEVEL, levelForPosts, postsToNextLevel, townLevel as townLevelInfo } from './types/townLevel'
import { LevelUpNotice } from './components/LevelUpNotice'
import './App.css'

const PlazaScene = lazy(() =>
  import('./components/PlazaScene').then((module) => ({ default: module.PlazaScene })),
)

type Page =
  | 'top'
  | 'avatar'
  | 'mood'
  | 'post'
  | 'plaza'
  | 'board'
  | 'detail'
  | 'exit'
type DateFilter = 'all' | 'today' | 'tomorrow'
type AgeFilter = 'all' | 0 | 1 | 2 | 3

type EventItem = {
  id: string
  title: string
  date: Exclude<DateFilter, 'all'>
  dateLabel: string
  time: string
  location: string
  ageMin: number
  ageMax: number
  ageLabel: string
  priceLabel: string
  free: boolean
  indoor: boolean
  reservationRequired: boolean
  description: string
}

type Filters = {
  date: DateFilter
  age: AgeFilter
  free: boolean
  indoor: boolean
  noReservation: boolean
}

const AVATARS: PlazaAvatar[] = [
  { id: 'bear', image: bearImg, name: 'くまさん' },
  { id: 'rabbit', image: rabbitImg, name: 'うさぎさん' },
  { id: 'chick', image: chickImg, name: 'ひよこさん' },
  { id: 'cat', image: catImg, name: 'ねこさん' },
  { id: 'panda', image: pandaImg, name: 'ぱんださん' },
  { id: 'koala', image: koalaImg, name: 'こあらさん' },
]

const MOODS = [
  { id: 'tired', emoji: '😮‍💨', label: 'ちょっと疲れた' },
  { id: 'presence', emoji: '🌿', label: '誰かの気配を感じたい' },
  { id: 'outing', emoji: '👜', label: 'お出かけ先を探したい' },
  { id: 'talk', emoji: '💬', label: '少し話したい' },
  { id: 'observe', emoji: '👀', label: '見るだけ' },
] as const

const POST_EXAMPLES = [
  '今日は赤ちゃんがすぐ泣いて、ちょっと疲れました',
  '夜なかなか寝てくれなくて眠いです',
  '明日は親子で公園に行きたいです',
] as const

function classifyPostForPrototype(text: string, mood: string | null): ClusterId {
  if (!text.trim()) return 'quiet'
  if (/夜泣き|夜中|何度も起き/.test(text)) return 'nightcry'
  if (/寝かしつけ|寝|眠|抱っこ/.test(text)) return 'sleep'
  if (/ミルク|離乳食|ごはん|食べ|飲/.test(text)) return 'feeding'
  if (/公園|外|イベント|出かけ|遊び場/.test(text)) return 'outing'
  if (/イヤイヤ|かんしゃく|ぐず|わがまま/.test(text)) return 'tantrum'
  if (/熱|風邪|病院|体調|湿疹/.test(text)) return 'health'
  if (/ワンオペ|ひとり|孤独|頼れ|疲/.test(text)) return 'alone'
  if (/保育園|仕事|復帰|職場|預け/.test(text)) return 'work'
  if (mood === 'outing') return 'outing'
  if (mood === 'tired') return 'alone'
  return 'quiet'
}

const EVENTS: EventItem[] = [
  {
    id: 'story-time',
    title: '親子で楽しむ おはなし会',
    date: 'tomorrow',
    dateLabel: '明日',
    time: '10:30〜11:00',
    location: '中央図書館 こども室',
    ageMin: 0,
    ageMax: 3,
    ageLabel: '0〜3歳',
    priceLabel: '無料',
    free: true,
    indoor: true,
    reservationRequired: false,
    description:
      '絵本の読み聞かせと、親子で楽しめる手遊びの時間です。途中入退室もできます。',
  },
  {
    id: 'baby-cafe',
    title: '赤ちゃんとほっとカフェ',
    date: 'today',
    dateLabel: '今日',
    time: '13:00〜14:30',
    location: 'さくら公民館 和室',
    ageMin: 0,
    ageMax: 1,
    ageLabel: '0〜1歳',
    priceLabel: '無料',
    free: true,
    indoor: true,
    reservationRequired: false,
    description:
      '赤ちゃんと一緒にゆっくり過ごせる交流会。話さずに過ごすだけでも大丈夫です。',
  },
  {
    id: 'science-play',
    title: 'ちいさな科学あそび',
    date: 'tomorrow',
    dateLabel: '明日',
    time: '14:00〜15:00',
    location: 'こども科学館',
    ageMin: 2,
    ageMax: 3,
    ageLabel: '2〜3歳',
    priceLabel: '300円',
    free: false,
    indoor: true,
    reservationRequired: true,
    description:
      '色や音を使った幼児向けのやさしい科学体験です。保護者と一緒に参加できます。',
  },
  {
    id: 'park-picnic',
    title: '親子で朝のミニピクニック',
    date: 'tomorrow',
    dateLabel: '明日',
    time: '10:00〜11:30',
    location: 'ひだまり公園',
    ageMin: 1,
    ageMax: 3,
    ageLabel: '1〜3歳',
    priceLabel: '無料',
    free: true,
    indoor: false,
    reservationRequired: false,
    description:
      '芝生でのんびり過ごす小さな集まりです。飲み物と敷物をご持参ください。',
  },
  {
    id: 'music-circle',
    title: 'はじめての親子リズム',
    date: 'today',
    dateLabel: '今日',
    time: '15:00〜15:40',
    location: '東児童館 プレイルーム',
    ageMin: 1,
    ageMax: 2,
    ageLabel: '1〜2歳',
    priceLabel: '200円',
    free: false,
    indoor: true,
    reservationRequired: false,
    description:
      '音楽に合わせて親子で体を動かします。動きやすい服装で気軽に参加できます。',
  },
  {
    id: 'parent-consultation',
    title: '子育てミニ相談会',
    date: 'tomorrow',
    dateLabel: '明日',
    time: '9:30〜12:00',
    location: '地域子育て支援センター',
    ageMin: 0,
    ageMax: 3,
    ageLabel: '0〜3歳',
    priceLabel: '無料',
    free: true,
    indoor: true,
    reservationRequired: true,
    description:
      '保健師と子育て支援員に、日々の小さな気がかりを相談できる時間です。',
  },
]

const INITIAL_FILTERS: Filters = {
  date: 'all',
  age: 'all',
  free: false,
  indoor: false,
  noReservation: false,
}

function readSavedIds() {
  try {
    const saved = JSON.parse(localStorage.getItem('sanji-saved-events') ?? '[]')
    return Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

const POST_COUNT_KEY = 'sanji-post-count'

/** Posts the town has received so far. Stands in for a server until there is one. */
function readPostCount() {
  const stored = Number(localStorage.getItem(POST_COUNT_KEY))
  return Number.isFinite(stored) && stored > 0 ? Math.floor(stored) : 0
}

function App() {
  const [page, setPage] = useState<Page>('top')
  const [selectedAvatar, setSelectedAvatar] = useState<PlazaAvatar | null>(null)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [postText, setPostText] = useState('')
  const [assignedCluster, setAssignedCluster] = useState<ClusterId>('quiet')
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
  const [savedIds, setSavedIds] = useState<string[]>(readSavedIds)
  const [postCount, setPostCount] = useState(readPostCount)
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null)

  useEffect(() => {
    localStorage.setItem(POST_COUNT_KEY, String(postCount))
  }, [postCount])

  // `?level=42` previews any stage of the town without having to post that much.
  const levelPreview = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('level')
    const preview = raw === null ? Number.NaN : Number(raw)
    return Number.isFinite(preview)
      ? Math.min(MAX_TOWN_LEVEL, Math.max(1, Math.round(preview)))
      : null
  }, [])
  const isLevelPreview = levelPreview !== null
  const townLevel = levelPreview ?? levelForPosts(postCount)
  // In preview mode the level is pinned, so measure the remaining posts from the
  // start of the previewed level rather than the real (low) post count.
  const postsToNext = postsToNextLevel(
    isLevelPreview ? townLevelInfo(townLevel).postsRequired : postCount,
  )

  useEffect(() => {
    localStorage.setItem('sanji-saved-events', JSON.stringify(savedIds))
  }, [savedIds])

  const selectedEvent = EVENTS.find((event) => event.id === selectedEventId)
  const filteredEvents = EVENTS.filter((event) => {
    const matchesDate = filters.date === 'all' || event.date === filters.date
    const matchesAge =
      filters.age === 'all' ||
      (event.ageMin <= filters.age && event.ageMax >= filters.age)
    const matchesPrice = !filters.free || event.free
    const matchesIndoor = !filters.indoor || event.indoor
    const matchesReservation =
      !filters.noReservation || !event.reservationRequired

    return (
      matchesDate &&
      matchesAge &&
      matchesPrice &&
      matchesIndoor &&
      matchesReservation
    )
  })
  const hasFilters =
    filters.date !== 'all' ||
    filters.age !== 'all' ||
    filters.free ||
    filters.indoor ||
    filters.noReservation

  const openEvent = (id: string) => {
    setSelectedEventId(id)
    setPage('detail')
  }

  const toggleSaved = (id: string) => {
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    )
  }

  const restart = () => {
    setPage('top')
    setSelectedAvatar(null)
    setSelectedMood(null)
    setPostText('')
    setAssignedCluster('quiet')
    setSelectedEventId(null)
    setFilters(INITIAL_FILTERS)
  }

  const renderHeader = (title: string, onBack: () => void) => (
    <header className="app-header">
      <button
        type="button"
        className="icon-button"
        onClick={onBack}
        aria-label="戻る"
      >
        ←
      </button>
      <strong>{title}</strong>
      <span className="mini-avatar" aria-hidden="true">
        {selectedAvatar ? (
          <img src={selectedAvatar.image} alt="" />
        ) : (
          '🌱'
        )}
      </span>
    </header>
  )

  if (page === 'top') {
    return (
      <main className="app-shell top-shell">
        <section className="top-card">
          <span className="prototype-label">CLICK PROTOTYPE</span>
          <img
            src={heroImg}
            className="hero-image"
            width="170"
            height="179"
            alt="さんじのひろばのイメージ"
          />
          <h1>さんじのひろば</h1>
          <p className="catchcopy">子育ての途中に、ひとりじゃない時間を。</p>
          <p className="intro">
            話しても、見ているだけでも大丈夫。地域の誰かの気配と、親子で行ける場所に出会える小さな広場です。
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => setPage('avatar')}
          >
            ひろばに入る <span aria-hidden="true">→</span>
          </button>
          <p className="privacy-note">登録不要・匿名で試せます</p>
        </section>
      </main>
    )
  }

  if (page === 'avatar') {
    return (
      <main className="app-shell">
        <section className="screen-card">
          {renderHeader('アバターを選ぶ', () => setPage('top'))}
          <div className="screen-copy">
            <span className="step-label">STEP 1 / 3</span>
            <h1>今日のあなたは、どの子？</h1>
            <p>名前や顔写真は使いません。好きな子を選んでください。</p>
          </div>
          <div className="avatar-grid">
            {AVATARS.map((avatar) => (
              <button
                type="button"
                key={avatar.id}
                className={`avatar-option ${selectedAvatar?.id === avatar.id ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(avatar)}
                aria-pressed={selectedAvatar?.id === avatar.id}
              >
                <span className="avatar-image-shell">
                  <img src={avatar.image} alt="" />
                </span>
                <span>{avatar.name}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={!selectedAvatar}
            onClick={() => setPage('mood')}
          >
            次へ <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    )
  }

  if (page === 'mood') {
    return (
      <main className="app-shell">
        <section className="screen-card">
          {renderHeader('今の気分', () => setPage('avatar'))}
          <div className="screen-copy compact-copy">
            <span className="step-label">STEP 2 / 3</span>
            <h1>今日は、どんな気分ですか？</h1>
            <p>広場での過ごし方をひとつ選べます。</p>
          </div>
          <div className="mood-list">
            {MOODS.map((mood) => (
              <button
                type="button"
                key={mood.id}
                className={`mood-option ${selectedMood === mood.id ? 'selected' : ''}`}
                onClick={() => setSelectedMood(mood.id)}
                aria-pressed={selectedMood === mood.id}
              >
                <span aria-hidden="true">{mood.emoji}</span>
                <span>{mood.label}</span>
                <span className="selection-mark" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="primary-button"
            disabled={!selectedMood}
            onClick={() => setPage('post')}
          >
            次へ <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    )
  }

  if (page === 'post' && selectedAvatar) {
    return (
      <main className="app-shell">
        <section className="screen-card post-card">
          {renderHeader('今日のひとこと', () => setPage('mood'))}
          <div className="screen-copy compact-copy">
            <span className="step-label">STEP 3 / 3</span>
            <h1>いまの気持ちを、置いていく</h1>
            <p>
              近い気持ちの投稿をした人のそばに、あなたのアバターが現れます。
            </p>
          </div>

          <div className="post-avatar-preview" aria-hidden="true">
            <img src={selectedAvatar.image} alt="" />
            <span>あなたのひとこと</span>
          </div>

          <label className="post-input-label" htmlFor="daily-post">
            <span>60文字まで</span>
            <textarea
              id="daily-post"
              maxLength={60}
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              placeholder="例：今日は赤ちゃんがすぐ泣いて疲れました"
            />
          </label>
          <span className="post-character-count">{postText.length} / 60</span>

          <div className="post-examples">
            <span>例から選んでもOK</span>
            {POST_EXAMPLES.map((example) => (
              <button type="button" key={example} onClick={() => setPostText(example)}>
                {example}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="primary-button"
            disabled={!postText.trim()}
            onClick={() => {
              setAssignedCluster(classifyPostForPrototype(postText, selectedMood))
              setPostCount((count) => {
                const next = count + 1
                const from = levelForPosts(count)
                const to = levelForPosts(next)
                // Preview mode pins the level, so a real level-up can't be shown then.
                if (to > from && !isLevelPreview) setLevelUp({ from, to })
                return next
              })
              setPage('plaza')
            }}
          >
            この気持ちでひろばへ <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="text-button skip-post-button"
            onClick={() => {
              setPostText('')
              setAssignedCluster('quiet')
              setPage('plaza')
            }}
          >
            今日は見るだけで入る
          </button>
        </section>
      </main>
    )
  }

  if (page === 'plaza' && selectedAvatar) {
    return (
      <main className="app-shell plaza-shell">
        <section className="screen-card plaza-card">
          <header className="plaza-header">
            <div>
              <span className="eyebrow">さんじのひろば</span>
              <h1>こんにちは、{selectedAvatar.name}</h1>
            </div>
            <span className="people-count">
              <i aria-hidden="true" />
              {PLAZA_VISITOR_COUNT + 1}人いるよ
            </span>
          </header>

          <div className="town-level" aria-label="まちの育ち具合">
            <div className="town-level-head">
              <span className="town-level-badge">Lv.{townLevel}</span>
              <strong>{townLevelInfo(townLevel).title}</strong>
              <small>
                {postsToNext === null
                  ? 'まちが完成しました'
                  : `次のレベルまで あと${postsToNext}投稿`}
              </small>
            </div>
            <div
              className="town-level-bar"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={MAX_TOWN_LEVEL}
              aria-valuenow={townLevel}
            >
              <span style={{ width: `${(townLevel / MAX_TOWN_LEVEL) * 100}%` }} />
            </div>
          </div>

          <Suspense fallback={<div className="plaza-loading">3Dの広場を準備中…</div>}>
            <PlazaScene
              selectedAvatar={selectedAvatar}
              assignedCluster={assignedCluster}
              userMessage={postText}
              townLevel={townLevel}
              onOpenBoard={() => setPage('board')}
            />
          </Suspense>

          <div className="plaza-actions">
            <button type="button" onClick={() => setPage('board')}>
              <span aria-hidden="true">📋</span>
              <span>まちの掲示板</span>
              <small>イベントを探す</small>
            </button>
            <button type="button" onClick={() => setPage('exit')}>
              <span aria-hidden="true">🚪</span>
              <span>広場を退出する</span>
              <small>今日のすれ違いへ</small>
            </button>
          </div>
        </section>

        {levelUp && (
          <LevelUpNotice
            from={levelUp.from}
            to={levelUp.to}
            onClose={() => setLevelUp(null)}
          />
        )}
      </main>
    )
  }

  if (page === 'board') {
    return (
      <main className="app-shell">
        <section className="screen-card list-card">
          {renderHeader('まちの掲示板', () => setPage('plaza'))}
          <div className="screen-copy compact-copy">
            <h1>親子で行ける場所</h1>
            <p>条件を選ぶと、予定がすぐに絞り込まれます。</p>
          </div>

          <div className="filter-panel" aria-label="イベントの絞り込み">
            <fieldset className="date-filter">
              <legend>日にち</legend>
              <button
                type="button"
                className={filters.date === 'today' ? 'active' : ''}
                aria-pressed={filters.date === 'today'}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    date: current.date === 'today' ? 'all' : 'today',
                  }))
                }
              >
                今日
              </button>
              <button
                type="button"
                className={filters.date === 'tomorrow' ? 'active' : ''}
                aria-pressed={filters.date === 'tomorrow'}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    date: current.date === 'tomorrow' ? 'all' : 'tomorrow',
                  }))
                }
              >
                明日
              </button>
            </fieldset>

            <label className="age-filter">
              <span>対象年齢</span>
              <select
                value={filters.age}
                onChange={(event) => {
                  const value = event.target.value
                  setFilters((current) => ({
                    ...current,
                    age: value === 'all' ? 'all' : (Number(value) as AgeFilter),
                  }))
                }}
              >
                <option value="all">すべて</option>
                <option value="0">0歳</option>
                <option value="1">1歳</option>
                <option value="2">2歳</option>
                <option value="3">3歳</option>
              </select>
            </label>

            <div className="condition-filter">
              <button
                type="button"
                className={filters.free ? 'active' : ''}
                aria-pressed={filters.free}
                onClick={() =>
                  setFilters((current) => ({ ...current, free: !current.free }))
                }
              >
                無料
              </button>
              <button
                type="button"
                className={filters.indoor ? 'active' : ''}
                aria-pressed={filters.indoor}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    indoor: !current.indoor,
                  }))
                }
              >
                屋内
              </button>
              <button
                type="button"
                className={filters.noReservation ? 'active' : ''}
                aria-pressed={filters.noReservation}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    noReservation: !current.noReservation,
                  }))
                }
              >
                予約不要
              </button>
            </div>
          </div>

          <div className="result-heading" aria-live="polite">
            <strong>{filteredEvents.length}件見つかりました</strong>
            {hasFilters && (
              <button type="button" onClick={() => setFilters(INITIAL_FILTERS)}>
                条件をクリア
              </button>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="empty-state compact-empty">
              <span aria-hidden="true">🔎</span>
              <h2>該当するイベントがありません</h2>
              <p>条件を減らして、もう一度探してみてください。</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFilters(INITIAL_FILTERS)}
              >
                条件をクリア
              </button>
            </div>
          ) : (
            <div className="event-list">
              {filteredEvents.map((event) => (
                <button
                  type="button"
                  className="event-card"
                  key={event.id}
                  onClick={() => openEvent(event.id)}
                >
                  <span
                    className={`event-date ${event.date === 'today' ? 'today' : ''}`}
                  >
                    {event.dateLabel}
                  </span>
                  <span className="event-content">
                    <strong>{event.title}</strong>
                    <span>
                      {event.time} · {event.location}
                    </span>
                    <span className="tag-row">
                      <i>{event.ageLabel}</i>
                      <i>{event.priceLabel}</i>
                      <i>{event.indoor ? '屋内' : '屋外'}</i>
                      {!event.reservationRequired && <i>予約不要</i>}
                    </span>
                  </span>
                  <span className="event-arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    )
  }

  if (page === 'detail' && selectedEvent) {
    const isSaved = savedIds.includes(selectedEvent.id)

    return (
      <main className="app-shell">
        <section className="screen-card detail-card">
          {renderHeader('イベント詳細', () => setPage('board'))}
          <div className="detail-visual" aria-hidden="true">
            <span>🌳</span><b>👨‍👩‍👧</b><span>🌼</span>
          </div>
          <div className="detail-body">
            <span className="detail-category">親子イベント</span>
            <h1>{selectedEvent.title}</h1>
            <p>{selectedEvent.description}</p>
            <dl className="detail-list">
              <div><dt>日時</dt><dd>{selectedEvent.dateLabel} {selectedEvent.time}</dd></div>
              <div><dt>場所</dt><dd>{selectedEvent.location}</dd></div>
              <div><dt>対象</dt><dd>{selectedEvent.ageLabel}</dd></div>
              <div><dt>料金</dt><dd>{selectedEvent.priceLabel}</dd></div>
              <div><dt>予約</dt><dd>{selectedEvent.reservationRequired ? '要予約' : '予約不要'}</dd></div>
              <div><dt>設備</dt><dd>授乳室・おむつ交換台・ベビーカーOK</dd></div>
            </dl>
            <p className="source-note">
              情報提供元：地域子育て情報（最終確認 2026年7月18日）
            </p>
            <button
              type="button"
              className={`primary-button save-button ${isSaved ? 'saved' : ''}`}
              onClick={() => toggleSaved(selectedEvent.id)}
            >
              <span aria-hidden="true">{isSaved ? '✓' : '🔖'}</span>
              {isSaved ? '行ってみたいに保存済み' : '行ってみたいに保存'}
            </button>
            {isSaved && (
              <button
                type="button"
                className="secondary-button back-to-plaza-button"
                onClick={() => setPage('plaza')}
              >
                広場へ戻る
              </button>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (page === 'exit' && selectedAvatar) {
    return (
      <main className="app-shell exit-shell">
        <section className="screen-card exit-card">
          <div className="exit-illustration" aria-hidden="true">
            <span><img src={rabbitImg} alt="" /></span>
            <span><img src={selectedAvatar.image} alt="" /></span>
            <span><img src={pandaImg} alt="" /></span>
          </div>
          <span className="step-label">TODAY'S HIROBA</span>
          <h1>今日は7人と<br />すれ違いました</h1>
          <p>
            話さなくても、同じ広場で過ごした時間がありました。今日もおつかれさまでした。
          </p>
          <div className="reaction-summary">
            <span aria-hidden="true">🌿</span>
            <div>
              <strong>「ここにいるよ」を受け取りました</strong>
              <small>広場のみんなから</small>
            </div>
          </div>
          <button type="button" className="primary-button" onClick={restart}>
            トップへ戻る
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setPage('plaza')}
          >
            もう一度ひろばへ
          </button>
        </section>
      </main>
    )
  }

  return null
}

export default App
