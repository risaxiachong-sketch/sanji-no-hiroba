/**
 * バリデーション関数群
 * Lambda関数で共通利用するリクエストボディ・ヘッダーの検証ロジック
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

/** 有効なリアクション種別（8種類） */
export const VALID_EMOJIS = [
  'wakaru',
  'otsukare',
  'kokoniiruyo',
  'watashimo',
  'ouen',
  'kyoumo',
  'yokattane',
  'hitoiki',
] as const;

/** 有効なイベント開催状態（5種類） */
export const VALID_STATUSES = ['開催予定', '中止', '延期', '受付終了', '開催終了'] as const;

export type Emoji = (typeof VALID_EMOJIS)[number];
export type EventStatus = (typeof VALID_STATUSES)[number];

/**
 * 投稿のバリデーション
 * - text: 1〜60文字、空白のみ不可
 * - nickname, avatarId, userId: 必須
 */
export function validatePost(body: {
  text?: string;
  nickname?: string;
  avatarId?: string;
  userId?: string;
}): ValidationResult {
  const { text, nickname, avatarId, userId } = body;

  if (!nickname) {
    return { valid: false, error: 'ニックネームは必須です' };
  }
  if (!avatarId) {
    return { valid: false, error: 'アバターIDは必須です' };
  }
  if (!userId) {
    return { valid: false, error: 'ユーザーIDは必須です' };
  }
  if (!text || text.trim().length === 0) {
    return { valid: false, error: '投稿テキストは1〜60文字で入力してください' };
  }
  if (text.length > 60) {
    return { valid: false, error: '投稿テキストは1〜60文字で入力してください' };
  }

  return { valid: true };
}

/**
 * リアクションのバリデーション
 * - postId, userId: 必須
 * - emoji: VALID_EMOJIS のいずれか
 */
export function validateReaction(body: {
  postId?: string;
  emoji?: string;
  userId?: string;
}): ValidationResult {
  const { postId, emoji, userId } = body;

  if (!postId) {
    return { valid: false, error: '投稿IDは必須です' };
  }
  if (!userId) {
    return { valid: false, error: 'ユーザーIDは必須です' };
  }
  if (!emoji || !(VALID_EMOJIS as readonly string[]).includes(emoji)) {
    return { valid: false, error: '無効なリアクション種別です' };
  }

  return { valid: true };
}

/**
 * イベントのバリデーション
 * - eventName: 1〜100文字
 * - eventDate: YYYY-MM-DD形式
 * - providerName, startTime, endTime, ageGroup, location: 必須
 */
export function validateEvent(body: {
  eventName?: string;
  eventDate?: string;
  providerName?: string;
  startTime?: string;
  endTime?: string;
  ageGroup?: string;
  location?: string;
}): ValidationResult {
  const { eventName, eventDate, providerName, startTime, endTime, ageGroup, location } = body;

  if (!providerName) {
    return { valid: false, error: '提供者名は必須です' };
  }
  if (!eventName || eventName.trim().length === 0) {
    return { valid: false, error: 'イベント名は1〜100文字で入力してください' };
  }
  if (eventName.length > 100) {
    return { valid: false, error: 'イベント名は1〜100文字で入力してください' };
  }
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return { valid: false, error: '開催日の形式が不正です' };
  }
  if (!startTime) {
    return { valid: false, error: '開始時間は必須です' };
  }
  if (!endTime) {
    return { valid: false, error: '終了時間は必須です' };
  }
  if (!ageGroup) {
    return { valid: false, error: '対象年齢区分は必須です' };
  }
  if (!location) {
    return { valid: false, error: '開催場所は必須です' };
  }

  return { valid: true };
}

/**
 * アップロードのバリデーション
 * - contentType: "image/jpeg" or "image/png"
 * - fileSize: 1〜5,242,880 bytes
 */
export function validateUpload(body: {
  contentType?: string;
  fileSize?: number;
}): ValidationResult {
  const { contentType, fileSize } = body;

  if (!contentType || !['image/jpeg', 'image/png'].includes(contentType)) {
    return { valid: false, error: 'JPEG または PNG のみアップロード可能です' };
  }
  if (fileSize === undefined || fileSize === null || fileSize < 1 || fileSize > 5_242_880) {
    return { valid: false, error: 'ファイルサイズは5MB以下にしてください' };
  }

  return { valid: true };
}

/**
 * APIキーのバリデーション
 * - headers['x-api-key'] が process.env.ADMIN_API_KEY と一致するか確認
 */
export function validateApiKey(
  headers: Record<string, string | undefined>,
  envKey?: string,
): ValidationResult {
  const apiKey = headers['x-api-key'];
  const expectedKey = envKey ?? process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return { valid: false, error: 'サーバー側のAPIキーが設定されていません' };
  }
  if (!apiKey || apiKey !== expectedKey) {
    return { valid: false, error: 'アクセス権限がありません' };
  }

  return { valid: true };
}
