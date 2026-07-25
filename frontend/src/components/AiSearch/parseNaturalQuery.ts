import type { FilterCondition } from '../../types'

// ── 日付検出 ─────────────────────────────────────
function detectDate(text: string): FilterCondition['date'] {
  if (/今日|きょう|本日/.test(text)) return 'today'
  if (/明日|あした|あす/.test(text)) return 'tomorrow'
  return null
}

// ── 年齢検出 ─────────────────────────────────────
function detectAge(text: string): number | null {
  const m = text.match(/([0-3])\s*歳/)
  if (m) return parseInt(m[1], 10)
  if (/赤ちゃん|ねんね|ねんねの/.test(text)) return 0
  if (/よちよち|はいはい/.test(text)) return 1
  return null
}

// ── 料金検出 ─────────────────────────────────────
function detectPrice(text: string): 'free' | null {
  if (/無料|ただ|タダ|free|0円|０円/.test(text)) return 'free'
  return null
}

// ── 屋内検出 ─────────────────────────────────────
function detectIndoor(text: string): boolean | null {
  if (/屋内|室内|雨|雨の日|インドア/.test(text)) return true
  if (/屋外|外|公園|アウトドア/.test(text)) return false
  return null
}

// ── 予約不要検出 ──────────────────────────────────
function detectNoReservation(text: string): false | null {
  if (/予約不要|当日|飛び込み|申し込み不要|申込不要/.test(text)) return false
  return null
}

// ── 施設種別検出 ──────────────────────────────────
function detectFacilityType(text: string): FilterCondition['facilityType'] {
  if (/図書館|ライブラリ|本|読み聞かせ/.test(text)) return 'library'
  if (/博物館|科学館|ミュージアム|サイエンス/.test(text)) return 'museum'
  if (/公民館|コミュニティ/.test(text)) return 'community-center'
  if (/児童館|支援センター|子育てセンター/.test(text)) return 'childcare-center'
  return null
}

/**
 * 自然文から FilterCondition を抽出する。
 * 将来は Amazon Bedrock API 呼び出しに差し替えられる。
 */
export function parseNaturalQuery(text: string): FilterCondition {
  return {
    date:                detectDate(text),
    childAge:            detectAge(text),
    price:               detectPrice(text),
    indoor:              detectIndoor(text),
    reservationRequired: detectNoReservation(text),
    facilityType:        detectFacilityType(text),
  }
}
