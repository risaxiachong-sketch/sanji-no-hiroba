import { useCallback, useEffect, useState } from 'react'
import type { Avatar, Page, Profile } from './types'
import { getIdentity } from './api/identity'
import { registerUser, updateMyProfile } from './api/users'
import { useProfile } from './hooks/useProfile'
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

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('top')
  const [previousPage, setPreviousPage] = useState<Page | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const { selectedAvatar, selectAvatar } = useSelectedAvatar()
  const { profile, saveDraft } = useProfile()
  const { savedIds, toggleSave, isSaved } = useSavedEvents(profile?.userId)

  useEffect(() => {
    if (!profile || !selectedAvatar || getIdentity()?.userId) return
    registerUser({
      nickname: profile.nickname,
      childAgeGroup: profile.childAgeGroup,
      avatarId: selectedAvatar.id,
    }).then(saveDraft).catch((cause) => console.error('profile migration failed', cause))
  }, [profile, saveDraft, selectedAvatar])

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
    if (!profile) {
      navigate('profileSetup', from)
      return
    }
    if (!selectedAvatar) {
      navigate('avatarSelect', from)
      return
    }
    navigate(page, from)
  }, [navigate, profile, selectedAvatar])

  const navigateFromPage = useCallback((page: Page, from: Page) => {
    if (page === 'plaza' || page === 'postArea') navigateToMemberPage(page, from)
    else navigate(page, from)
  }, [navigate, navigateToMemberPage])

  const completeProfileSetup = useCallback((draft: Profile) => {
    saveDraft(draft)
    navigate('avatarSelect')
  }, [navigate, saveDraft])

  const selectInitialAvatar = useCallback(async (avatar: Avatar) => {
    selectAvatar(avatar)
    const draft = profile
    if (!draft) {
      navigate('profileSetup')
      return
    }
    try {
      const remote = await registerUser({
        nickname: draft.nickname,
        childAgeGroup: draft.childAgeGroup,
        avatarId: avatar.id,
      })
      saveDraft(remote)
      navigate('plaza')
    } catch {
      alert('プロフィールを登録できませんでした。通信状況を確認して、もう一度お試しください。')
    }
  }, [navigate, profile, saveDraft, selectAvatar])

  const changeAvatar = useCallback(async (avatar: Avatar) => {
    await updateMyProfile({ avatarId: avatar.id })
    selectAvatar(avatar)
  }, [selectAvatar])

  if (currentPage === 'top') {
    return <TopPage onEnter={() => navigateToMemberPage('plaza', 'top')} onOpenBulletinBoard={() => navigate('bulletinBoard', 'top')} onAdminAccess={() => navigate('adminEvent', 'top')} />
  }
  if (currentPage === 'profileSetup') {
    return <ProfileSetup onComplete={completeProfileSetup} />
  }
  if (currentPage === 'avatarSelect') {
    return <AvatarSelect onSelect={selectInitialAvatar} />
  }
  if (currentPage === 'plaza') {
<<<<<<< HEAD
    return <Plaza avatar={selectedAvatar!} onNavigate={(page) => navigateFromPage(page, 'plaza')} onExit={() => navigate('top')} />
=======
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'plaza')}>
        <Plaza
          avatar={selectedAvatar!}
          onNavigate={(page) => navigateFromPage(page, 'plaza')}
        />
      </AppShell>
    )
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'postArea') {
<<<<<<< HEAD
    return <PostArea avatar={selectedAvatar!} onClose={() => navigateToMemberPage('plaza', 'postArea')} onNavigate={(page) => navigateFromPage(page, 'postArea')} />
=======
    return (
      <AppShell avatar={selectedAvatar} onNavigate={(page) => navigateFromPage(page, 'postArea')}>
        <PostArea
          avatar={selectedAvatar!}
          onClose={() => navigateToMemberPage('plaza', 'postArea')}
          onNavigate={(page) => navigateFromPage(page, 'postArea')}
        />
      </AppShell>
    )
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'bulletinBoard') {
<<<<<<< HEAD
    return <BulletinBoard onSelectEvent={(id) => openEvent(id, 'bulletinBoard')} onNavigate={(page) => navigateFromPage(page, 'bulletinBoard')} isSaved={isSaved} onToggleSave={toggleSave} />
=======
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
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'eventDetail') {
<<<<<<< HEAD
    return <EventDetail eventId={selectedEventId!} isSaved={isSaved(selectedEventId ?? '')} onToggleSave={() => toggleSave(selectedEventId!)} onBack={goBack} />
=======
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
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'savedEvents') {
<<<<<<< HEAD
    return <SavedEvents savedIds={savedIds} onSelectEvent={(id) => openEvent(id, 'savedEvents')} onBack={() => navigateToMemberPage('plaza', 'savedEvents')} onNavigate={(page) => navigateFromPage(page, 'savedEvents')} />
=======
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
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'settings') {
<<<<<<< HEAD
    return <Settings avatar={selectedAvatar!} onBack={() => navigate('plaza')} onNavigate={(page) => navigate(page, 'settings')} />
  }
  if (currentPage === 'settingsNickname') return <SettingsNickname onBack={goBack} />
  if (currentPage === 'settingsChildAge') return <SettingsChildAge onBack={goBack} />
  if (currentPage === 'settingsAvatar') {
    return <SettingsAvatar avatar={selectedAvatar!} onAvatarChange={changeAvatar} onBack={goBack} />
=======
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
>>>>>>> 76f1a578627b79c231209b8709d98386bae5f879
  }
  if (currentPage === 'adminEvent') return <AdminEventForm onBack={() => navigate('top')} />
  return null
}

export default App
