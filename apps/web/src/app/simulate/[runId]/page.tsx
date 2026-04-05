'use client';

import { use, useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSimulation } from '../../../hooks/use-simulation';

// ─── Vital display ────────────────────────────────────────────────────────────

function VitalBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-1">
        {value}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  );
}

// ─── Action catalog (extended at runtime from case/protocol data) ─────────────

const COMMON_ACTIONS = [
  { id: 'attach_monitor', label: 'Attach Monitor' },
  { id: 'iv_access', label: 'IV Access' },
  { id: 'o2_mask', label: 'O2 Mask (15 L/min)' },
  { id: 'check_pulse', label: 'Check Pulse' },
  { id: 'bvm_ventilate', label: 'BVM Ventilate' },
  { id: 'chest_compression', label: 'Chest Compression' },
  { id: 'adrenaline_1mg', label: 'Adrenaline 1mg IV' },
  { id: 'defibrillate_200j', label: 'Defibrillate 200J' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SimulationRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const router = useRouter();
  const { state, sendAction, abort } = useSimulation(runId);

  // useOptimistic: show immediate feedback when an action is dispatched.
  // The optimistic value is replaced automatically once the WebSocket delivers
  // the real action_result (i.e. state.lastActionResult changes in the store).
  const [optimisticFeedback, addOptimisticFeedback] = useOptimistic<
    { success: boolean; message: string; pending?: boolean } | null,
    string
  >(state.lastActionResult, (_, label) => ({
    success: true,
    message: `→ ${label}…`,
    pending: true,
  }));

  // startTransition wraps action dispatch so React properly tracks the pending
  // window that useOptimistic uses to know when to revert to the real state.
  const [, startTransition] = useTransition();

  const handleAction = (actionId: string, label: string) => {
    startTransition(() => {
      addOptimisticFeedback(label);
      sendAction(actionId);
    });
  };

  // ── Status screens ──────────────────────────────────────────────────────────

  if (state.status === 'connecting') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-gray-400">Connecting to simulation…</p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-red-400">Connection error ({state.errorCode})</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-gray-600 px-4 py-2 hover:border-gray-400 transition-colors"
        >
          Back to dashboard
        </button>
      </main>
    );
  }

  if (state.status === 'ended') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-3xl font-bold">
          {state.outcome === 'success'
            ? '✓ Success'
            : state.outcome === 'failure'
              ? '✗ Failure'
              : state.outcome === 'aborted'
                ? 'Simulation aborted'
                : 'Simulation complete'}
        </h1>
        {state.score && (
          <p className="text-xl text-gray-300">
            Score:{' '}
            <span className="font-bold text-white">{state.score.total}</span> /{' '}
            {state.score.max}
          </p>
        )}
        <div className="flex gap-4">
          <a
            href={`/simulate/${runId}/debrief`}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold hover:bg-blue-500 transition-colors"
          >
            View debrief
          </a>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg border border-gray-600 px-4 py-2 hover:border-gray-400 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </main>
    );
  }

  const vitals = state.patientState?.vitals;

  return (
    <main className="flex min-h-screen flex-col gap-4 p-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Simulation</h1>
          <p className="text-xs text-gray-500">Phase: {state.currentPhaseId}</p>
        </div>
        <button
          onClick={abort}
          className="rounded-lg border border-red-700 px-3 py-1 text-sm text-red-400 hover:border-red-500 transition-colors"
        >
          Abort
        </button>
      </header>

      {/* Vitals */}
      {vitals && (
        <section aria-label="Patient vitals" className="grid grid-cols-4 gap-2">
          <VitalBadge label="HR" value={vitals.heartRate} unit="bpm" />
          <VitalBadge label="BP" value={vitals.systolicBP} unit={`/${vitals.diastolicBP}`} />
          <VitalBadge label="RR" value={vitals.respiratoryRate} unit="/min" />
          <VitalBadge label="SpO₂" value={vitals.spO2} unit="%" />
          {vitals.temperature !== undefined && (
            <VitalBadge label="Temp" value={vitals.temperature} unit="°C" />
          )}
          <VitalBadge label="GCS" value={vitals.gcs} unit="" />
          {vitals.etco2 !== undefined && (
            <VitalBadge label="EtCO₂" value={vitals.etco2} unit="mmHg" />
          )}
        </section>
      )}

      {/* AI narration */}
      {state.lastNarration && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm italic text-gray-300">{state.lastNarration}</p>
        </div>
      )}

      {/* Optimistic action feedback — shows immediately on click, replaced by
          real server result once WebSocket delivers action_result */}
      {optimisticFeedback && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            optimisticFeedback.pending
              ? 'bg-gray-800 text-gray-400'
              : optimisticFeedback.success
                ? 'bg-green-900/40 text-green-300'
                : 'bg-red-900/40 text-red-300'
          }`}
        >
          {optimisticFeedback.message}
        </div>
      )}

      {/* Score */}
      {state.score && (
        <p className="text-sm text-gray-400">
          Score:{' '}
          <span className="font-semibold text-white">{state.score.total}</span>/
          {state.score.max}
        </p>
      )}

      {/* Action buttons */}
      <section aria-label="Available actions" className="mt-auto grid grid-cols-2 gap-2">
        {COMMON_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id, action.label)}
            className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm font-medium hover:border-blue-500 hover:bg-blue-950 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </section>
    </main>
  );
}

