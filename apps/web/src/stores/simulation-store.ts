import type { PatientState } from '@aems/shared-types';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SimulationState {
  status: 'connecting' | 'connected' | 'ended' | 'error';
  runId: string | null;
  patientState: PatientState | null;
  currentPhaseId: string | null;
  score: { total: number; max: number; breakdown: Record<string, number> } | null;
  outcome: 'success' | 'failure' | 'partial' | 'aborted' | null;
  lastNarration: string | null;
  lastActionResult: { success: boolean; message: string } | null;
  errorCode: string | null;
}

export const SIMULATION_INITIAL_STATE: SimulationState = {
  status: 'connecting',
  runId: null,
  patientState: null,
  currentPhaseId: null,
  score: null,
  outcome: null,
  lastNarration: null,
  lastActionResult: null,
  errorCode: null,
};

// ─── Internal message shapes ──────────────────────────────────────────────────

type ServerMessage =
  | {
      type: 'connected';
      runId: string;
      currentPhaseId: string;
      patientState: PatientState;
    }
  | {
      type: 'action_result';
      success: boolean;
      message: string;
      patientState: PatientState;
      score: SimulationState['score'];
      phaseAdvanced: boolean;
      nextPhaseId?: string;
    }
  | {
      type: 'simulation_ended';
      outcome: NonNullable<SimulationState['outcome']>;
      score?: SimulationState['score'];
    }
  | { type: 'narration'; text: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'pong' };

// ─── Store class ──────────────────────────────────────────────────────────────

const WS_BASE =
  typeof window !== 'undefined'
    ? (process.env['NEXT_PUBLIC_WS_URL'] ??
      `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`)
    : '';

/**
 * Class-based store for a single simulation WebSocket connection.
 * Designed for use with React's useSyncExternalStore — callers subscribe to
 * state changes without needing any useEffect for state derivation.
 *
 * Lifecycle (connect / disconnect) is still managed by a single useEffect in
 * the hook layer — the one legitimate use case for useEffect (external resource
 * whose lifecycle must be tied to component mount/unmount).
 */
export class SimulationStore {
  private _state: SimulationState = { ...SIMULATION_INITIAL_STATE };
  private _listeners = new Set<() => void>();
  private _ws: WebSocket | null = null;
  private _ping: ReturnType<typeof setInterval> | null = null;

  // ── useSyncExternalStore interface ─────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  getSnapshot(): SimulationState {
    return this._state;
  }

  /** Used as the server-side snapshot (SSR/RSC environments never connect). */
  getServerSnapshot(): SimulationState {
    return SIMULATION_INITIAL_STATE;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  connect(runId: string, token: string): void {
    this.disconnect();
    this._state = { ...SIMULATION_INITIAL_STATE };

    const url = `${WS_BASE}/api/v1/simulations/${encodeURIComponent(runId)}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this._ws = ws;

    ws.onmessage = (ev: MessageEvent<string>) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data) as ServerMessage;
      } catch {
        return;
      }
      this._handleMessage(msg, ws);
    };

    ws.onerror = () => {
      this._patch({ status: 'error', errorCode: 'WS_ERROR' });
    };

    ws.onclose = (ev) => {
      if (ev.code !== 1000) {
        this._patch({
          status: this._state.status === 'ended' ? 'ended' : 'error',
          errorCode: this._state.errorCode ?? 'WS_CLOSED',
        });
      }
      this._clearPing();
    };

    this._ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20_000);
  }

  disconnect(): void {
    this._clearPing();
    if (this._ws) {
      if (
        this._ws.readyState === WebSocket.OPEN ||
        this._ws.readyState === WebSocket.CONNECTING
      ) {
        this._ws.close(1000);
      }
      this._ws = null;
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  sendAction(actionId: string): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'action', actionId, timestampMs: Date.now() }));
    }
  }

  abort(): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'abort' }));
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _patch(next: Partial<SimulationState>): void {
    this._state = { ...this._state, ...next };
    this._listeners.forEach((l) => l());
  }

  private _clearPing(): void {
    if (this._ping) {
      clearInterval(this._ping);
      this._ping = null;
    }
  }

  private _handleMessage(msg: ServerMessage, ws: WebSocket): void {
    switch (msg.type) {
      case 'connected':
        this._patch({
          status: 'connected',
          runId: msg.runId,
          patientState: msg.patientState,
          currentPhaseId: msg.currentPhaseId,
        });
        break;

      case 'action_result':
        this._patch({
          patientState: msg.patientState,
          score: msg.score,
          currentPhaseId:
            msg.phaseAdvanced && msg.nextPhaseId
              ? msg.nextPhaseId
              : this._state.currentPhaseId,
          lastActionResult: { success: msg.success, message: msg.message },
        });
        break;

      case 'simulation_ended':
        this._patch({
          status: 'ended',
          outcome: msg.outcome,
          score: msg.score ?? this._state.score,
        });
        ws.close(1000);
        break;

      case 'narration':
        this._patch({ lastNarration: msg.text });
        break;

      case 'error':
        this._patch({ status: 'error', errorCode: msg.code });
        break;
    }
  }
}

// ─── Per-runId registry ───────────────────────────────────────────────────────

const _registry = new Map<string, SimulationStore>();

export function getSimulationStore(runId: string): SimulationStore {
  let store = _registry.get(runId);
  if (!store) {
    store = new SimulationStore();
    _registry.set(runId, store);
  }
  return store;
}

export function releaseSimulationStore(runId: string): void {
  const store = _registry.get(runId);
  if (store) {
    store.disconnect();
    _registry.delete(runId);
  }
}
