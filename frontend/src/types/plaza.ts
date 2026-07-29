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

/** Guesses which topic circle a post belongs to, from its text alone (no mood UI on this branch yet). */
export function classifyPostForPrototype(text: string, mood: string | null = null): ClusterId {
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
