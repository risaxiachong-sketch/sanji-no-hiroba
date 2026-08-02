import { useState, useCallback } from 'react'
import type { Page } from './types'
import { useSavedEvents } from './hooks/useSavedEvents'
import { useSelectedAvatar } from './hooks/useSelectedAvatar'
import { TopPage } from './components/TopPage/TopPage'
import { ProfileSetup } from './components/ProfileSetup/ProfileSetup'
import { AvatarSelect } from './components/AvatarSelect/AvatarSelect'
import { Plaza } from './components/Plaza/Plaza'
import { PostArea } from './components/PostArea/PostArea'
import { BulletinBoard } from './components/BulletinBoard/BulletinBoard'
import { EventDetail } from './components/EventDetail/EventDetail'
import { SavedEvents } from './components/SavedEvents/SavedEvents'
import { Settings } from './components/Settings/Settings'
import { SettingsNickname } from './components/SettingsNickname/SettingsNickname'
import { SettingsChildAge } from './components/SettingsChildAge/SettingsChildAge'
import { SettingsAvatar } from './components/SettingsAvatar/SettingsAvatar'
import { AdminEventForm } from './components/AdminEventForm/AdminEventForm'
import { AppShell } from './components/AppShell/AppShell'
import './App.css'

const PROFILE_STORAGE_KEY = 'sanji-profile'

function hasSavedProfile() {
  try {
    return localStorage.getItem(PROFILE_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

function App() {
  // ── 画面管理 ──────────────────────────────────
  const [currentPage, setCurrentPage] = useState<Page>('top')
  const [previousPage, setPreviousPage] = useState<Page | null>(null)

  // ── セッション情報 ────────────────────────────
  const { selectedAvatar, selectAvatar } = useSelectedAvatar()
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

    if (!selectedAvatar) {
      navigate('avatarSelect', from)
      return
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
          selectAvatar(avatar)
          navigate('plaza')
        }}
      />
    )
  }

  if (currentPage === 'plaza') {
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'plaza')}>
        <Plaza
          avatar={selectedAvatar!}
          onNavigate={(page) => navigateFromPage(page, 'plaza')}
        />
      </AppShell>
    )
  }

  if (currentPage === 'postArea') {
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'postArea')}>
        <PostArea
          avatar={selectedAvatar!}
          onClose={() => navigateToMemberPage('plaza', 'postArea')}
          onNavigate={(page) => navigateFromPage(page, 'postArea')}
        />
      </AppShell>
    )
  }

  if (currentPage === 'bulletinBoard') {
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'bulletinBoard')}>
        <BulletinBoard
          onSelectEvent={(id) => openEvent(id, 'bulletinBoard')}
          onNavigate={(page) => navigateFromPage(page, 'bulletinBoard')}
          isSaved={isSaved}
          onToggleSave={toggleSave}
        />
      </AppShell>
    )
  }

  if (currentPage === 'eventDetail') {
    return (
      <AppShell
        avatar={selectedAvatar}
        onNavigate={(page) => navigateFromPage(page, 'eventDetail')}
        showDesktopNav
      >
        <EventDetail
          eventId={selectedEventId!}
          isSaved={isSaved(selectedEventId ?? '')}
          onToggleSave={() => toggleSave(selectedEventId!)}
          onBack={goBack}
        />
      </AppShell>
    )
  }

  if (currentPage === 'savedEvents') {
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'savedEvents')}>
        <SavedEvents
          savedIds={savedIds}
          onSelectEvent={(id) => openEvent(id, 'savedEvents')}
          onBack={() => navigateToMemberPage('plaza', 'savedEvents')}
          onNavigate={(page) => navigateFromPage(page, 'savedEvents')}
        />
      </AppShell>
    )
  }

  if (currentPage === 'settings') {
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'settings')}>
        <Settings
          avatar={selectedAvatar!}
          onBack={() => navigate('plaza')}
          onNavigate={(page) => navigate(page, 'settings')}
        />
      </AppShell>
    )
  }

  if (currentPage === 'settingsNickname') {
    return (
      <AppShell
        avatar={selectedAvatar}
        onNavigate={(page) => navigateFromPage(page, 'settingsNickname')}
        showDesktopNav
      >
        <SettingsNickname onBack={goBack} />
      </AppShell>
    )
  }

  if (currentPage === 'settingsChildAge') {
    return (
      <AppShell
        avatar={selectedAvatar}
        onNavigate={(page) => navigateFromPage(page, 'settingsChildAge')}
        showDesktopNav
      >
        <SettingsChildAge onBack={goBack} />
      </AppShell>
    )
  }

  if (currentPage === 'settingsAvatar') {
    return (
      <AppShell
        avatar={selectedAvatar}
        onNavigate={(page) => navigateFromPage(page, 'settingsAvatar')}
        showDesktopNav
      >
        <SettingsAvatar
          avatar={selectedAvatar!}
          onAvatarChange={selectAvatar}
          onBack={goBack}
        />
      </AppShell>
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
