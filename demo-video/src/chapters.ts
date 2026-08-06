import { TAKE_SECONDS } from './timeline'

export type Chapter = Readonly<{
  id: string
  title: string
  /** Two short sentences describing what this feature does. */
  description: string
  /**
   * Recorded steps that can start this chapter, best first. Timings come from
   * the capture itself, so the labels stay in step with the footage without
   * hand-tuning.
   */
  startSteps: readonly string[]
  /** Used when the manifest is unavailable, e.g. in Studio before a capture. */
  fallbackSeconds: number
}>

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'top',
    title: 'アルパカのあくびをひらく',
    description: '子育ての合間に、ひとりじゃない時間を持てるオンライン広場です。'
      + 'アプリのインストールは不要で、ブラウザを開けばすぐに始められます。',
    startSteps: [],
    fallbackSeconds: 0,
  },
  {
    id: 'profile',
    title: 'プロフィール登録',
    description: '必要なのはニックネームと子どもの年齢だけ。'
      + 'メールアドレスも電話番号も聞かないので、思い立ったその場で広場に入れます。',
    startSteps: ['enter'],
    fallbackSeconds: 1.5,
  },
  {
    id: 'avatar',
    title: 'アバターを選ぶ',
    description: '広場に立つ姿を7種類から選びます。'
      + '左右にスワイプすると候補が流れ、選んだ子がそのまま広場のキャラクターになります。',
    startSteps: ['next'],
    fallbackSeconds: 6.8,
  },
  {
    id: 'plaza',
    title: '2Dひろば',
    description: '選んだキャラクターが、広場を歩きはじめます。'
      + '画面をドラッグすると視点が動き、噴水や掲示板のある町を見渡せます。',
    startSteps: ['plaza'],
    fallbackSeconds: 15.3,
  },
  {
    id: 'post',
    title: 'つぶやく',
    description: '今日あった小さな出来事を、ひとことだけ置いていけます。'
      + '長い文章も、誰かへの宛名も要りません。',
    startSteps: ['post-open'],
    fallbackSeconds: 33.0,
  },
  {
    id: 'talk',
    title: 'ひろばの会話',
    description: 'キャラクターたちは自分で歩き回り、出会うと立ち止まって話しはじめます。'
      + 'タップすると、その子がいま置いていったつぶやきを読めます。',
    // Prefers a real autonomous conversation when the capture caught one.
    startSteps: ['plaza-talk', 'visitor-tap'],
    fallbackSeconds: 43.5,
  },
  {
    id: 'reaction',
    title: 'リアクション',
    description: '気になるキャラクターをタップすると、その人のつぶやきが開きます。'
      + '「わかるよ」「おつかれさま」など8種類で、言葉にしづらい気持ちをそっと返せます。',
    startSteps: ['reaction'],
    fallbackSeconds: 48.5,
  },
  {
    id: 'board',
    title: 'まちの掲示板',
    description: '広場に立つ掲示板から、地域の子育てイベント一覧へ移動できます。'
      + '公民館、図書館、子育て支援施設の予定がひとつにまとまっています。',
    startSteps: ['board'],
    fallbackSeconds: 52.0,
  },
  {
    id: 'save',
    title: 'イベントを保存',
    description: '日程・対象年齢・条件・施設で絞り込めます。'
      + '気になるものはハートを押すだけで「行ってみたい」に残しておけます。',
    startSteps: ['filter-today'],
    fallbackSeconds: 58.0,
  },
  {
    id: 'detail',
    title: 'イベント詳細',
    description: '日時、場所、対象年齢、参加条件をひとつの画面で確認できます。'
      + '授乳室やおむつ替え、ベビーカーで行けるかまで分かります。',
    startSteps: ['event-detail'],
    fallbackSeconds: 63.5,
  },
  {
    id: 'calendar',
    title: 'カレンダーに追加',
    description: '行くと決めたイベントは、その場でカレンダーに追加できます。'
      + '追加先を選ぶだけで、普段使っている予定表に持っていけます。',
    startSteps: ['calendar'],
    fallbackSeconds: 68.0,
  },
  {
    id: 'settings',
    title: '設定',
    description: 'ニックネーム、子どもの年齢、アバターはいつでも変えられます。'
      + '効果音のオン・オフやキャラクターの大きさも、見やすいように調整できます。',
    startSteps: ['settings'],
    fallbackSeconds: 74.0,
  },
] as const

export type ResolvedChapter = Chapter & {
  index: number
  startSeconds: number
  endSeconds: number
}

/**
 * Turns the chapter list into a timeline using the recorded step times.
 * Chapters whose step is missing, or which would run backwards, are dropped so
 * the panel can never show a label before the screen it describes.
 */
export const resolveChapters = (steps: Readonly<Record<string, number>>): ResolvedChapter[] => {
  const started = CHAPTERS.map((chapter) => {
    const recordedStep = chapter.startSteps.find((step) => typeof steps[step] === 'number')
    const startSeconds = chapter.startSteps.length === 0
      ? 0
      : recordedStep === undefined ? chapter.fallbackSeconds : steps[recordedStep] / 1_000
    return { chapter, startSeconds }
  })

  const ordered: Array<{ chapter: Chapter; startSeconds: number }> = []
  for (const entry of started) {
    const previous = ordered[ordered.length - 1]
    if (previous && entry.startSeconds <= previous.startSeconds) continue
    ordered.push(entry)
  }

  return ordered.map((entry, index) => ({
    ...entry.chapter,
    index,
    startSeconds: entry.startSeconds,
    endSeconds: ordered[index + 1]?.startSeconds ?? TAKE_SECONDS,
  }))
}
