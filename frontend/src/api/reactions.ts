// ===================================================
// リアクション API
// ===================================================

import type { ReactionType } from '../types';
import { USE_MOCK, apiGet, apiPost, apiPut, apiDelete } from './client';

/** リアクション登録リクエスト */
interface CreateReactionBody {
  postId: string;
  emoji: ReactionType;
  userId: string;
  nickname: string;
  avatarId: string;
}

/** リアクション変更リクエスト */
interface UpdateReactionBody {
  emoji: ReactionType;
}

/** リアクション取得レスポンスの個別アイテム */
interface ReactionItem {
  id: string;
  userId: string;
  nickname: string;
  avatarId: string;
  emoji: ReactionType;
  createdAt: string;
}

/** リアクション取得レスポンス */
interface FetchReactionsResponse {
  reactions: ReactionItem[];
}

/** リアクション作成レスポンス */
interface CreateReactionResponse {
  id: string;
  postId: string;
  emoji: ReactionType;
  userId: string;
  createdAt: string;
}

/**
 * リアクション登録
 */
export async function createReaction(body: CreateReactionBody): Promise<CreateReactionResponse> {
  if (USE_MOCK) {
    return {
      id: `reaction-${Date.now()}`,
      postId: body.postId,
      emoji: body.emoji,
      userId: body.userId,
      createdAt: new Date().toISOString(),
    };
  }
  return apiPost<CreateReactionResponse>('/reactions', body);
}

/**
 * リアクション変更
 */
export async function updateReaction(id: string, body: UpdateReactionBody): Promise<ReactionItem> {
  if (USE_MOCK) {
    return {
      id,
      userId: '',
      nickname: '',
      avatarId: '',
      emoji: body.emoji,
      createdAt: new Date().toISOString(),
    };
  }
  return apiPut<ReactionItem>(`/reactions/${encodeURIComponent(id)}`, body);
}

/**
 * リアクション取消
 */
export async function deleteReaction(id: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  return apiDelete(`/reactions/${encodeURIComponent(id)}`);
}

/**
 * リアクション取得（投稿ID・絵文字でフィルタ）
 */
export async function fetchReactions(postId: string, emoji?: ReactionType): Promise<FetchReactionsResponse> {
  if (USE_MOCK) {
    return { reactions: [] };
  }
  const params = new URLSearchParams({ postId });
  if (emoji) params.set('emoji', emoji);
  return apiGet<FetchReactionsResponse>(`/reactions?${params.toString()}`);
}
