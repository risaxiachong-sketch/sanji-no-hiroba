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
import { AVATARS } from './data/avatars'
import './App.css'

const PROFILE_STORAGE_KEY = 'sanji-profile'
const AVATAR_STORAGE_KEY = 'sanji-avatar'

function hasSavedProfile() {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function getSavedAvatarId() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return null

    const trimmed = raw.trim()
    if (!trimmed) return null

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      const parsed = JSON.parse(trimmed)
      return typeof parsed === 'string' ? parsed : null
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return null
    return trimmed
  } catch {
    return null
  }
}

function getSavedAvatar() {
  const avatarId = getSavedAvatarId()
  if (!avatarId) return null
  return AVATARS.find((avatar) => avatar.id === avatarId) ?? null
}

function saveAvatarId(avatar: Avatar) {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, avatar.id)
  } catch {
    // localStorage が使えない環境では、このセッション内の選択だけで進める
  }
}

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

  const navigateToMemberPage = useCallback((page: 'plaza' | 'postArea', from: Page) => {
    if (!hasSavedProfile()) {
      navigate('profileSetup', from)
      return
    }

    const avatar = selectedAvatar ?? getSavedAvatar()
    if (!avatar) {
      navigate('avatarSelect', from)
      return
    }

    if (selectedAvatar?.id !== avatar.id) {
      setSelectedAvatar(avatar)
    }
    navigate(page, from)
  }, [navigate, selectedAvatar])

  const navigateFromPage = useCallback((page: Page, from: Page) => {
    if (page === 'plaza' || page === 'postArea') {
      navigateToMemberPage(page, from)
      return
    }
    navigate(page, from)
  }, [navigate, navigateToMemberPage])

  // ── レンダリング ──────────────────────────────
  if (currentPage === 'top') {
    return (
      <TopPage
        onEnter={() => navigateToMemberPage('plaza', 'top')}
        onOpenBulletinBoard={() => navigate('bulletinBoard', 'top')}
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
          saveAvatarId(avatar)
          navigate('plaza')
        }}
      />
    )
  }

  if (currentPage === 'plaza') {
    return (
      <Plaza
        avatar={selectedAvatar!}
        onNavigate={(page) => navigateFromPage(page, 'plaza')}
        onExit={() => navigate('top')}
      />
    )
  }

  if (currentPage === 'postArea') {
    return (
      <PostArea
        avatar={selectedAvatar!}
        onClose={() => navigateToMemberPage('plaza', 'postArea')}
        onNavigate={(page) => navigateFromPage(page, 'postArea')}
      />
    )
  }

  if (currentPage === 'bulletinBoard') {
    return (
      <BulletinBoard
        onSelectEvent={(id) => openEvent(id, 'bulletinBoard')}
        onBack={() => navigateToMemberPage('plaza', 'bulletinBoard')}
        onNavigate={(page) => navigateFromPage(page, 'bulletinBoard')}
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
        onBack={() => navigateToMemberPage('plaza', 'savedEvents')}
        onNavigate={(page) => navigateFromPage(page, 'savedEvents')}
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
