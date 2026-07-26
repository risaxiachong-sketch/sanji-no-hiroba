// ===================================================
// API クライアント共通基盤
// ===================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * VITE_API_BASE_URL が未設定の場合は true。
 * ダミーデータにフォールバックするためのフラグ。
 */
export const USE_MOCK = !API_BASE;

/**
 * API通信エラー
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * GET リクエスト
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

/**
 * POST リクエスト
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: { apiKey?: string },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.apiKey) headers['x-api-key'] = options.apiKey;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

/**
 * PUT リクエスト
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

/**
 * PATCH リクエスト
 */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: { apiKey?: string },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.apiKey) headers['x-api-key'] = options.apiKey;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

/**
 * DELETE リクエスト
 */
export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
}
