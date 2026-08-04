import type { Event } from '../types'
import rhythmEventImage from '../assets/bulletin-board/rhythm-event.png'
import consultationImage from '../assets/bulletin-board/event-consultation.png'
import cookingImage from '../assets/bulletin-board/event-cooking.png'
import museumImage from '../assets/bulletin-board/event-museum.png'
import musicStoryImage from '../assets/bulletin-board/event-music-story.png'
import playroomImage from '../assets/bulletin-board/event-playroom.png'
import scienceImage from '../assets/bulletin-board/event-science.png'
import storytimeImage from '../assets/bulletin-board/event-storytime.png'

const EVENT_IMAGES: Record<string, string> = {
  'ev-01': rhythmEventImage,
  'ev-02': playroomImage,
  'ev-03': cookingImage,
  'ev-04': storytimeImage,
  'ev-05': storytimeImage,
  'ev-06': scienceImage,
  'ev-07': museumImage,
  'ev-08': playroomImage,
  'ev-09': playroomImage,
  'ev-10': consultationImage,
  'ev-11': playroomImage,
  'ev-12': musicStoryImage,
}

export function getEventImageUrl(event: Pick<Event, 'id' | 'imageUrl'>) {
  if (event.imageUrl && !event.imageUrl.includes('placehold.co')) return event.imageUrl
  return EVENT_IMAGES[event.id] ?? rhythmEventImage
}
