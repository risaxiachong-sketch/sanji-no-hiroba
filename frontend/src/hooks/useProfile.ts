import { useCallback, useState } from 'react';
import type { Profile } from '../types';

const STORAGE_KEY = 'sanji-profile';

function loadFromStorage(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.nickname === 'string' && typeof parsed?.childAgeGroup === 'string') {
      return parsed as Profile;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(profile: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage が使えない環境ではサイレントに失敗
  }
}

interface UseProfileReturn {
  profile: Profile | null;
  saveProfile: (profile: Profile) => void;
}

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<Profile | null>(loadFromStorage);

  const saveProfile = useCallback((next: Profile) => {
    saveToStorage(next);
    setProfile(next);
  }, []);

  return { profile, saveProfile };
}
