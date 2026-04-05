import { use } from 'react';
import { serverApi, type SimulationRunDetail } from '@/@/lib/server-api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function durationSeconds(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—';
  const s = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  const map: Record<string, { label: string; classes: string }> = {
    success: { label: 'Passed', classes: 'bg-green-900/50 text-green-400 border-green-700' },
    failure: { label: 'Failed', classes: 'bg-red-900/50 text-red-400 border-red-700' },
    aborted: { label: 'Aborted', classes: 'bg-yellow-900/50 text-yellow-400 border-yellow-700' },
  };
  const config = map[outcome ?? ''] ?? {
    label: 'Incomplete',
    classes: 'bg-gray-800 text-gray-400 border-gray-600',
  };
  return (
    <span
      className={`inline-block rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wide ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

function ScorePanel({ score }: { score: SimulationRunDetail['score'] }) {
  if (!score) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <p className="text-gray-500">No score data available.</p>
      </div>
    );
  }

  const pct = score.max > 0 ? Math.round((score.total / score.max) * 100) : 0;
  const breakdown = Object.entries(score.breakdown ?? {});

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">Score</h2>

      {/* Overall score bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-3xl font-bold">{score.total}</span>
          <span className="text-gray-400 text-sm">/ {score.max} pts ({pct}%)</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Breakdown table */}
      {breakdown.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Breakdown
          </h3>
          <div className="flex flex-col gap-2">
            {breakdown.map(([key, pts]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize text-gray-300">{key.replace(/_/g, ' ')}</span>
                <span className="font-mono text-gray-200">{pts as number} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MistakeLog({ mistakes }: { mistakes: SimulationRunDetail['mistakeLog'] }) {
  if (!mistakes || mistakes.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-2 text-lg font-semibold">Mistakes</h2>
        <p className="text-green-400 text-sm">No mistakes recorded. Excellent performance!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Mistakes{' '}
        <span className="ml-1 rounded-full bg-red-900/60 px-2 py-0.5 text-xs font-normal text-red-400">
          {mistakes.length}
        </span>
      </h2>
      <ol className="flex flex-col gap-3">
        {mistakes.map((m, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-900/40 text-xs font-bold text-red-400">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-gray-200">{m.reason}</p>
              <div className="mt-0.5 flex gap-3 text-xs text-gray-500">
                <span>Phase: {m.phase}</span>
                <span>Action: <code className="text-gray-400">{m.actionId}</code></span>
                <span>+{(m.timestampMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DebriefPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const run = await serverApi.simulations.get(runId);

  return (
    <main className="min-h-screen p-6">
      {/* Back navigation */}
      <nav className="mb-6">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          ← Back to Dashboard
        </a>
      </nav>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Simulation Debrief</h1>
          <p className="mt-1 font-mono text-sm text-gray-500">{run.id}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
            <span>Started: {formatDate(run.startedAt)}</span>
            <span>Completed: {formatDate(run.completedAt)}</span>
            <span>Duration: {durationSeconds(run.startedAt, run.completedAt)}</span>
            <span>Difficulty: {run.difficultyLevel}/3</span>
          </div>
        </div>
        <OutcomeBadge outcome={run.outcome} />
      </header>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ScorePanel score={run.score} />
        <MistakeLog mistakes={run.mistakeLog} />
      </div>

      {/* CTA */}
      <div className="mt-8 flex gap-3">
        <a
          href="/simulate"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 transition-colors"
        >
          Start New Simulation
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-gray-500 transition-colors"
        >
          Dashboard
        </a>
      </div>
    </main>
  );
}
