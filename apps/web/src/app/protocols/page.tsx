import { Suspense } from 'react';
import { serverApi, type ProtocolRow } from '../../lib/server-api';

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

// ─── Async list ───────────────────────────────────────────────────────────────

async function ProtocolList() {
  const { protocols } = await serverApi.protocols.list();

  if (protocols.length === 0) {
    return (
      <p className="text-gray-500 py-8 text-center">
        No protocols yet.{' '}
        <a href="/protocols/new" className="text-blue-400 hover:underline">
          Create the first one.
        </a>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {protocols.map((p: ProtocolRow) => (
        <a
          key={p.id}
          href={`/protocols/${p.id}`}
          className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 hover:border-gray-500 transition-colors"
        >
          <div>
            <span className="font-semibold">{p.name}</span>
            <span className="ml-2 text-sm text-gray-400">v{p.version}</span>
            <span className="ml-2 text-xs text-gray-500 uppercase">{p.careLevel}</span>
          </div>
          <StatusBadge status={p.status} />
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

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function ProtocolsPage() {
  const { user } = await serverApi.auth.me();
  const canCreate = user.role === 'admin' || user.role === 'instructor';

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Protocols</h1>
          <p className="text-sm text-gray-400">Versioned medical workflow templates</p>
        </div>
        <div className="flex gap-3">
          {canCreate && (
            <a
              href="/protocols/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition-colors"
            >
              + New Protocol
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
        <ProtocolList />
      </Suspense>
    </main>
  );
}
