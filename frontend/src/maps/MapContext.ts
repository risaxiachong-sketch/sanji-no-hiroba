import { createContext, useContext } from 'react'

export type MapId = 'garden' | 'fountain'

export interface BoardRect {
  x: number
  y: number
  width: number
  height: number
}

export interface MapDefinition {
  id: MapId
  label: string
  description: string
  backgroundUrl: string
  walkMaskUrl: string
  width: number
  height: number
  boardRect: BoardRect
}

export interface MapContextValue {
  mapId: MapId
  map: MapDefinition
  setMapId: (mapId: MapId) => void
}

export const MapContext = createContext<MapContextValue | null>(null)

export function useMap() {
  const value = useContext(MapContext)
  if (!value) throw new Error('useMap must be used inside MapProvider')
  return value
}
