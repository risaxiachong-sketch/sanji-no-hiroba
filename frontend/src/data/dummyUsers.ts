import type { DummyUser } from '../types'
import { INITIAL_POSTS } from './posts'

// Share stable IDs with posts so every sample resident opens their own voice.
export const DUMMY_USERS: DummyUser[] = INITIAL_POSTS.slice(0, 8).map((post, index) => ({
  id: post.userId!,
  avatar: post.avatar,
  message: post.text,
  x: 10 + ((index * 23) % 80),
  y: 18 + ((index * 31) % 65),
}))
