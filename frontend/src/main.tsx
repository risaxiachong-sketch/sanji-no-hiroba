import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { SoundProvider } from './audio/SoundProvider.tsx'
import { CharacterScaleProvider } from './characterScale/CharacterScaleProvider.tsx'
import { ProfileProvider } from './profile/ProfileProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <SoundProvider>
          <CharacterScaleProvider>
            <App />
          </CharacterScaleProvider>
        </SoundProvider>
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
)
