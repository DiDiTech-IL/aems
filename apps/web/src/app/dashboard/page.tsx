import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { serverApi } from '../../lib/server-api';
import { LogoutButton } from '../../components/logout-button';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeEmail(token: string): string {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      Buffer.from(payload!, 'base64url').toString(),
    ) as { email?: string };
    return decoded.email ?? '';
  } catch {
    return '';
  }
}

// ─── Async sub-components (streamed independently via Suspense) ───────────────

async function StatCards() {
  const summary = await serverApi.analytics.summary();
  return (
    <div className="mb-8 grid grid-cols-3 gap-4">
      {[
        { label: 'Total attempts', value: summary.total },
        { label: 'Completed', value: summary.completed },
        { label: 'Aborted', value: summary.aborted },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-gray-700 bg-gray-900 p-6">
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}

async function RecentRuns() {
  const { data: runs } = await serverApi.simulations.list({ status: 'completed' });

  if (runs.length === 0) {
    return <p className="text-gray-500">No completed simulations yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <a
          key={run.id}
          href={`/simulate/${run.id}/debrief`}
          className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 hover:border-gray-500 transition-colors"
        >
          <span className="font-mono text-sm text-gray-400">{run.id.slice(0, 8)}…</span>
          <span
            className={
              run.outcome === 'success'
                ? 'text-green-400'
                : run.outcome === 'failure'
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }
          >
            {run.outcome ?? 'unknown'}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-3 gap-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="rounded-xl border border-gray-700 bg-gray-900 p-6 animate-pulse">
          <div className="h-3 w-24 rounded bg-gray-700" />
          <div className="mt-2 h-8 w-12 rounded bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ─── Page (async Server Component — no useEffect, no client bundle) ──────────

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aems_token')?.value ?? '';
  const email = decodeEmail(token);

  return (
    <main className="min-h-screen p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-400">{email}</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/simulate"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition-colors"
          >
            New Simulation
          </a>
          <LogoutButton />
        </div>
      </header>

      {/* Stats stream in independently — page shell renders instantly */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatCards />
      </Suspense>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Recent simulations</h2>
        <Suspense fallback={<p className="animate-pulse text-gray-500">Loading…</p>}>
          <RecentRuns />
        </Suspense>
      </section>
    </main>
  );
}


