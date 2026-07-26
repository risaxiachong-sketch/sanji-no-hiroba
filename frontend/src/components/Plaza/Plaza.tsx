import type { Avatar, Page } from '../../types'
import { DUMMY_USERS } from '../../data/dummyUsers'
import styles from './Plaza.module.css'

// 背景画像を差し替える場合はこの import を有効にしてください
// import plazaBg from '../../assets/plaza-bg.png'
// 使い方: <div className={styles.plazaScene} style={{ backgroundImage: `url(${plazaBg})` }}>
const plazaBg: string | undefined = undefined

interface Props {
  avatar: Avatar
  onNavigate: (page: Page) => void
  onExit: () => void
}

const CHAR_COLORS: Record<string, { body: string; ear: string }> = {
  bear:  { body: '#f2c4a0', ear: '#e8a882' },
  bunny: { body: '#f5c2d0', ear: '#e8a0b8' },
  duck:  { body: '#f5e280', ear: '#e8d060' },
  cat:   { body: '#b8ddb8', ear: '#98c898' },
  panda: { body: '#c8d8f0', ear: '#a8b8e0' },
  koala: { body: '#d8c8f0', ear: '#b8a8e0' },
}

function CharacterFigure({
  emoji, avatarId, size = 64, isMe = false,
}: { emoji: string; avatarId: string; size?: number; isMe?: boolean }) {
  const col = CHAR_COLORS[avatarId] ?? { body: '#f5e6d3', ear: '#e0c8b0' }
  return (
    <svg
      width={size} height={size * 1.3} viewBox="0 0 64 84" aria-hidden="true"
      style={{ filter: isMe
        ? 'drop-shadow(0 0 7px rgba(113,102,181,0.65))'
        : 'drop-shadow(0 3px 6px rgba(0,0,0,0.18))' }}
    >
      <ellipse cx="18" cy="14" rx="10" ry="10" fill={col.ear} />
      <ellipse cx="18" cy="14" rx="7"  ry="7"  fill={col.body} />
      <ellipse cx="46" cy="14" rx="10" ry="10" fill={col.ear} />
      <ellipse cx="46" cy="14" rx="7"  ry="7"  fill={col.body} />
      <circle  cx="32" cy="28" r="22" fill={col.body} />
      <text x="32" y="35" textAnchor="middle" fontSize="18">{emoji}</text>
      <rect x="16" y="46" width="32" height="30" rx="14" fill={col.body} />
      <ellipse cx="10" cy="58" rx="8" ry="10" fill={col.body} />
      <ellipse cx="54" cy="58" rx="8" ry="10" fill={col.body} />
      <ellipse cx="23" cy="78" rx="8" ry="6"  fill={col.ear} />
      <ellipse cx="41" cy="78" rx="8" ry="6"  fill={col.ear} />
      {isMe && <circle cx="32" cy="2" r="4" fill="#7166b5" />}
    </svg>
  )
}

