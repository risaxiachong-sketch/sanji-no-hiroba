import type { Post, ReactionType, ReactionUser } from '../types';

const dummyUsers: ReactionUser[] = [
  { id: 'u-01', nickname: 'ひまわりママ', avatarEmoji: '🌻', avatarColor: '#fff9c4' },
  { id: 'u-02', nickname: 'くまさんパパ', avatarEmoji: '🐻', avatarColor: '#ffe0b2' },
  { id: 'u-03', nickname: 'ことりちゃん', avatarEmoji: '🐦', avatarColor: '#e3f2fd' },
  { id: 'u-04', nickname: 'りんごママ', avatarEmoji: '🍎', avatarColor: '#ffcdd2' },
  { id: 'u-05', nickname: 'そらパパ', avatarEmoji: '☁️', avatarColor: '#e0f7fa' },
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

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-01',
    nickname: 'ひまわりママ',
    avatar: { id: 'avatar-sunflower', emoji: '🌻', label: 'ひまわりママ', color: '#fff9c4' },
    text: '今日は子どもがなかなか寝なくて、ちょっと疲れた…でも寝顔見たら癒された。',
    reactions: makeReactions({ wakaru: 3, otsukare: 2, kokoniiruyo: 1 }),
    reactionUsers: makeReactionUsers({ wakaru: [1, 2, 3], otsukare: [2, 4], kokoniiruyo: [3] }),
    myReactions: [],
    timestamp: '2025-01-15T21:30:00.000Z',
  },
  {
    id: 'post-02',
    nickname: 'くまさんパパ',
    avatar: { id: 'avatar-bear', emoji: '🐻', label: 'くまさんパパ', color: '#ffe0b2' },
    text: '初めての離乳食、全然食べてくれなかった。明日またチャレンジ！',
    reactions: makeReactions({ ouen: 2, watashimo: 3, otsukare: 1 }),
    reactionUsers: makeReactionUsers({ ouen: [0, 3], watashimo: [0, 2, 4], otsukare: [3] }),
    myReactions: [],
    timestamp: '2025-01-15T18:00:00.000Z',
  },
  {
    id: 'post-03',
    nickname: 'ことりちゃん',
    avatar: { id: 'avatar-bird', emoji: '🐦', label: 'ことりちゃん', color: '#e3f2fd' },
    text: '公園でママ友できた！嬉しい。子ども同士も仲良くなれそう。',
    reactions: makeReactions({ yokattane: 4, ouen: 1, wakaru: 1 }),
    reactionUsers: makeReactionUsers({ yokattane: [0, 1, 3, 4], ouen: [1], wakaru: [4] }),
    myReactions: [],
    timestamp: '2025-01-15T15:20:00.000Z',
  },
  {
    id: 'post-04',
    nickname: 'りんごママ',
    avatar: { id: 'avatar-apple', emoji: '🍎', label: 'りんごママ', color: '#ffcdd2' },
    text: '雨の日が続いてお出かけできない…室内遊びのネタが尽きてきた。',
    reactions: makeReactions({ watashimo: 2, hitoiki: 3, kokoniiruyo: 1 }),
    reactionUsers: makeReactionUsers({ watashimo: [1, 2], hitoiki: [0, 2, 4], kokoniiruyo: [1] }),
    myReactions: [],
    timestamp: '2025-01-15T12:45:00.000Z',
  },
  {
    id: 'post-05',
    nickname: 'そらパパ',
    avatar: { id: 'avatar-cloud', emoji: '☁️', label: 'そらパパ', color: '#e0f7fa' },
    text: '子どもが「パパ」って初めて言った！感動で泣きそうになった。',
    reactions: makeReactions({ yokattane: 5, ouen: 2, kyoumo: 1 }),
    reactionUsers: makeReactionUsers({ yokattane: [0, 1, 2, 3, 4], ouen: [0, 3], kyoumo: [2] }),
    myReactions: [],
    timestamp: '2025-01-15T09:10:00.000Z',
  },
  {
    id: 'post-06',
    nickname: 'ひまわりママ',
    avatar: { id: 'avatar-sunflower', emoji: '🌻', label: 'ひまわりママ', color: '#fff9c4' },
    text: '今週末のリトミック教室、行ってみようかな。同じくらいの月齢の子いるかな。',
    reactions: makeReactions({ wakaru: 1, ouen: 2, watashimo: 1 }),
    reactionUsers: makeReactionUsers({ wakaru: [4], ouen: [1, 2], watashimo: [3] }),
    myReactions: [],
    timestamp: '2025-01-14T20:00:00.000Z',
  },
  {
    id: 'post-07',
    nickname: 'ことりちゃん',
    avatar: { id: 'avatar-bird', emoji: '🐦', label: 'ことりちゃん', color: '#e3f2fd' },
    text: '夜泣きが続いてつらい…同じ経験の方いますか？',
    reactions: makeReactions({ kokoniiruyo: 3, watashimo: 4, hitoiki: 2 }),
    reactionUsers: makeReactionUsers({ kokoniiruyo: [0, 1, 4], watashimo: [0, 1, 3, 4], hitoiki: [0, 3] }),
    myReactions: [],
    timestamp: '2025-01-14T23:30:00.000Z',
  },
];
