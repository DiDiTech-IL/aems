import { use } from 'react';
import { serverApi } from '../../../lib/server-api';
import { PublishCaseForm } from '../../../components/publish-case-form';

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

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [{ user }, caseData] = await Promise.all([
    serverApi.auth.me(),
    serverApi.cases.get(id),
  ]);
  const isAdmin = user.role === 'admin';

  return (
    <main className="min-h-screen p-6">
      <nav className="mb-6">
        <a href="/cases" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          ← Cases
        </a>
      </nav>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{caseData.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-400">v{caseData.version}</span>
            <span className="text-xs uppercase text-gray-500">{caseData.careLevel}</span>
            <span className="text-xs text-gray-500">Difficulty {caseData.difficultyLevel}/3</span>
            <StatusBadge status={caseData.status} />
          </div>
        </div>
        {isAdmin && caseData.status === 'draft' && <PublishCaseForm id={caseData.id} />}
      </header>

      {/* Scenario */}
      <section className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Scenario
        </h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Chief Complaint</dt>
            <dd className="mt-0.5 text-gray-200">{caseData.scenario.chiefComplaint}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Context</dt>
            <dd className="mt-0.5 text-gray-200">{caseData.scenario.contextNarrative}</dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-gray-500">Setting</dt>
              <dd className="mt-0.5 text-gray-200">{caseData.scenario.setting}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dispatch</dt>
              <dd className="mt-0.5 text-gray-200">{caseData.scenario.dispatchInfo ?? '—'}</dd>
            </div>
          </div>
        </dl>
      </section>

      {/* Metadata */}
      <section className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Metadata
        </h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
          <dt className="text-gray-500">Created</dt>
          <dd className="text-gray-200">{new Date(caseData.createdAt).toLocaleDateString()}</dd>
          <dt className="text-gray-500">Published</dt>
          <dd className="text-gray-200">
            {caseData.publishedAt ? new Date(caseData.publishedAt).toLocaleDateString() : '—'}
          </dd>
          <dt className="text-gray-500">Allowed protocols</dt>
          <dd className="text-gray-200">{caseData.allowedProtocolIds.length}</dd>
          <dt className="text-gray-500">Rules</dt>
          <dd className="text-gray-200">{caseData.rules.length}</dd>
        </dl>
      </section>

      {/* Allowed protocols */}
      {caseData.allowedProtocolIds.length > 0 && (
        <section className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <h2 className="mb-3 text-lg font-semibold">Allowed Protocols</h2>
          <ul className="flex flex-col gap-1">
            {caseData.allowedProtocolIds.map((pid: string) => (
              <li key={pid}>
                <a
                  href={`/protocols/${pid}`}
                  className="font-mono text-sm text-blue-400 hover:underline"
                >
                  {pid}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Initial patient state */}
      <section className="rounded-xl border border-gray-700 bg-gray-900 p-6">
        <h2 className="mb-3 text-lg font-semibold">Initial Patient State</h2>
        <pre className="overflow-x-auto text-xs text-gray-300 leading-relaxed">
          {JSON.stringify(caseData.initialPatientState, null, 2)}
        </pre>
      </section>
    </main>
  );
}
