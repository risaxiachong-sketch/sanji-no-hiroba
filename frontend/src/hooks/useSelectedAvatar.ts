import { useCallback, useEffect, useState } from 'react';
import { avatarCacheKey, legacyAvatarCacheKey } from '../api/accountCache';
import { USE_FIREBASE } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { Avatar } from '../types';
import { AVATARS } from '../data/avatars';
import { useProfile } from './useProfile';

const LEGACY_AVATAR_IDS: Record<string, string> = {
  bear: 'mint-bear',
  bunny: 'lavender-bunny',
  duck: 'honey-bear',
  cat: 'pink-cat',
  panda: 'sky-bear',
  koala: 'cream-sheep',
};

function loadFromStorage(userId?: string): Avatar | null {
  try {
    const key = userId ? avatarCacheKey(userId) : legacyAvatarCacheKey();
    const id = localStorage.getItem(key);
    if (!id) return null;
    const resolvedId = LEGACY_AVATAR_IDS[id] ?? id;
    const avatar = AVATARS.find((option) => option.id === resolvedId) ?? null;
    if (avatar && resolvedId !== id) localStorage.setItem(key, resolvedId);
    return avatar;
  } catch {
    return null;
  }
}

function saveToStorage(avatar: Avatar, userId?: string): void {
  try {
    localStorage.setItem(userId ? avatarCacheKey(userId) : legacyAvatarCacheKey(), avatar.id);
  } catch {
    // localStorage が使えない環境ではサイレントに失敗
  }
}

interface UseSelectedAvatarReturn {
  selectedAvatar: Avatar | null;
  selectAvatar: (avatar: Avatar) => void;
}

/**
 * The visitor's chosen animal. Persisted by id (not the full object) so it
 * stays in sync if AVATARS' colors/emoji ever change.
 */
export function useSelectedAvatar(): UseSelectedAvatarReturn {
  const auth = useAuth();
  const { profile } = useProfile();
  const firebaseUserId = auth.status === 'google' ? auth.user?.uid : undefined;
  const [selection, setSelection] = useState<{ userId?: string; avatar: Avatar | null }>(() => ({
    userId: undefined,
    avatar: USE_FIREBASE ? null : loadFromStorage(),
  }));
  const profileAvatar = profile?.avatarId
    ? AVATARS.find((option) => option.id === profile.avatarId) ?? null
    : null;

  useEffect(() => {
    if (!USE_FIREBASE) return;
    if (!firebaseUserId) {
      setSelection({ userId: undefined, avatar: null });
      return;
    }
    const nextAvatar = profileAvatar ?? loadFromStorage(firebaseUserId);
    if (profileAvatar) saveToStorage(profileAvatar, firebaseUserId);
    setSelection({ userId: firebaseUserId, avatar: nextAvatar });
  }, [firebaseUserId, profileAvatar]);

  const selectAvatar = useCallback((avatar: Avatar) => {
    const ownerId = USE_FIREBASE ? firebaseUserId : undefined;
    saveToStorage(avatar, ownerId);
    setSelection({ userId: ownerId, avatar });
  }, [firebaseUserId]);

  const selectedAvatar = USE_FIREBASE
    ? profileAvatar ?? (selection.userId === firebaseUserId ? selection.avatar : null)
    : selection.avatar;

  return { selectedAvatar, selectAvatar };
}
