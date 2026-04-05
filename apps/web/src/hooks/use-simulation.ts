'use client';

import { useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  getSimulationStore,
  releaseSimulationStore,
  SIMULATION_INITIAL_STATE,
  type SimulationState,
  type SimulationStore,
} from '../stores/simulation-store';

/**
 * useSimulation — React 19 idiomatic WebSocket hook.
 *
 * Token is obtained from Clerk's useAuth().getToken() (async) and passed
 * to the store's connect() once resolved.
 */
export function useSimulation(runId: string) {
  const { getToken } = useAuth();

  const storeRef = useRef<SimulationStore>(getSimulationStore(runId));
  if (storeRef.current !== getSimulationStore(runId)) {
    storeRef.current = getSimulationStore(runId);
  }
  const store = storeRef.current;

  const state = useSyncExternalStore<SimulationState>(
    useCallback((l) => store.subscribe(l), [store]),
    useCallback(() => store.getSnapshot(), [store]),
    () => SIMULATION_INITIAL_STATE,
  );

  useEffect(() => {
    let cancelled = false;
    getToken().then((token) => {
      if (!cancelled && token) store.connect(runId, token);
    });

    return () => {
      cancelled = true;
      releaseSimulationStore(runId);
    };
  }, [runId, store, getToken]);

  const sendAction = useCallback(
    (actionId: string) => store.sendAction(actionId),
    [store],
  );

  const abort = useCallback(() => store.abort(), [store]);

  return { state, sendAction, abort };
}

export type { SimulationState };


