import { useState, useCallback } from 'react'
import type { Page, Avatar } from './types'
import { useSavedEvents } from './hooks/useSavedEvents'
import { TopPage } from './components/TopPage/TopPage'
import { ProfileSetup } from './components/ProfileSetup/ProfileSetup'
import { AvatarSelect } from './components/AvatarSelect/AvatarSelect'
import { Plaza } from './components/Plaza/Plaza'
import { PostArea } from './components/PostArea/PostArea'
import { BulletinBoard } from './components/BulletinBoard/BulletinBoard'
import { EventDetail } from './components/EventDetail/EventDetail'
import { SavedEvents } from './components/SavedEvents/SavedEvents'
import { AdminEventForm } from './components/AdminEventForm/AdminEventForm'
import './App.css'

function App() {
  // ── 画面管理 ──────────────────────────────────
  const [currentPage, setCurrentPage] = useState<Page>('top')
  const [previousPage, setPreviousPage] = useState<Page | null>(null)

  // ── セッション情報 ────────────────────────────
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // ── 保存済みイベント ──────────────────────────
  const { savedIds, toggleSave, isSaved } = useSavedEvents()

  // ── ナビゲーション ────────────────────────────
  const navigate = useCallback((page: Page, from?: Page) => {
    setPreviousPage(from ?? currentPage)
    setCurrentPage(page)
  }, [currentPage])

  const goBack = useCallback(() => {
    if (previousPage) {
      setCurrentPage(previousPage)
      setPreviousPage(null)
    }
  }, [previousPage])

  const openEvent = useCallback((id: string, from?: Page) => {
    setSelectedEventId(id)
    navigate('eventDetail', from)
  }, [navigate])

  // ── レンダリング ──────────────────────────────
  if (currentPage === 'top') {
    return (
      <TopPage
        onEnter={() => {
          const profile = localStorage.getItem('sanji-profile')
          if (profile) {
            navigate('avatarSelect')
          } else {
            navigate('profileSetup')
          }
        }}
        onAdminAccess={() => navigate('adminEvent', 'top')}
      />
    )
  }

  if (currentPage === 'profileSetup') {
    return (
      <ProfileSetup
        onComplete={() => navigate('avatarSelect')}
      />
    )
  }

  if (currentPage === 'avatarSelect') {
    return (
      <AvatarSelect
        onSelect={(avatar) => {
          setSelectedAvatar(avatar)
          navigate('plaza')
        }}
      />
    )
  }

  if (currentPage === 'plaza') {
    return (
      <Plaza
        avatar={selectedAvatar!}
        onNavigate={(page) => navigate(page, 'plaza')}
        onExit={() => navigate('top')}
      />
    )
  }

  if (currentPage === 'postArea') {
    return (
      <PostArea
        avatar={selectedAvatar!}
        onClose={() => navigate('plaza')}
      />
    )
  }

  if (currentPage === 'bulletinBoard') {
    return (
      <BulletinBoard
        onSelectEvent={(id) => openEvent(id, 'bulletinBoard')}
        onBack={() => navigate('plaza')}
      />
    )
  }

  if (currentPage === 'eventDetail') {
    return (
      <EventDetail
        eventId={selectedEventId!}
        isSaved={isSaved(selectedEventId ?? '')}
        onToggleSave={() => toggleSave(selectedEventId!)}
        onBack={goBack}
      />
    )
  }

  if (currentPage === 'savedEvents') {
    return (
      <SavedEvents
        savedIds={savedIds}
        onSelectEvent={(id) => openEvent(id, 'savedEvents')}
        onBack={() => navigate('plaza')}
      />
    )
  }

  if (currentPage === 'adminEvent') {
    return (
      <AdminEventForm
        onBack={() => navigate('top')}
      />
    )
  }

  // フォールバック（到達しないはず）
  return null
}

export default App
