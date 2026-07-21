export type PlazaAvatar = {
  id: string
  image: string
  name: string
}

export type TopicId =
  | 'nightcry'
  | 'sleep'
  | 'feeding'
  | 'outing'
  | 'tantrum'
  | 'health'
  | 'alone'
  | 'work'

export type ClusterId = TopicId | 'quiet'

export type PlazaViewMode = 'immersive' | 'overview'

export type TopicDefinition = {
  id: TopicId
  label: string
  shortLabel: string
}

/** Emergent gathering topics. Visitors carry one and drift toward whoever shares it. */
export const TOPICS: TopicDefinition[] = [
  { id: 'nightcry', label: '夜泣きに悩んでいる', shortLabel: '夜泣き' },
  { id: 'sleep', label: '寝かしつけがつらい', shortLabel: '寝かしつけ' },
  { id: 'feeding', label: 'ごはん・ミルクの悩み', shortLabel: 'ごはん' },
  { id: 'outing', label: '親子でお出かけしたい', shortLabel: 'おでかけ' },
  { id: 'tantrum', label: 'イヤイヤ期まっただ中', shortLabel: 'イヤイヤ期' },
  { id: 'health', label: '体調・発熱が心配', shortLabel: '体調' },
  { id: 'alone', label: 'ワンオペでひとり', shortLabel: 'ワンオペ' },
  { id: 'work', label: '保育園・仕事復帰', shortLabel: '仕事復帰' },
]

export const TOPIC_LABELS: Record<ClusterId, string> = {
  ...(Object.fromEntries(TOPICS.map((topic) => [topic.id, topic.label])) as Record<
    TopicId,
    string
  >),
  quiet: '今日は静かに見ていたい気持ち',
}
