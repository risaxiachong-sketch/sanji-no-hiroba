import type { Post, ReactionType } from '../types'
import { INITIAL_POSTS } from '../data/posts'
import { AVATARS } from '../data/avatars'
import { apiGet, apiPost, USE_MOCK } from './client'

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
  if (USE_MOCK) return { posts: INITIAL_POSTS, nextCursor: null }
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const response = await apiGet<FetchPostsResponse>(`/posts${params}`)
  return { ...response, posts: response.posts.map(hydrate) }
}

export async function createPost(text: string): Promise<Post> {
  if (USE_MOCK) {
    return {
      ...INITIAL_POSTS[0],
      id: `post-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      reactions: Object.fromEntries(Object.keys(INITIAL_POSTS[0].reactions).map((key) => [key, 0])) as Record<ReactionType, number>,
      myReactions: [],
    }
  }
  return hydrate(await apiPost<RawPost>('/posts', { text }))
}
