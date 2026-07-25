import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sanji-saved-events';

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage が使えない環境ではサイレントに失敗
  }
}

interface UseSavedEventsReturn {
  savedIds: string[];
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export function useSavedEvents(): UseSavedEventsReturn {
  const [savedIds, setSavedIds] = useState<string[]>(loadFromStorage);

  const toggleSave = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      saveToStorage(next);
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => savedIds.includes(id),
    [savedIds],
  );

  return { savedIds, toggleSave, isSaved };
}