export function Plaza({ avatar, onNavigate, onExit }: Props) {
  const totalCount = DUMMY_USERS.length + 1

  return (
    <div className={styles.page}>

      {/* トップバー */}
      <header className={styles.topBar}>
        <span className={styles.sunIcon} aria-hidden="true">☀️</span>
        <h1 className={styles.topTitle}>さんじのひろば</h1>
        <button type="button" className={styles.exitBtn} onClick={onExit} aria-label="広場を退出する">
          <span aria-hidden="true">🚪</span>退出
        </button>
      </header>

      {/* 在室バナー */}
      <div className={styles.presenceBanner} role="status" aria-live="polite">
        <span className={styles.presenceDot} aria-hidden="true" />
        <span>いま{totalCount}人がひろばで過ごしています</span>
      </div>

      {/* 広場シーン */}
      <div
        className={styles.plazaScene}
        role="region"
        aria-label="バーチャル広場"
        style={plazaBg ? { backgroundImage: `url(${plazaBg})` } : undefined}
      >

        {/* CSS背景フォールバック（画像なし時） */}
        <div className={styles.plazaBgFallback} aria-hidden="true" />

        {/* 雲 */}
        <div className={styles.skyOverlay} aria-hidden="true">
          <div className={styles.cloud} style={{ top: '7%',  left: '8%',  width: '75px' }} />
          <div className={styles.cloud} style={{ top: '11%', left: '52%', width: '95px' }} />
          <div className={styles.cloud} style={{ top: '5%',  left: '76%', width: '55px' }} />
        </div>

        {/* 木 */}
        <div className={styles.tree} style={{ left: '1%',  top: '20%' }} aria-hidden="true">
          <div className={styles.treeTop} />
          <div className={styles.treeTrunk} />
        </div>
        <div className={styles.tree} style={{ right: '2%', top: '16%' }} aria-hidden="true">
          <div className={styles.treeTop} style={{ width:'54px', height:'58px', background:'#7dc87d' }} />
          <div className={styles.treeTrunk} />
        </div>

        {/* 支援センター看板 */}
        <div className={styles.buildingSign} aria-hidden="true">子育て支援センター</div>

        {/* 噴水 */}
        <div className={styles.fountain} aria-hidden="true">
          <div className={styles.fountainBase} />
          <div style={{ textAlign:'center', fontSize:'0.75rem', marginTop:'-6px' }}>💧</div>
        </div>

        {/* 地面 */}
        <div className={styles.ground} aria-hidden="true" />

        {/* 施設カード */}
        <div className={styles.facilityColumn}>
          <button type="button" className={styles.facilityCard}
            onClick={() => onNavigate('bulletinBoard')} aria-label="まちの掲示板を開く">
            <span className={styles.facilityCardIcon} aria-hidden="true">📋</span>
            <span className={styles.facilityCardLabel}>まちの<br />掲示板</span>
          </button>
        </div>

        {/* ダミーアバター */}
        {DUMMY_USERS.map((user) => (
          <div key={user.id} className={styles.charWrapper}
            style={{ left: `${user.x}%`, bottom: `${Math.round((100 - user.y) * 0.55 + 30)}px` }}>
            <div className={styles.speechBubble} aria-hidden="true">{user.message}</div>
            <CharacterFigure emoji={user.avatar.emoji} avatarId={user.avatar.id} size={50} />
          </div>
        ))}

        {/* 自分のアバター */}
        <div className={`${styles.charWrapper} ${styles.myChar}`}
          style={{ left: '44%', bottom: '55px' }} aria-label="あなたのアバター">
          <div className={`${styles.speechBubble} ${styles.mySpeech}`} aria-hidden="true">
            こんにちは
          </div>
          <CharacterFigure emoji={avatar.emoji} avatarId={avatar.id} size={66} isMe />
          <span className={styles.myLabel}>あなた</span>
        </div>

        {/* 浮かぶハート */}
        <span className={styles.floatHeart} style={{ left:'13%', bottom:'52%' }} aria-hidden="true">💗</span>
        <span className={styles.floatHeart} style={{ left:'66%', bottom:'58%', animationDelay:'0.9s' }} aria-hidden="true">💛</span>
        <span className={styles.floatHeart} style={{ left:'48%', bottom:'72%', animationDelay:'1.7s' }} aria-hidden="true">💗</span>
      </div>

      {/* ボトムナビ */}
      <nav className={styles.bottomNav} aria-label="メインナビゲーション">
        <button type="button" className={`${styles.navBtn} ${styles.navActive}`} aria-current="page" aria-label="ひろば">
          <span className={styles.navIcon} aria-hidden="true">🏠</span>
          <span className={styles.navLabel}>Hiroba</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('bulletinBoard')} aria-label="まちの掲示板">
          <span className={styles.navIcon} aria-hidden="true">📋</span>
          <span className={styles.navLabel}>Board</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('postArea')} aria-label="つぶやく">
          <span className={styles.navIcon} aria-hidden="true">💬</span>
          <span className={styles.navLabel}>Post</span>
        </button>
        <button type="button" className={styles.navBtn} onClick={() => onNavigate('savedEvents')} aria-label="保存イベント">
          <span className={styles.navIcon} aria-hidden="true">🔖</span>
          <span className={styles.navLabel}>Saved</span>
        </button>
      </nav>
    </div>
  )
}
