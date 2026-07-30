// ===================================================
// 共通型定義
// ===================================================

/** 画面名 */
export type Page =
  | 'top'
  | 'profileSetup'
  | 'avatarSelect'
  | 'plaza'
  | 'bulletinBoard'
  | 'eventDetail'
  | 'savedEvents'
  | 'postArea'
  | 'settings'
  | 'settingsNickname'
  | 'settingsChildAge'
  | 'settingsAvatar'
  | 'adminEvent';

/** プロフィール（ニックネーム・お子さんの年齢区分） */
export interface Profile {
  nickname: string;
  childAgeGroup: string;
}

/** アバター */
export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  color: string; // パステル背景色
}

/** 施設種別 */
export type FacilityType =
  | 'community-center'  // 公民館
  | 'library'           // 図書館
  | 'museum'            // 博物館・科学館
  | 'childcare-center'  // 子育て支援施設・児童館
  | 'other';

/** イベント開催状態 */
export type EventStatus =
  | 'scheduled'   // 開催予定
  | 'canceled'    // 中止
  | 'postponed'   // 延期
  | 'closed'      // 受付終了
  | 'ended';      // 開催終了

/** イベント開催状態の日本語ラベル */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: '開催予定',
  canceled: '中止',
  postponed: '延期',
  closed: '受付終了',
  ended: '開催終了',
};

/** イベント */
export interface Event {
  id: string;
  title: string;
  date: string;                // "YYYY-MM-DD"
  time: string;                // "HH:MM〜HH:MM"
  ageMin: number;              // 対象年齢（歳）下限
  ageMax: number;              // 対象年齢（歳）上限
  ageRange: string;            // 表示用 "0〜3歳" など
  location: string;            // 施設名
  address: string;             // 住所
  facilityType: FacilityType;
  price: 'free' | 'paid';
  priceLabel: string;          // "無料" / "500円" など
  indoor: boolean;
  reservationRequired: boolean;
  nursingRoom: boolean;
  diaperChange: boolean;
  strollerOk: boolean;
  source: string;              // 情報提供元
  officialUrl: string;
  lastConfirmed: string;       // "YYYY-MM-DD"
  description: string;
  status: EventStatus;         // 開催状態
  imageUrl?: string;           // イベント画像URL（任意）
}

/** 絞り込み条件（AI検索・手動フィルター共通） */
export interface FilterCondition {
  date?: 'today' | 'tomorrow' | null;
  childAge?: number | null;
  price?: 'free' | null;
  indoor?: boolean | null;
  reservationRequired?: false | null; // false = 予約不要のみ
  facilityType?: FacilityType | null;
}

/** ダミーユーザー（広場内） */
export interface DummyUser {
  id: string;
  avatar: Avatar;
  message: string;   // 吹き出しテキスト
  x: number;         // 横位置（%）
  y: number;         // 縦位置（%）
}

/** リアクション種別（8種類） */
export type ReactionType =
  | 'wakaru'      // わかるよ
  | 'otsukare'    // おつかれさま
  | 'kokoniiruyo' // ここにいるよ
  | 'watashimo'   // 私も同じ
  | 'ouen'        // 応援してるよ
  | 'kyoumo'      // 今日もおつかれさま
  | 'yokattane'   // よかったね
  | 'hitoiki';    // ひと息ついてね

export interface ReactionOption {
  value: ReactionType;
  label: string;
  emoji: string;
}

/** リアクションしたユーザー情報 */
export interface ReactionUser {
  id: string;
  nickname: string;
  avatarEmoji: string;
  avatarColor: string;
}

/** 投稿 */
export interface Post {
  id: string;
  nickname: string;
  avatar: Avatar;
  text: string;
  reactions: Record<ReactionType, number>;
  reactionUsers: Record<ReactionType, ReactionUser[]>;
  myReactions: ReactionType[];
  timestamp: string;
}

