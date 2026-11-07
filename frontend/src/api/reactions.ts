import { readDemoPosts, setDemoReaction } from './demoStore'
import type { ReactionType, ReactionUser } from '../types'
import { AVATARS } from '../data/avatars'
import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { apiDelete, apiGet, apiPost, USE_FIREBASE, USE_MOCK } from './client'
import { firebaseApiError, getFirebaseContext } from './firebase'
import { getFirebaseProfileForWrite } from './users'

interface RawReaction {
  userId: string
  nickname: string
  avatarId: string
  emoji: ReactionType
}

export const REACTION_TYPES: readonly ReactionType[] = [
  'wakaru',
  'otsukare',
  'kokoniiruyo',
  'watashimo',
  'ouen',
  'kyoumo',
  'yokattane',
  'hitoiki',
]

export interface FirebaseReactionState {
  counts: Record<ReactionType, number>
  myReactions: ReactionType[]
}

interface FirebaseReactionRecord extends RawReaction {
  postId: string
  type: ReactionType
}

const reactionUsersCache = new Map<string, ReactionUser[]>()

function cacheKey(postId: string, type: ReactionType): string {
  return `${postId}\u0000${type}`
}

function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && REACTION_TYPES.includes(value as ReactionType)
}

function firebaseReactionFromUnknown(value: unknown): FirebaseReactionRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  if (
    typeof data.postId !== 'string'
    || typeof data.userId !== 'string'
    || typeof data.nickname !== 'string'
    || typeof data.avatarId !== 'string'
    || !isReactionType(data.type)
  ) return null
  return {
    postId: data.postId,
    userId: data.userId,
    nickname: data.nickname,
    avatarId: data.avatarId,
    emoji: data.type,
    type: data.type,
  }
}

function reactionUser(reaction: RawReaction): ReactionUser {
  const avatar = AVATARS.find((option) => option.id === reaction.avatarId) ?? AVATARS[0]
  return {
    id: reaction.userId,
    nickname: reaction.nickname,
    avatarEmoji: avatar.emoji,
    avatarColor: avatar.color,
  }
}

function emptyReactionState(): FirebaseReactionState {
  return {
    counts: Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<ReactionType, number>,
    myReactions: [],
  }
}

export async function loadFirebaseReactionsForPosts(
  postIds: string[],
  currentUserId: string,
): Promise<Map<string, FirebaseReactionState>> {
  const state = new Map(postIds.map((postId) => [postId, emptyReactionState()]))
  if (postIds.length === 0) return state
  const { db } = await getFirebaseContext()

  for (const postId of postIds) {
    for (const type of REACTION_TYPES) reactionUsersCache.set(cacheKey(postId, type), [])
  }

  try {
    // Ten IDs per query works across older and newer Firestore clients and keeps
    // the number of requests bounded to two for the 20-post page.
    for (let offset = 0; offset < postIds.length; offset += 10) {
      const chunk = postIds.slice(offset, offset + 10)
      const snapshot = await getDocs(query(
        collection(db, 'reactions'),
        where('postId', 'in', chunk),
        limit(400),
      ))
      for (const reactionDocument of snapshot.docs) {
        const reaction = firebaseReactionFromUnknown(reactionDocument.data())
        if (!reaction) continue
        const postState = state.get(reaction.postId)
        if (!postState) continue
        postState.counts[reaction.type] += 1
        if (reaction.userId === currentUserId) postState.myReactions.push(reaction.type)
        const key = cacheKey(reaction.postId, reaction.type)
        reactionUsersCache.get(key)?.push(reactionUser(reaction))
      }
    }
    return state
  } catch (cause) {
    throw firebaseApiError(cause, 'リアクションを読み込めませんでした。')
  }
}

export async function addReaction(postId: string, type: ReactionType): Promise<void> {
  if (USE_MOCK) { setDemoReaction(postId, type, true); return }
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    const profile = await getFirebaseProfileForWrite(user.uid)
    const reactionId = `${postId}__${user.uid}__${type}`
    try {
      await setDoc(doc(db, 'reactions', reactionId), {
        postId,
        userId: user.uid,
        nickname: profile.nickname,
        avatarId: profile.avatarId,
        type,
        createdAt: serverTimestamp(),
      })
      reactionUsersCache.delete(cacheKey(postId, type))
    } catch (cause) {
      throw firebaseApiError(cause, 'リアクションを追加できませんでした。')
    }
  } else if (!USE_MOCK) {
    await apiPost(`/posts/${encodeURIComponent(postId)}/reactions/${encodeURIComponent(type)}`, {})
  }
}

export async function removeReaction(postId: string, type: ReactionType): Promise<void> {
  if (USE_MOCK) { setDemoReaction(postId, type, false); return }
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    const reactionId = `${postId}__${user.uid}__${type}`
    try {
      await deleteDoc(doc(db, 'reactions', reactionId))
      reactionUsersCache.delete(cacheKey(postId, type))
    } catch (cause) {
      throw firebaseApiError(cause, 'リアクションを削除できませんでした。')
    }
  } else if (!USE_MOCK) {
    await apiDelete(`/posts/${encodeURIComponent(postId)}/reactions/${encodeURIComponent(type)}`)
  }
}

export async function fetchReactionUsers(postId: string, type: ReactionType): Promise<ReactionUser[]> {
  if (USE_MOCK) return readDemoPosts().find((post) => post.id === postId)?.reactionUsers[type] ?? []
  if (USE_FIREBASE) {
    const existing = reactionUsersCache.get(cacheKey(postId, type))
    if (existing) return [...existing]
    const { db } = await getFirebaseContext()
    try {
      const snapshot = await getDocs(query(
        collection(db, 'reactions'),
        where('postId', '==', postId),
        limit(200),
      ))
      const grouped = new Map(REACTION_TYPES.map((reactionType) => [reactionType, [] as ReactionUser[]]))
      for (const reactionDocument of snapshot.docs) {
        const reaction = firebaseReactionFromUnknown(reactionDocument.data())
        if (!reaction) continue
        grouped.get(reaction.type)?.push(reactionUser(reaction))
      }
      for (const reactionType of REACTION_TYPES) {
        reactionUsersCache.set(cacheKey(postId, reactionType), grouped.get(reactionType) ?? [])
      }
      return [...(grouped.get(type) ?? [])]
    } catch (cause) {
      throw firebaseApiError(cause, 'リアクションした人を読み込めませんでした。')
    }
  }
  const response = await apiGet<{ reactions: RawReaction[] }>(
    `/posts/${encodeURIComponent(postId)}/reactions?type=${encodeURIComponent(type)}`,
  )
  return response.reactions.map(reactionUser)
}
