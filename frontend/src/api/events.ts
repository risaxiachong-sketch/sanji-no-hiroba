// ===================================================
// イベント API
// ===================================================

import type { Event, EventStatus } from '../types';
import { EVENTS } from '../data/events';
import { USE_MOCK, apiGet, apiPost, apiPatch } from './client';

/** イベント一覧レスポンス */
interface FetchEventsResponse {
  events: Event[];
}

/** イベント登録リクエスト */
interface CreateEventBody {
  providerName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ageGroup: string;
  location: string;
  description: string;
  tags: string[];
  officialUrl?: string;
  imageUrl?: string;
}

/** イベント登録レスポンス */
interface CreateEventResponse {
  eventId: string;
  status: string;
  createdAt: string;
}

/** 状態変更レスポンス */
interface UpdateStatusResponse {
  eventId: string;
  status: string;
  updatedAt: string;
}

/** 署名付きURL取得レスポンス */
interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * イベント一覧を取得する
 * ids指定時は「行ってみたい」一覧用
 */
export async function fetchEvents(ids?: string[]): Promise<FetchEventsResponse> {
  if (USE_MOCK) {
    if (ids && ids.length > 0) {
      const filtered = EVENTS.filter(e => ids.includes(e.id));
      return { events: filtered };
    }
    return { events: EVENTS };
  }
  const params = ids && ids.length > 0 ? `?ids=${ids.join(',')}` : '';
  return apiGet<FetchEventsResponse>(`/events${params}`);
}

/**
 * イベント詳細を取得する
 */
export async function fetchEvent(id: string): Promise<Event> {
  if (USE_MOCK) {
    const event = EVENTS.find(e => e.id === id);
    if (!event) throw new Error(`Event not found: ${id}`);
    return event;
  }
  return apiGet<Event>(`/events/${encodeURIComponent(id)}`);
}

/**
 * イベントを登録する（施設側・APIキー必須）
 */
export async function createEvent(body: CreateEventBody, apiKey: string): Promise<CreateEventResponse> {
  if (USE_MOCK) {
    return {
      eventId: `ev-${Date.now()}`,
      status: '開催予定',
      createdAt: new Date().toISOString(),
    };
  }
  return apiPost<CreateEventResponse>('/admin/events', body, { apiKey });
}

/**
 * イベントの開催状態を変更する（施設側・APIキー必須）
 */
export async function updateEventStatus(
  id: string,
  status: EventStatus,
  apiKey: string,
): Promise<UpdateStatusResponse> {
  if (USE_MOCK) {
    return {
      eventId: id,
      status,
      updatedAt: new Date().toISOString(),
    };
  }
  return apiPatch<UpdateStatusResponse>(
    `/admin/events/${encodeURIComponent(id)}/status`,
    { status },
    { apiKey },
  );
}

/**
 * 画像アップロード用署名付きURLを取得する（施設側・APIキー必須）
 */
export async function getUploadUrl(
  contentType: string,
  fileSize: number,
  apiKey: string,
): Promise<UploadUrlResponse> {
  if (USE_MOCK) {
    return {
      uploadUrl: 'https://example.com/mock-upload-url',
      key: `events/mock-${Date.now()}/image.jpg`,
      expiresIn: 300,
    };
  }
  return apiPost<UploadUrlResponse>(
    '/admin/events/upload-url',
    { contentType, fileSize },
    { apiKey },
  );
}
