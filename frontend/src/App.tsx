import { useCallback, useEffect, useState } from 'react'
import type { Avatar, Page, Profile } from './types'
import { getIdentity } from './api/identity'
import { USE_FIREBASE, USE_MOCK } from './api/client'
import { registerUser } from './api/users'
import { useAuth } from './auth/AuthContext'
import { useSoundEffects } from './audio/SoundContext'
import { useProfile } from './hooks/useProfile'
import { useSavedEvents } from './hooks/useSavedEvents'
import { useSelectedAvatar } from './hooks/useSelectedAvatar'
import { TopPage } from './components/TopPage/TopPage'
import { GoogleSignIn } from './components/GoogleSignIn/GoogleSignIn'
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

const MEMBER_PAGES = new Set<Page>([
  'plaza',
  'postArea',
  'savedEvents',
  'settings',
  'settingsNickname',
  'settingsChildAge',
  'settingsAvatar',
])

function App() {
  const auth = useAuth()
  const { play } = useSoundEffects()
  const [currentPage, setCurrentPage] = useState<Page>('top')
  const [previousPage, setPreviousPage] = useState<Page | null>(null)
  const [postAuthDestination, setPostAuthDestination] = useState<Page | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const { selectedAvatar, selectAvatar } = useSelectedAvatar()
  const { profile, profileStatus, saveDraft, saveProfile } = useProfile()
  const { savedIds, toggleSave, isSaved } = useSavedEvents(profile?.userId)

  useEffect(() => {
    if (USE_FIREBASE) return
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

  const leaveGoogleSignIn = useCallback(() => {
    setPostAuthDestination(null)
    if (previousPage) {
      setCurrentPage(previousPage)
      setPreviousPage(null)
    } else {
      setCurrentPage('top')
    }
  }, [previousPage])

  const openEvent = useCallback((id: string, from?: Page) => {
    setSelectedEventId(id)
    navigate('eventDetail', from)
  }, [navigate])

  const navigateToMemberPage = useCallback((page: 'plaza' | 'postArea', from: Page) => {
    if (USE_FIREBASE) {
      setPostAuthDestination(page)
      if (auth.status !== 'google' || profileStatus === 'loading' || profileStatus === 'error') {
        navigate('signIn', from)
        return
      }
    }
    if (!profile) {
      navigate('profileSetup', from)
      return
    }
    if (!selectedAvatar) {
      navigate('avatarSelect', from)
      return
    }
    if (USE_FIREBASE) setPostAuthDestination(null)
    navigate(page, from)
  }, [auth.status, navigate, profile, profileStatus, selectedAvatar])

  const navigateToProtectedPage = useCallback((page: Page, from: Page) => {
    if (page === 'plaza' || page === 'postArea') {
      navigateToMemberPage(page, from)
      return
    }
    if (USE_FIREBASE && MEMBER_PAGES.has(page)) {
      setPostAuthDestination(page)
      if (auth.status !== 'google' || profileStatus === 'loading' || profileStatus === 'error') {
        navigate('signIn', from)
        return
      }
      if (!profile) {
        navigate('profileSetup', from)
        return
      }
      if (!selectedAvatar) {
        navigate('avatarSelect', from)
        return
      }
      setPostAuthDestination(null)
    }
    if (!USE_FIREBASE && MEMBER_PAGES.has(page)) {
      if (!profile) { navigate('profileSetup', from); return }
      if (!selectedAvatar) { navigate('avatarSelect', from); return }
    }
    navigate(page, from)
  }, [auth.status, navigate, navigateToMemberPage, profile, profileStatus, selectedAvatar])

  const navigateFromPage = useCallback((page: Page, from: Page) => {
    navigateToProtectedPage(page, from)
  }, [navigateToProtectedPage])

  const completeProfileSetup = useCallback((draft: Profile) => {
    saveDraft(USE_FIREBASE && auth.user ? { ...draft, userId: auth.user.uid } : draft)
    navigate('avatarSelect')
  }, [auth.user, navigate, saveDraft])

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
      const destination = USE_FIREBASE ? postAuthDestination ?? 'plaza' : 'plaza'
      setPostAuthDestination(null)
      navigate(destination)
    } catch {
      play('error')
      alert('プロフィールを登録できませんでした。通信状況を確認して、もう一度お試しください。')
    }
  }, [navigate, play, postAuthDestination, profile, saveDraft, selectAvatar])

  const changeAvatar = useCallback(async (avatar: Avatar) => {
    if (!profile) return
    await saveProfile({ ...profile, avatarId: avatar.id })
    selectAvatar(avatar)
  }, [profile, saveProfile, selectAvatar])

  const toggleSavedEvent = useCallback((id: string, from: Page) => {
    if (USE_FIREBASE) {
      setPostAuthDestination(from)
      if (auth.status !== 'google' || profileStatus === 'loading' || profileStatus === 'error') {
        navigate('signIn', from)
        return
      }
      if (!profile) {
        navigate('profileSetup', from)
        return
      }
      if (!selectedAvatar) {
        navigate('avatarSelect', from)
        return
      }
      setPostAuthDestination(null)
    }
    toggleSave(id)
  }, [auth.status, navigate, profile, profileStatus, selectedAvatar, toggleSave])

  const handleGoogleSignOut = useCallback(async () => {
    await auth.signOutGoogle()
    setPostAuthDestination(null)
    setPreviousPage(null)
    setCurrentPage('top')
  }, [auth])

  useEffect(() => {
    if (!USE_FIREBASE || currentPage !== 'signIn' || auth.status !== 'google') return
    if (profileStatus === 'missing') {
      navigate('profileSetup', 'signIn')
      return
    }
    if (profileStatus !== 'ready' || !profile || !selectedAvatar) return
    const destination = postAuthDestination ?? 'plaza'
    setPostAuthDestination(null)
    navigate(destination, 'signIn')
  }, [auth.status, currentPage, navigate, postAuthDestination, profile, profileStatus, selectedAvatar])

  if (currentPage === 'top') {
    return (
      <TopPage
        onEnter={() => navigateToMemberPage('plaza', 'top')}
        onOpenBulletinBoard={() => navigate('bulletinBoard', 'top')}
        onAdminAccess={USE_FIREBASE || USE_MOCK ? undefined : () => navigate('adminEvent', 'top')}
      />
    )
  }
  if (currentPage === 'signIn') {
    return <GoogleSignIn onBack={leaveGoogleSignIn} />
  }
  if (USE_FIREBASE && MEMBER_PAGES.has(currentPage) && auth.status !== 'google') {
    return <GoogleSignIn onBack={() => setCurrentPage('top')} />
  }
  if (currentPage === 'profileSetup') {
    return <ProfileSetup onComplete={completeProfileSetup} />
  }
  if (currentPage === 'avatarSelect') {
    return <AvatarSelect onSelect={selectInitialAvatar} />
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
          onToggleSave={(id) => toggleSavedEvent(id, 'bulletinBoard')}
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
          onToggleSave={() => toggleSavedEvent(selectedEventId!, 'eventDetail')}
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
          onNavigate={(page) => navigateFromPage(page, 'settings')}
          accountEmail={USE_FIREBASE ? auth.user?.email ?? undefined : undefined}
          onSignOut={USE_FIREBASE ? handleGoogleSignOut : undefined}
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
          onAvatarChange={changeAvatar}
          onBack={goBack}
        />
      </AppShell>
    )
  }
  if (currentPage === 'adminEvent') return <AdminEventForm onBack={() => navigate('top')} />
  return null
}

export default App
