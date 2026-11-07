import type { DummyUser } from '../types'
import { AVATARS } from '../data/avatars'
import { apiGet, USE_FIREBASE, USE_MOCK } from './client'
import { DUMMY_USERS } from '../data/dummyUsers'
import { fetchPosts } from './posts'

interface RecentUser {
  userId: string
  nickname: string
  avatarId: string
  latestPost: string
  lastPostedAt: string
}

export async function fetchRecentPlazaUsers(days = 7): Promise<DummyUser[]> {
  if (USE_MOCK) return DUMMY_USERS
  if (USE_FIREBASE) {
    const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000
    const { posts } = await fetchPosts()
    const seen = new Set<string>()
    return posts.flatMap((post) => {
      const postedAt = post.createdAt ?? post.timestamp
      if (
        !post.userId
        || seen.has(post.userId)
        || !postedAt
        || new Date(postedAt).getTime() < cutoff
      ) return []
      seen.add(post.userId)
      const index = seen.size - 1
      return [{
        id: post.userId,
        avatar: post.avatar,
        message: post.text,
        x: 10 + ((index * 23) % 80),
        y: 18 + ((index * 31) % 65),
      }]
    })
  }
  const response = await apiGet<{ users: RecentUser[] }>(`/plaza/recent-users?days=${days}`)
  return response.users.map((user, index) => ({
    id: user.userId,
    avatar: AVATARS.find((avatar) => avatar.id === user.avatarId) ?? AVATARS[0],
    message: user.latestPost,
    x: 10 + ((index * 23) % 80),
    y: 18 + ((index * 31) % 65),
  }))
}
