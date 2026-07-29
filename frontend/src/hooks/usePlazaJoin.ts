import { useCallback, useState } from 'react';
import type { ClusterId } from '../types/plaza';

const STORAGE_KEY = 'sanji-plaza-join';

type PlazaJoin = {
  assignedCluster: ClusterId;
  userMessage: string;
};

const DEFAULT_JOIN: PlazaJoin = { assignedCluster: 'quiet', userMessage: '' };

function loadFromStorage(): PlazaJoin {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_JOIN;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.assignedCluster === 'string' && typeof parsed.userMessage === 'string') {
      return parsed as PlazaJoin;
    }
    return DEFAULT_JOIN;
  } catch {
    return DEFAULT_JOIN;
  }
}

function saveToStorage(join: PlazaJoin): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(join));
  } catch {
    // localStorage が使えない環境ではサイレントに失敗
  }
}

interface UsePlazaJoinReturn {
  assignedCluster: ClusterId;
  userMessage: string;
  setJoin: (assignedCluster: ClusterId, userMessage: string) => void;
}

/**
 * Which topic circle the visitor's own avatar walks to in the 3D plaza, derived
 * from their most recent post. Persisted so it survives navigating away and back.
 */
export function usePlazaJoin(): UsePlazaJoinReturn {
  const [join, setJoinState] = useState<PlazaJoin>(loadFromStorage);

  const setJoin = useCallback((assignedCluster: ClusterId, userMessage: string) => {
    const next = { assignedCluster, userMessage };
    saveToStorage(next);
    setJoinState(next);
  }, []);

  return { assignedCluster: join.assignedCluster, userMessage: join.userMessage, setJoin };
}
