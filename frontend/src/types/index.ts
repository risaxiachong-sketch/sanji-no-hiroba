// ===================================================
// 共通型定義
// ===================================================

/** 画面名 */
export type Page =
  | 'top'
  | 'avatarSelect'
  | 'moodSelect'
  | 'plaza'
  | 'bulletinBoard'
  | 'eventDetail'
  | 'savedEvents'
  | 'aiSearch'
  | 'supportInfo'
  | 'postArea'
  | 'exitResult';

/** アバター */
export interface Avatar {
  id: string;
  emoji: string;
  label: string;
  color: string; // パステル背景色
}

/** 気分・目的 */
export type Mood =
  | 'tired'      // ちょっと疲れた
  | 'presence'   // 誰かの気配を感じたい
  | 'outing'     // お出かけ先を探したい
  | 'talk'       // 少し話したい
  | 'observe';   // 見るだけ

export interface MoodOption {
  value: Mood;
  label: string;
  emoji: string;
  description: string;
}

/** 施設種別 */
export type FacilityType =
  | 'community-center'  // 公民館
  | 'library'           // 図書館
  | 'museum'            // 博物館・科学館
  | 'childcare-center'  // 子育て支援施設・児童館
  | 'other';

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

/** リアクション種別 */
export type ReactionType =
  | 'otsukare'  // おつかれさま
  | 'wakaru'    // わかるよ
  | 'koko'      // ここにいるよ
  | 'sotto';    // そっと見守る

export interface ReactionOption {
  value: ReactionType;
  label: string;
  emoji: string;
}

/** 投稿 */
export interface Post {
  id: string;
  avatar: Avatar;
  text: string;
  reactions: Record<ReactionType, number>;
  timestamp: string;
}

/** 相談・支援リンク */
export interface SupportLink {
  id: string;
  name: string;
  description: string;
  phone?: string;
  url: string;
  category: 'info' | 'consultation' | 'hotline' | 'facility';
}
