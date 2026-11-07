import type { Post, Profile, ReactionType, ReactionUser } from '../types'
import { INITIAL_POSTS } from '../data/posts'
import { AVATARS } from '../data/avatars'
import { legacyProfileCacheKey } from './accountCache'

const POSTS_KEY = 'sanji-demo-posts-v1'
const REACTIONS_KEY = 'sanji-demo-reactions-v1'
const memory = new Map<string, string>()
function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key) ?? memory.get(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}
function write(key: string, value: unknown) {
  const serialized = JSON.stringify(value)
  memory.set(key, serialized)
  try { localStorage.setItem(key, serialized) } catch { /* Keep this session usable. */ }
}
export function demoProfile(): Profile | null {
  return read<Profile | null>(legacyProfileCacheKey(), null)
}
function currentReactionUser(): ReactionUser {
  const profile = demoProfile()
  const avatar = AVATARS.find((item) => item.id === profile?.avatarId) ?? AVATARS[0]
  return { id: profile?.userId ?? 'demo-self', nickname: profile?.nickname ?? 'あなた', avatarEmoji: avatar.emoji, avatarColor: avatar.color }
}
export function readDemoPosts(): Post[] {
  const saved = read<Post[]>(POSTS_KEY, [])
  const overrides = read<Record<string, ReactionType[]>>(REACTIONS_KEY, {})
  return [...(Array.isArray(saved) ? saved : []), ...INITIAL_POSTS].map((post) => {
    const mine = Array.isArray(overrides[post.id]) ? overrides[post.id] : []
    const reactions = { ...post.reactions }
    const reactionUsers = { ...post.reactionUsers }
    for (const type of mine) {
      if (!(type in reactions)) continue
      reactions[type] += 1
      reactionUsers[type] = [...reactionUsers[type], currentReactionUser()]
    }
    return { ...post, reactions, reactionUsers, myReactions: mine }
  })
}
export function createDemoPost(text: string): Post {
  const profile = demoProfile()
  const avatar = AVATARS.find((item) => item.id === profile?.avatarId) ?? AVATARS[0]
  const post: Post = {
    id: `demo-post-${crypto.randomUUID()}`, userId: profile?.userId ?? 'demo-self',
    nickname: profile?.nickname ?? 'あなた', avatar, avatarId: avatar.id, text,
    createdAt: new Date().toISOString(),
    reactions: { wakaru: 0, otsukare: 0, kokoniiruyo: 0, watashimo: 0, ouen: 0, kyoumo: 0, yokattane: 0, hitoiki: 0 },
    reactionUsers: { wakaru: [], otsukare: [], kokoniiruyo: [], watashimo: [], ouen: [], kyoumo: [], yokattane: [], hitoiki: [] },
    myReactions: [],
  }
  const saved = read<Post[]>(POSTS_KEY, [])
  write(POSTS_KEY, [post, ...(Array.isArray(saved) ? saved : [])].slice(0, 100))
  return post
}
export function setDemoReaction(postId: string, type: ReactionType, active: boolean) {
  const overrides = read<Record<string, ReactionType[]>>(REACTIONS_KEY, {})
  const mine = new Set(overrides[postId] ?? [])
  if (active) mine.add(type)
  else mine.delete(type)
  overrides[postId] = [...mine]
  write(REACTIONS_KEY, overrides)
}
