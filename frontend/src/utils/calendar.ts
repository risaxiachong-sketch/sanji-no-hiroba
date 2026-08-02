import type { Event } from '../types'

const JAPAN_TIME_ZONE = 'Asia/Tokyo'
const TOKYO_UTC_OFFSET_MS = 9 * 60 * 60 * 1000
const TIME_RANGE_PATTERN = /^(\d{1,2}):(\d{2})\s*[〜～~]\s*(\d{1,2}):(\d{2})$/

export interface DateTimeParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export interface CalendarEventDraft {
  id: string
  title: string
  start: DateTimeParts
  end: DateTimeParts
  location: string
  description: string
  officialUrl: string
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

function parseDate(date: string): Pick<DateTimeParts, 'year' | 'month' | 'day'> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return isValidDate(year, month, day) ? { year, month, day } : null
}

function isValidTime(hour: number, minute: number) {
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60
}

function parseTimeRange(time: string): Pick<CalendarEventDraft, 'start' | 'end'> | null {
  const match = TIME_RANGE_PATTERN.exec(time.trim())
  if (!match) return null

  const startHour = Number(match[1])
  const startMinute = Number(match[2])
  const endHour = Number(match[3])
  const endMinute = Number(match[4])
  if (!isValidTime(startHour, startMinute) || !isValidTime(endHour, endMinute)) return null

  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute
  if (endMinutes <= startMinutes) return null

  return {
    start: { year: 0, month: 0, day: 0, hour: startHour, minute: startMinute },
    end: { year: 0, month: 0, day: 0, hour: endHour, minute: endMinute },
  }
}

function formatFacilities(event: Event) {
  const facilities = [
    event.nursingRoom && '授乳室',
    event.diaperChange && 'おむつ交換台',
    event.strollerOk && 'ベビーカーOK',
    event.indoor && '屋内',
  ].filter(Boolean)

  return facilities.length > 0 ? facilities.join('・') : '情報なし'
}

function buildDescription(event: Event) {
  return [
    `イベント内容：${event.description}`,
    `対象：${event.ageRange}の親子`,
    `参加費：${event.priceLabel}`,
    `予約：${event.reservationRequired ? '要予約' : '予約不要'}`,
    `施設設備：${formatFacilities(event)}`,
    `情報提供元：${event.source}`,
    `最終確認日：${event.lastConfirmed}`,
    `公式情報：${event.officialUrl}`,
  ].join('\n')
}

/** Returns null when the source event does not have a valid same-day time range. */
export function createCalendarEventDraft(event: Event): CalendarEventDraft | null {
  const date = parseDate(event.date)
  const timeRange = parseTimeRange(event.time)
  if (!date || !timeRange) return null

  return {
    id: event.id,
    title: event.title,
    start: { ...date, hour: timeRange.start.hour, minute: timeRange.start.minute },
    end: { ...date, hour: timeRange.end.hour, minute: timeRange.end.minute },
    location: `${event.location} ${event.address}`.trim(),
    description: buildDescription(event),
    officialUrl: event.officialUrl,
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatCalendarDateTime(dateTime: DateTimeParts) {
  return `${dateTime.year}${pad(dateTime.month)}${pad(dateTime.day)}T${pad(dateTime.hour)}${pad(dateTime.minute)}00`
}

function formatGoogleCalendarDateTime(dateTime: DateTimeParts) {
  const utcDate = new Date(
    Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day, dateTime.hour, dateTime.minute) - TOKYO_UTC_OFFSET_MS,
  )

  return `${utcDate.getUTCFullYear()}${pad(utcDate.getUTCMonth() + 1)}${pad(utcDate.getUTCDate())}`
    + `T${pad(utcDate.getUTCHours())}${pad(utcDate.getUTCMinutes())}00Z`
}

/** Builds Google's event composer URL. The event is not created until the user saves it in Google Calendar. */
export function buildGoogleCalendarUrl(event: CalendarEventDraft) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleCalendarDateTime(event.start)}/${formatGoogleCalendarDateTime(event.end)}`,
    location: event.location,
    details: event.description,
    stz: JAPAN_TIME_ZONE,
    etz: JAPAN_TIME_ZONE,
  })

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function formatIcsTimestamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

/** Builds an iCalendar file which requires the user's final import confirmation in their calendar app. */
export function buildAppleCalendarIcs(event: CalendarEventDraft, now = new Date()) {
  const safeId = event.id.replace(/[^A-Za-z0-9._-]/g, '-')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Sanji no Hiroba//Calendar Export//JA',
    'BEGIN:VEVENT',
    `UID:${safeId}@sanji-no-hiroba.local`,
    `DTSTAMP:${formatIcsTimestamp(now)}`,
    `DTSTART;TZID=${JAPAN_TIME_ZONE}:${formatCalendarDateTime(event.start)}`,
    `DTEND;TZID=${JAPAN_TIME_ZONE}:${formatCalendarDateTime(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `URL:${escapeIcsText(event.officialUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return `${lines.join('\r\n')}\r\n`
}

export function getCalendarFileName(event: CalendarEventDraft) {
  const safeId = event.id.replace(/[^A-Za-z0-9._-]/g, '-')
  return `sanji-no-hiroba-${safeId}.ics`
}
