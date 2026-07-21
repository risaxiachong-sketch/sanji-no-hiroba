import { useCallback, useState } from 'react'
import type { ClusterId, PlazaAvatar, PlazaViewMode, TopicId } from '../types/plaza'
import { TOPICS, TOPIC_LABELS } from '../types/plaza'
import { Plaza3D } from './Plaza3D'
import type { CrowdGathering } from './plazaCrowd'

type PlazaSceneProps = {
  selectedAvatar: PlazaAvatar
  assignedCluster: ClusterId
  userMessage: string
  townLevel: number
  onOpenBoard: () => void
}

const TOPIC_SHORT_LABELS = new Map<TopicId, string>(
  TOPICS.map((topic) => [topic.id, topic.shortLabel]),
)

/** Only groups that have actually formed are worth naming on screen. */
const VISIBLE_GROUP_MINIMUM = 2
const VISIBLE_GROUP_LIMIT = 4

export function PlazaScene({
  selectedAvatar,
  assignedCluster,
  userMessage,
  townLevel,
  onOpenBoard,
}: PlazaSceneProps) {
  const [viewMode, setViewMode] = useState<PlazaViewMode>('immersive')
  const [gatherings, setGatherings] = useState<CrowdGathering[]>([])
  const isOverview = viewMode === 'overview'

  const handleGatheringsChange = useCallback((next: CrowdGathering[]) => {
    setGatherings((previous) => {
      const changed =
        previous.length !== next.length ||
        next.some(
          (gathering, index) =>
            previous[index].topic !== gathering.topic ||
            previous[index].memberCount !== gathering.memberCount,
        )
      return changed ? next : previous
    })
  }, [])

  const visibleGroups = gatherings
    .filter((gathering) => gathering.memberCount >= VISIBLE_GROUP_MINIMUM)
    .slice(0, VISIBLE_GROUP_LIMIT)

  return (
    <section className="plaza-visual" aria-label="話したいことが近い人どうしが集まる広場">
      <div className={`plaza-scene plaza-scene-3d view-${viewMode}`}>
        <Plaza3D
          assignedCluster={assignedCluster}
          viewMode={viewMode}
          townLevel={townLevel}
          onGatheringsChange={handleGatheringsChange}
        />

        <span className="plaza-3d-badge" aria-hidden="true">
          <i />3D LIVE
        </span>

        <button
          type="button"
          className="plaza-view-toggle"
          aria-pressed={isOverview}
          onClick={() => setViewMode(isOverview ? 'immersive' : 'overview')}
        >
          <span aria-hidden="true">{isOverview ? '↙' : '↗'}</span>
          {isOverview ? '近くに戻る' : '全体を見る'}
        </button>

        <button
          type="button"
          className="board-hotspot"
          onClick={onOpenBoard}
          aria-label="まちの掲示板を開く"
        >
          <span aria-hidden="true">📌</span>
          掲示板
        </button>

        <div
          className="plaza-topic-labels"
          aria-label="いま広場にできている集まり"
          aria-hidden={isOverview}
        >
          {visibleGroups.map((gathering) => (
            <span
              className={`topic-pill topic-${gathering.topic} ${
                assignedCluster === gathering.topic ? 'topic-assigned' : ''
              }`}
              key={gathering.topic}
            >
              {TOPIC_SHORT_LABELS.get(gathering.topic)}
              <b>{gathering.memberCount}</b>
            </span>
          ))}
        </div>

        <div className="plaza-reaction-bubbles" aria-hidden="true">
          <span className="reaction-bubble reaction-left">♡ わかるよ</span>
          <span className="reaction-bubble reaction-center">♡ おつかれさま</span>
          <span className="reaction-bubble reaction-right">♡ 私も同じ</span>
        </div>

        <span className="plaza-you-chip">
          <img src={selectedAvatar.image} alt="" />
          <span>
            <b>あなた</b>
            {assignedCluster === 'quiet' ? '静かに見ています' : '近い気持ちの集まりへ'}
          </span>
        </span>

        <span className="plaza-camera-hint" aria-hidden="true">
          {isOverview ? 'ドラッグで回す・ピンチで拡大' : 'ドラッグで広場を見回せます'}
        </span>
      </div>

      <div className="placement-summary" aria-live="polite">
        <span className="placement-icon" aria-hidden="true">◌</span>
        <div>
          <strong>
            {assignedCluster === 'quiet'
              ? '今日は静かに、少し離れた場所にいます'
              : `「${TOPIC_LABELS[assignedCluster]}」の集まりのそばです`}
          </strong>
          <p>{userMessage || '今日は見るだけ。少し離れた場所で静かに過ごします。'}</p>
        </div>
      </div>
    </section>
  )
}
