import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SoundProvider } from './audio/SoundProvider.tsx'
import { CharacterScaleProvider } from './characterScale/CharacterScaleProvider.tsx'
import { MapProvider } from './maps/MapProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider>
      <CharacterScaleProvider>
        <MapProvider>
          <App />
        </MapProvider>
      </CharacterScaleProvider>
    </SoundProvider>
  </StrictMode>,
)
