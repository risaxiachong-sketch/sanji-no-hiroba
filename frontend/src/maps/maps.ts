import gardenMap from '../assets/plaza-2d/garden-map.png'
import gardenWalkMask from '../assets/plaza-2d/garden-walk-mask.png'
import fountainMap from '../assets/plaza-2d/plaza-day.png'
import fountainWalkMask from '../assets/plaza-2d/plaza-walk-mask.png'
import type { MapDefinition, MapId } from './MapContext'

export const MAPS: Record<MapId, MapDefinition> = {
  garden: {
    id: 'garden',
    label: 'アルパカガーデン',
    description: 'カフェや遊び場のある新しい広場',
    backgroundUrl: gardenMap,
    walkMaskUrl: gardenWalkMask,
    width: 1448,
    height: 1086,
    boardRect: { x: 220, y: 545, width: 283, height: 272 },
  },
  fountain: {
    id: 'fountain',
    label: '水辺の広場',
    description: '噴水のあるいつもの広場',
    backgroundUrl: fountainMap,
    walkMaskUrl: fountainWalkMask,
    width: 1448,
    height: 1086,
    boardRect: { x: 426, y: 646, width: 282, height: 268 },
  },
}
