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
  | 'adminEvent'

export interface Profile {
  userId: string
  nickname: string
  childAgeGroup: string
  avatarId: string
}

export interface Avatar {
  id: string
  emoji: string
  label: string
  color: string
  selectionImageUrl?: string
  mapSpriteUrl?: string
}

export type FacilityType =
  | 'community-center'
  | 'library'
  | 'museum'
  | 'childcare-center'
  | 'other'

export type EventStatus = 'scheduled' | 'canceled' | 'postponed' | 'closed' | 'ended'

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  scheduled: '開催予定',
  canceled: '中止',
  postponed: '延期',
  closed: '受付終了',
  ended: '開催終了',
}

export interface Event {
  id: string
  title: string
  date: string
  time: string
  ageMin: number
  ageMax: number
  ageRange: string
  location: string
  address: string
  facilityType: FacilityType
  price: 'free' | 'paid'
  priceLabel: string
  indoor: boolean
  reservationRequired: boolean
  nursingRoom: boolean
  diaperChange: boolean
  strollerOk: boolean
  source: string
  officialUrl: string
  lastConfirmed: string
  description: string
  status: EventStatus
  imageUrl?: string
}

export interface FilterCondition {
  date?: 'today' | 'tomorrow' | null
  childAge?: number | null
  price?: 'free' | null
  indoor?: boolean | null
  reservationRequired?: false | null
  facilityType?: FacilityType | null
}

export interface DummyUser {
  id: string
  avatar: Avatar
  message: string
  x: number
  y: number
}

export type ReactionType =
  | 'wakaru'
  | 'otsukare'
  | 'kokoniiruyo'
  | 'watashimo'
  | 'ouen'
  | 'kyoumo'
  | 'yokattane'
  | 'hitoiki'

export interface ReactionOption {
  value: ReactionType
  label: string
  emoji: string
}

export interface ReactionUser {
  id: string
  nickname: string
  avatarEmoji: string
  avatarColor: string
}

export interface Post {
  id: string
  userId?: string
  nickname: string
  avatarId?: string
  avatar: Avatar
  text: string
  reactions: Record<ReactionType, number>
  reactionUsers: Record<ReactionType, ReactionUser[]>
  myReactions: ReactionType[]
  createdAt?: string
  timestamp?: string
}
