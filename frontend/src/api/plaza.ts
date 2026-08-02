import type { DummyUser } from '../types'
import { AVATARS } from '../data/avatars'
import { apiGet, USE_MOCK } from './client'
import { DUMMY_USERS } from '../data/dummyUsers'

interface RecentUser {
  userId: string
  nickname: string
  avatarId: string
  latestPost: string
  lastPostedAt: string
}

export async function fetchRecentPlazaUsers(days = 7): Promise<DummyUser[]> {
  if (USE_MOCK) return DUMMY_USERS
  const response = await apiGet<{ users: RecentUser[] }>(`/plaza/recent-users?days=${days}`)
  return response.users.map((user, index) => ({
    id: user.userId,
    avatar: AVATARS.find((avatar) => avatar.id === user.avatarId) ?? AVATARS[0],
    message: user.latestPost,
    x: 10 + ((index * 23) % 80),
    y: 18 + ((index * 31) % 65),
  }))
}
