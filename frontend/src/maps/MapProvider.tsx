import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { MapContext, type MapId } from './MapContext'
import { MAPS } from './maps'

export { MAPS } from './maps'

const STORAGE_KEY = 'sanji-map-id'

const VALID_MAP_IDS: MapId[] = ['garden', 'fountain']

function loadMapId(): MapId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && VALID_MAP_IDS.includes(stored as MapId) ? stored as MapId : 'garden'
  } catch {
    return 'garden'
  }
}

export function MapProvider({ children }: { children: ReactNode }) {
  const [mapId, setMapIdState] = useState<MapId>(loadMapId)

  const setMapId = useCallback((next: MapId) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The preference remains active for this session when storage is unavailable.
    }
    setMapIdState(next)
  }, [])

  return (
    <MapContext.Provider value={{ mapId, map: MAPS[mapId], setMapId }}>
      {children}
    </MapContext.Provider>
  )
}
