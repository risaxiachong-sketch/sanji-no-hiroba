// ===================================================
// 投稿 API
// ===================================================

import type { Post } from '../types';
import { INITIAL_POSTS } from '../data/posts';
import { USE_MOCK, apiGet, apiPost } from './client';

/** GET /posts レスポンス型 */
interface FetchPostsResponse {
  posts: Post[];
  nextCursor: string | null;
}

/** POST /posts リクエストボディ */
interface CreatePostBody {
  text: string;
  nickname: string;
  avatarId: string;
  userId: string;
}

/**
 * 投稿一覧を取得する
 */
export async function fetchPosts(cursor?: string): Promise<FetchPostsResponse> {
  if (USE_MOCK) {
    return { posts: INITIAL_POSTS, nextCursor: null };
  }
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiGet<FetchPostsResponse>(`/posts${params}`);
}

/**
 * 投稿を登録する
 */
export async function createPost(body: CreatePostBody): Promise<Post> {
  if (USE_MOCK) {
    // ローカルでダミー投稿を生成して返す
    const newPost: Post = {
      id: `post-${Date.now()}`,
      nickname: body.nickname,
      avatar: { id: body.avatarId, emoji: '😊', label: body.nickname, color: '#e0f7fa' },
      text: body.text,
      reactions: {
        wakaru: 0, otsukare: 0, kokoniiruyo: 0, watashimo: 0,
        ouen: 0, kyoumo: 0, yokattane: 0, hitoiki: 0,
      },
      reactionUsers: {
        wakaru: [], otsukare: [], kokoniiruyo: [], watashimo: [],
        ouen: [], kyoumo: [], yokattane: [], hitoiki: [],
      },
      myReactions: [],
      timestamp: new Date().toISOString(),
    };
    return newPost;
  }
  return apiPost<Post>('/posts', body);
}
