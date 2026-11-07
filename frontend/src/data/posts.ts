import type { Post, ReactionType, ReactionUser } from '../types';
import { AVATARS } from './avatars';

function postTimestamp(daysAgo: number, hoursAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

function postAvatar(index: number, label: string) {
  return { ...AVATARS[index], label };
}

const dummyUsers: ReactionUser[] = [
  { id: 'u-01', nickname: 'ひまわりママ', avatarEmoji: '🌻', avatarColor: '#fff9c4' },
  { id: 'u-02', nickname: 'くまママ', avatarEmoji: '🐻', avatarColor: '#ffe0b2' },
  { id: 'u-03', nickname: 'ことりママ', avatarEmoji: '🐦', avatarColor: '#e3f2fd' },
  { id: 'u-04', nickname: 'りんごママ', avatarEmoji: '🍎', avatarColor: '#ffcdd2' },
  { id: 'u-05', nickname: 'そらママ', avatarEmoji: '☁️', avatarColor: '#e0f7fa' },
];

function makeReactions(counts: Partial<Record<ReactionType, number>>): Record<ReactionType, number> {
  return {
    wakaru: counts.wakaru ?? 0,
    otsukare: counts.otsukare ?? 0,
    kokoniiruyo: counts.kokoniiruyo ?? 0,
    watashimo: counts.watashimo ?? 0,
    ouen: counts.ouen ?? 0,
    kyoumo: counts.kyoumo ?? 0,
    yokattane: counts.yokattane ?? 0,
    hitoiki: counts.hitoiki ?? 0,
  };
}

function makeReactionUsers(entries: Partial<Record<ReactionType, number[]>>): Record<ReactionType, ReactionUser[]> {
  const result: Record<ReactionType, ReactionUser[]> = {
    wakaru: [],
    otsukare: [],
    kokoniiruyo: [],
    watashimo: [],
    ouen: [],
    kyoumo: [],
    yokattane: [],
    hitoiki: [],
  };
  for (const [key, userIndices] of Object.entries(entries)) {
    result[key as ReactionType] = (userIndices ?? []).map(i => dummyUsers[i]);
  }
  return result;
}

const ORIGINAL_POSTS: Post[] = [
  {
    id: 'post-01',
    userId: 'du-01',
    nickname: 'ひまわりママ',
    avatar: postAvatar(0, 'ひまわりママ'),
    text: '今日は子どもがなかなか寝なくて、ちょっと疲れた…でも寝顔を見ると癒されます。',
    reactions: makeReactions({ wakaru: 3, otsukare: 2, kokoniiruyo: 1 }),
    reactionUsers: makeReactionUsers({ wakaru: [1, 2, 3], otsukare: [2, 4], kokoniiruyo: [3] }),
    myReactions: [],
    timestamp: postTimestamp(0, 2),
  },
  {
    id: 'post-02',
    userId: 'du-02',
    nickname: 'くまママ',
    avatar: postAvatar(1, 'くまママ'),
    text: '初めての離乳食、今日は少し食べてくれました。明日も無理せず挑戦します。',
    reactions: makeReactions({ ouen: 2, watashimo: 3, otsukare: 1 }),
    reactionUsers: makeReactionUsers({ ouen: [0, 3], watashimo: [0, 2, 4], otsukare: [3] }),
    myReactions: [],
    timestamp: postTimestamp(0, 5),
  },
  {
    id: 'post-03',
    userId: 'du-03',
    nickname: 'ことりママ',
    avatar: postAvatar(2, 'ことりママ'),
    text: '公園で同じくらいの年齢のお子さんと遊べました。親子で楽しかったです。',
    reactions: makeReactions({ yokattane: 4, ouen: 1, wakaru: 1 }),
    reactionUsers: makeReactionUsers({ yokattane: [0, 1, 3, 4], ouen: [1], wakaru: [4] }),
    myReactions: [],
    timestamp: postTimestamp(0, 8),
  },
  {
    id: 'post-04',
    userId: 'du-04',
    nickname: 'りんごママ',
    avatar: postAvatar(3, 'りんごママ'),
    text: '雨の日が続いてお出かけできないので、室内遊びのアイデアを探しています。',
    reactions: makeReactions({ watashimo: 2, hitoiki: 3, kokoniiruyo: 1 }),
    reactionUsers: makeReactionUsers({ watashimo: [1, 2], hitoiki: [0, 2, 4], kokoniiruyo: [1] }),
    myReactions: [],
    timestamp: postTimestamp(1, 1),
  },
  {
    id: 'post-05',
    userId: 'du-05',
    nickname: 'そらママ',
    avatar: postAvatar(4, 'そらママ'),
    text: '子どもが初めて「ママ」と呼んでくれました。嬉しくて何度も思い出しています。',
    reactions: makeReactions({ yokattane: 5, ouen: 2, kyoumo: 1 }),
    reactionUsers: makeReactionUsers({ yokattane: [0, 1, 2, 3, 4], ouen: [0, 3], kyoumo: [2] }),
    myReactions: [],
    timestamp: postTimestamp(1, 6),
  },
  {
    id: 'post-06',
    userId: 'du-06',
    nickname: 'あおいママ',
    avatar: postAvatar(5, 'あおいママ'),
    text: '今週末のリトミック教室に行ってみようかな。同じくらいの月齢の子いるかな。',
    reactions: makeReactions({ wakaru: 1, ouen: 2, watashimo: 1 }),
    reactionUsers: makeReactionUsers({ wakaru: [4], ouen: [1, 2], watashimo: [3] }),
    myReactions: [],
    timestamp: postTimestamp(2, 3),
  },
  {
    id: 'post-07',
    userId: 'du-07',
    nickname: 'ことりママ',
    avatar: postAvatar(1, 'ことりママ'),
    text: '夜泣きが続いて少し疲れています。同じ経験のある方、どう過ごしていましたか？',
    reactions: makeReactions({ kokoniiruyo: 3, watashimo: 4, hitoiki: 2 }),
    reactionUsers: makeReactionUsers({ kokoniiruyo: [0, 1, 4], watashimo: [0, 1, 3, 4], hitoiki: [0, 3] }),
    myReactions: [],
    timestamp: postTimestamp(3, 2),
  },
];

// 発表体験用の架空の住人。実ユーザーの利用実績ではありません。
const DEMO_VOICES = [
  [
    "こもれびママ",
    "お昼寝のあいだに温かいお茶。今日はこれだけで満点です🍵"
  ],
  [
    "ゆずパパ",
    "初めて二人でお散歩。短い時間だけどいい気分転換になった！"
  ],
  [
    "ももママ",
    "絵本を持ってきて「もういっかい」。何回でも読みたくなります"
  ],
  [
    "ななパパ",
    "今日はごはんを作るのをお休み。お惣菜にも助けてもらおう"
  ],
  [
    "つむぎママ",
    "寝かしつけに苦戦中。同じ時間に頑張っている人がいると心強いな"
  ],
  [
    "ふうママ",
    "公園でどんぐりを発見！小さな手にいっぱい集めていました"
  ],
  [
    "はるパパ",
    "保育園の準備、少しずつ進めています。名前つけが大仕事ですね"
  ],
  [
    "すずママ",
    "雨の日はおうちで新聞紙あそび。びりびりするだけで大喜び！"
  ],
  [
    "みかんママ",
    "図書館のおはなし会が気になります。初参加、ちょっとどきどき"
  ],
  [
    "そよかぜパパ",
    "今日は靴を自分ではけました。ゆっくり待ってよかった☺️"
  ],
  [
    "あんずママ",
    "休日は親子でおやつ作り。形はいろいろ、味は花まる！"
  ],
  [
    "ひなたパパ",
    "朝からばたばた。ひろばでちょっと深呼吸していきます"
  ],
  [
    "こはるママ",
    "ベビーカーで遠回りしたら、きれいな花を見つけました🌼"
  ],
  [
    "くるみママ",
    "離乳食を食べない日もあるよね。今日は焦らずいこう"
  ],
  [
    "あおぞらパパ",
    "子どもの寝顔を見ながら、今日も一日よく頑張ったと思う"
  ],
  [
    "まめママ",
    "支援センターでお話しできて、気持ちが軽くなりました"
  ],
  [
    "さくらママ",
    "おむつと着替えを準備して、明日は久しぶりのお出かけ！"
  ],
  [
    "いとパパ",
    "パパと子どもでお留守番。二人のペースもできてきました"
  ],
  [
    "つきママ",
    "ひとりの時間が少しほしい。ここで言葉にしたらほっとした"
  ],
  [
    "わかばパパ",
    "散歩中の「ばいばい」が上手になりました。成長がうれしい"
  ],
  [
    "おひさまママ",
    "今日は家事より一緒にごろごろ。そんな日もいいよね"
  ],
  [
    "にじママ",
    "好きな歌が流れると手をぱちぱち。小さなライブが毎日開催中♪"
  ],
  [
    "どんぐりパパ",
    "夜中に起きた仲間のみなさん、おつかれさま。明日はゆっくり"
  ],
  [
    "うみママ",
    "近くの無料イベントを探しています。掲示板が便利ですね"
  ],
  [
    "ほしママ",
    "おもちゃより箱がお気に入り。今日も探検が止まりません"
  ],
  [
    "ぽかぽかパパ",
    "家族でお弁当を持ってお散歩。外で食べるとおいしいね"
  ],
  [
    "ふたばママ",
    "初めて手をつないで歩きました。忘れたくない一日です"
  ],
  [
    "しろくまパパ",
    "子育てに正解は一つじゃないね。今日も自分たちのペースで🌿"
  ]
] as const;

export const INITIAL_POSTS: Post[] = [
  ...ORIGINAL_POSTS,
  ...DEMO_VOICES.map(([nickname, text], index) => {
    const offset = index + ORIGINAL_POSTS.length + 1;
    return {
      id: `post-${String(offset).padStart(2, "0")}`,
      userId: `du-${String(offset).padStart(2, "0")}`,
      nickname,
      avatar: postAvatar(index % AVATARS.length, nickname),
      text,
      reactions: makeReactions({ wakaru: 2 + index % 4, otsukare: 1 + index % 3, ouen: 2 }),
      reactionUsers: makeReactionUsers({ wakaru: Array.from({ length: 2 + index % 4 }, (_, i) => i), otsukare: Array.from({ length: 1 + index % 3 }, (_, i) => i), ouen: [0, 3] }),
      myReactions: [],
      timestamp: postTimestamp(0, index % 18),
    };
  }),
];
