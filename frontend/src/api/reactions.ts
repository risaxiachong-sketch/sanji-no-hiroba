import type { ReactionType, ReactionUser } from '../types'
import { AVATARS } from '../data/avatars'
import { apiDelete, apiGet, apiPost, USE_MOCK } from './client'

interface RawReaction {
  userId: string
  nickname: string
  avatarId: string
  emoji: ReactionType
}

export async function addReaction(postId: string, type: ReactionType): Promise<void> {
  if (!USE_MOCK) {
    await apiPost(`/posts/${encodeURIComponent(postId)}/reactions/${encodeURIComponent(type)}`, {})
  }
}

export async function removeReaction(postId: string, type: ReactionType): Promise<void> {
  if (!USE_MOCK) {
    await apiDelete(`/posts/${encodeURIComponent(postId)}/reactions/${encodeURIComponent(type)}`)
  }
}

export async function fetchReactionUsers(postId: string, type: ReactionType): Promise<ReactionUser[]> {
  if (USE_MOCK) return []
  const response = await apiGet<{ reactions: RawReaction[] }>(
    `/posts/${encodeURIComponent(postId)}/reactions?type=${encodeURIComponent(type)}`,
  )
  return response.reactions.map((reaction) => {
    const avatar = AVATARS.find((option) => option.id === reaction.avatarId) ?? AVATARS[0]
    return {
      id: reaction.userId,
      nickname: reaction.nickname,
      avatarEmoji: avatar.emoji,
      avatarColor: avatar.color,
    }
  })
}
