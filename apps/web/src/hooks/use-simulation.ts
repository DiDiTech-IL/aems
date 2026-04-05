'use client';

import { useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import {
  getSimulationStore,
  releaseSimulationStore,
  SIMULATION_INITIAL_STATE,
  type SimulationState,
  type SimulationStore,
} from '../stores/simulation-store';

// Reads the JWT set by loginAction from the non-httpOnly cookie.
function getTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)aems_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : '';
}

/**
 * useSimulation — React 19 idiomatic WebSocket hook.
 *
 * Pattern breakdown:
 *  • useSyncExternalStore  → subscribes to SimulationStore state with no useEffect
 *  • useEffect (one, scoped) → manages WebSocket lifecycle (connect / disconnect)
 *    This is the only accepted useEffect pattern here: managing an imperative
 *    browser API whose lifetime must match the component's mount/unmount cycle.
 *  • No useState for derived state — all state lives in the store class.
 */
export function useSimulation(runId: string) {
  // Stable store reference for the lifetime of this runId.
  // Store ref avoids re-creating bind() on every render.
  const storeRef = useRef<SimulationStore>(getSimulationStore(runId));
  if (storeRef.current !== getSimulationStore(runId)) {
    storeRef.current = getSimulationStore(runId);
  }
  const store = storeRef.current;

  // Subscribe to store state — React re-renders only when state actually changes.
  const state = useSyncExternalStore<SimulationState>(
    useCallback((l) => store.subscribe(l), [store]),
    useCallback(() => store.getSnapshot(), [store]),
    () => SIMULATION_INITIAL_STATE,
  );

  // Lifecycle management: the one legitimate useEffect in this file.
  // Manages connect/disconnect of the external WebSocket resource.
  useEffect(() => {
    const token = getTokenFromCookie();
    if (token) store.connect(runId, token);

    return () => {
      releaseSimulationStore(runId);
    };
  }, [runId, store]);

  const sendAction = useCallback(
    (actionId: string) => store.sendAction(actionId),
    [store],
  );

  const abort = useCallback(() => store.abort(), [store]);

  return { state, sendAction, abort };
}

export type { SimulationState };


