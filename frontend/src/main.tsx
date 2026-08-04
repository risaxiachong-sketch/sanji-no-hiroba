import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SoundProvider } from './audio/SoundProvider.tsx'
import { CharacterScaleProvider } from './characterScale/CharacterScaleProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoundProvider>
      <CharacterScaleProvider>
        <App />
      </CharacterScaleProvider>
    </SoundProvider>
  </StrictMode>,
)
