import type { Post, ReactionType } from '../types'
import { createDemoPost, readDemoPosts } from './demoStore'
import { AVATARS } from '../data/avatars'
import {
  addDoc,
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { ApiError, apiGet, apiPost, USE_FIREBASE, USE_MOCK } from './client'
import { firebaseApiError, getFirebaseContext } from './firebase'
import { loadFirebaseReactionsForPosts, REACTION_TYPES } from './reactions'
import { getFirebaseProfileForWrite } from './users'

interface RawPost {
  id: string
  text: string
  nickname: string
  avatarId: string
  userId?: string
  createdAt: string
  reactions: Record<ReactionType, number>
  myReactions: ReactionType[]
}

interface FetchPostsResponse {
  posts: RawPost[]
  nextCursor: string | null
}

interface FirebasePostCursor {
  seconds: number
  nanoseconds: number
  id: string
}

const FIREBASE_PAGE_SIZE = 20
let firstFirebasePageRequest: Promise<FetchPostsResponse> | null = null

function firebasePostFromUnknown(id: string, value: unknown): RawPost | null {
  if (typeof value !== 'object' || value === null) return null
  const data = value as Record<string, unknown>
  if (
    typeof data.userId !== 'string'
    || typeof data.nickname !== 'string'
    || typeof data.avatarId !== 'string'
    || typeof data.text !== 'string'
    || !(data.createdAt instanceof Timestamp)
  ) return null
  return {
    id,
    userId: data.userId,
    nickname: data.nickname,
    avatarId: data.avatarId,
    text: data.text,
    createdAt: data.createdAt.toDate().toISOString(),
    reactions: Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<ReactionType, number>,
    myReactions: [],
  }
}

function encodeCursor(cursor: FirebasePostCursor): string {
  return `${cursor.seconds}:${cursor.nanoseconds}:${cursor.id}`
}

function decodeCursor(value: string): FirebasePostCursor | null {
  const [secondsValue, nanosecondsValue, id] = value.split(':')
  const seconds = Number(secondsValue)
  const nanoseconds = Number(nanosecondsValue)
  if (!Number.isInteger(seconds) || !Number.isInteger(nanoseconds) || !id) return null
  return { seconds, nanoseconds, id }
}

async function fetchFirebasePosts(cursor?: string): Promise<FetchPostsResponse> {
  const { db, user } = await getFirebaseContext()
  const constraints: QueryConstraint[] = [
    orderBy('createdAt', 'desc'),
    orderBy(documentId(), 'desc'),
  ]
  if (cursor) {
    const parsed = decodeCursor(cursor)
    if (!parsed) throw new ApiError(400, '投稿のページ情報が不正です。')
    constraints.push(startAfter(new Timestamp(parsed.seconds, parsed.nanoseconds), parsed.id))
  }
  constraints.push(limit(FIREBASE_PAGE_SIZE))

  try {
    const snapshot = await getDocs(query(collection(db, 'posts'), ...constraints))
    const posts = snapshot.docs
      .map((postDocument) => firebasePostFromUnknown(postDocument.id, postDocument.data()))
      .filter((post): post is RawPost => post !== null)
    const reactionState = await loadFirebaseReactionsForPosts(posts.map((post) => post.id), user.uid)
    for (const post of posts) {
      const state = reactionState.get(post.id)
      if (!state) continue
      post.reactions = state.counts
      post.myReactions = state.myReactions
    }

    const lastDocument = snapshot.docs.at(-1)
    const lastCreatedAt = lastDocument?.get('createdAt')
    const nextCursor = snapshot.size === FIREBASE_PAGE_SIZE && lastDocument && lastCreatedAt instanceof Timestamp
      ? encodeCursor({
          seconds: lastCreatedAt.seconds,
          nanoseconds: lastCreatedAt.nanoseconds,
          id: lastDocument.id,
        })
      : null
    return { posts, nextCursor }
  } catch (cause) {
    throw firebaseApiError(cause, '投稿を読み込めませんでした。')
  }
}

function hydrate(post: RawPost): Post {
  return {
    ...post,
    avatar: AVATARS.find((avatar) => avatar.id === post.avatarId) ?? AVATARS[0],
    reactionUsers: {
      wakaru: [], otsukare: [], kokoniiruyo: [], watashimo: [],
      ouen: [], kyoumo: [], yokattane: [], hitoiki: [],
    },
  }
}

export async function fetchPosts(cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
  if (USE_MOCK) return { posts: readDemoPosts(), nextCursor: null }
  if (USE_FIREBASE) {
    if (cursor) {
      const response = await fetchFirebasePosts(cursor)
      return { ...response, posts: response.posts.map(hydrate) }
    }
    if (!firstFirebasePageRequest) {
      const request = fetchFirebasePosts()
      firstFirebasePageRequest = request
      const clear = () => {
        if (firstFirebasePageRequest === request) firstFirebasePageRequest = null
      }
      void request.then(clear, clear)
    }
    const response = await firstFirebasePageRequest
    return { ...response, posts: response.posts.map(hydrate) }
  }
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const response = await apiGet<FetchPostsResponse>(`/posts${params}`)
  return { ...response, posts: response.posts.map(hydrate) }
}

export async function createPost(text: string): Promise<Post> {
  const normalizedText = text.trim()
  if (normalizedText.length === 0 || normalizedText.length > 60) {
    throw new ApiError(400, '投稿は1〜60文字で入力してください。')
  }
  if (USE_MOCK) return createDemoPost(normalizedText)
  if (USE_FIREBASE) {
    const { db, user } = await getFirebaseContext()
    const profile = await getFirebaseProfileForWrite(user.uid)
    try {
      const postDocument = await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        nickname: profile.nickname,
        avatarId: profile.avatarId,
        text: normalizedText,
        createdAt: serverTimestamp(),
      })
      return hydrate({
        id: postDocument.id,
        userId: user.uid,
        nickname: profile.nickname,
        avatarId: profile.avatarId,
        text: normalizedText,
        createdAt: new Date().toISOString(),
        reactions: Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<ReactionType, number>,
        myReactions: [],
      })
    } catch (cause) {
      throw firebaseApiError(cause, '投稿できませんでした。')
    }
  }
  return hydrate(await apiPost<RawPost>('/posts', { text: normalizedText }))
}
