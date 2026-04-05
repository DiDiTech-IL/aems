import { use } from 'react';
import { serverApi } from '@/../lib/server-api';
import { PublishProtocolForm } from '@/../components/publish-protocol-form';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    published: 'bg-green-900/50 text-green-400 border-green-700',
    deprecated: 'bg-gray-800 text-gray-500 border-gray-600',
  };
  return (
    <span
      className={`inline-block rounded-full border px-3 py-0.5 text-sm font-medium ${map[status] ?? map['deprecated']}`}
    >
      {status}
    </span>
  );
}

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [{ user }, protocol] = await Promise.all([
    serverApi.auth.me(),
    serverApi.protocols.get(id),
  ]);
  const isAdmin = user.role === 'admin';

  return (
    <main className="min-h-screen p-6">
      <nav className="mb-6">
        <a
          href="/protocols"
          className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          ← Protocols
        </a>
      </nav>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{protocol.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-400">v{protocol.version}</span>
            <span className="text-xs uppercase text-gray-500">{protocol.careLevel}</span>
            <StatusBadge status={protocol.status} />
          </div>
        </div>
        {isAdmin && protocol.status === 'draft' && <PublishProtocolForm id={protocol.id} />}
      </header>

      {/* Metadata */}
      <section className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Metadata
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <dt className="text-gray-500">Created</dt>
          <dd className="text-gray-200">{new Date(protocol.createdAt).toLocaleDateString()}</dd>
          <dt className="text-gray-500">Published</dt>
          <dd className="text-gray-200">
            {protocol.publishedAt
              ? new Date(protocol.publishedAt).toLocaleDateString()
              : '—'}
          </dd>
          <dt className="text-gray-500">Created by</dt>
          <dd className="font-mono text-xs text-gray-400">{protocol.createdBy}</dd>
          <dt className="text-gray-500">Phases</dt>
          <dd className="text-gray-200">{(protocol.phases as unknown[]).length}</dd>
        </dl>
      </section>

      {/* Phases JSON viewer */}
      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-lg font-semibold">Phases</h2>
        <pre className="overflow-x-auto text-xs text-gray-300 leading-relaxed">
          {JSON.stringify(protocol.phases, null, 2)}
        </pre>
      </section>
    </main>
  );
}
