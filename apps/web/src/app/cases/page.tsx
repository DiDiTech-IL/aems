import { Suspense } from 'react';
import { serverApi, type CaseRow } from '../../lib/server-api';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    published: 'bg-green-900/50 text-green-400 border-green-700',
    deprecated: 'bg-gray-800 text-gray-500 border-gray-600',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${map[status] ?? map['deprecated']}`}
    >
      {status}
    </span>
  );
}

function DifficultyBadge({ level }: { level: number }) {
  const map: Record<number, string> = {
    1: 'text-green-400',
    2: 'text-yellow-400',
    3: 'text-red-400',
  };
  const labels = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced' };
  return (
    <span className={`text-xs font-medium ${map[level] ?? 'text-gray-400'}`}>
      {labels[level as keyof typeof labels] ?? `Level ${level}`}
    </span>
  );
}

async function CaseList() {
  const { cases } = await serverApi.cases.list();

  if (cases.length === 0) {
    return (
      <p className="text-gray-500 py-8 text-center">
        No cases yet.{' '}
        <a href="/cases/new" className="text-blue-400 hover:underline">
          Create the first one.
        </a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {cases.map((c: CaseRow) => (
        <a
          key={c.id}
          href={`/cases/${c.id}`}
          className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div>
              <span className="font-semibold">{c.name}</span>
              <span className="ml-2 text-sm text-gray-400">v{c.version}</span>
              <span className="ml-2 text-xs text-gray-500 uppercase">{c.careLevel}</span>
            </div>
            <DifficultyBadge level={c.difficultyLevel} />
          </div>
          <StatusBadge status={c.status} />
        </a>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-14 rounded-lg bg-gray-900 border border-gray-800" />
      ))}
    </div>
  );
}

export default async function CasesPage() {
  const { user } = await serverApi.auth.me();
  const canCreate = user.role === 'admin' || user.role === 'instructor';

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases</h1>
          <p className="text-sm text-gray-400">Scenario templates for simulation training</p>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <a
              href="/cases/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition-colors"
            >
              + New Case
            </a>
          )}
          <a
            href="/dashboard"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:border-gray-500 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </header>

      <Suspense fallback={<ListSkeleton />}>
        <CaseList />
      </Suspense>
    </main>
  );
}
