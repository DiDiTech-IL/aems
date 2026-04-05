import { Suspense } from 'react';
import { serverApi } from '@/../lib/server-api';
import { CreateCaseForm } from '@/../components/create-case-form';

async function ProtocolLoader() {
  const { protocols } = await serverApi.protocols.list({ status: 'published' });
  return <CreateCaseForm protocols={protocols} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="h-10 rounded-lg bg-gray-800" />
      ))}
    </div>
  );
}

export default function NewCasePage() {
  return (
    <main className="min-h-screen p-6">
      <nav className="mb-6">
        <a href="/cases" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
          ← Back to Cases
        </a>
      </nav>

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold">New Case</h1>
        <p className="mb-6 text-sm text-gray-400">
          Cases are saved as drafts. An admin must publish them before trainees can run them.
        </p>

        <div className="rounded-xl border border-gray-700 bg-gray-950 p-8">
          <Suspense fallback={<FormSkeleton />}>
            <ProtocolLoader />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
