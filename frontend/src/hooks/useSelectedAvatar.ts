import { useCallback, useState } from 'react';
import type { Avatar } from '../types';
import { AVATARS } from '../data/avatars';

const STORAGE_KEY = 'sanji-avatar-id';
const LEGACY_AVATAR_IDS: Record<string, string> = {
  bear: 'mint-bear',
  bunny: 'lavender-bunny',
  duck: 'honey-bear',
  cat: 'pink-cat',
  panda: 'sky-bear',
  koala: 'cream-sheep',
};

function loadFromStorage(): Avatar | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return null;
    const resolvedId = LEGACY_AVATAR_IDS[id] ?? id;
    const avatar = AVATARS.find((option) => option.id === resolvedId) ?? null;
    if (avatar && resolvedId !== id) localStorage.setItem(STORAGE_KEY, resolvedId);
    return avatar;
  } catch {
    return null;
  }
}

function saveToStorage(avatar: Avatar): void {
  try {
    localStorage.setItem(STORAGE_KEY, avatar.id);
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
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(loadFromStorage);

  const selectAvatar = useCallback((avatar: Avatar) => {
    saveToStorage(avatar);
    setSelectedAvatar(avatar);
  }, []);

  return { selectedAvatar, selectAvatar };
}
