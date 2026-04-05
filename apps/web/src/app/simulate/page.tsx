import { Suspense } from 'react';
import { serverApi } from '../../lib/server-api';
import { StartSimulationForm } from '../../components/start-simulation-form';

// ─── Async loader (server-rendered, passes serialised props to Client Component)

async function SimulateFormLoader() {
  // Parallel fetch — eliminated waterfall, no client-side loading states needed
  const [{ cases }, { protocols }] = await Promise.all([
    serverApi.cases.list({ status: 'published' }),
    serverApi.protocols.list({ status: 'published' }),
  ]);

  return <StartSimulationForm cases={cases} protocols={protocols} />;
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-10 rounded-lg bg-gray-800" />
      <div className="h-10 rounded-lg bg-gray-800" />
      <div className="h-10 rounded-lg bg-gray-800" />
      <div className="mt-2 h-10 rounded-lg bg-blue-900/50" />
    </div>
  );
}

// ─── Page (Server Component — no useEffect, no client data fetch) ─────────────

export default function SimulatePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8">
        <h1 className="mb-6 text-2xl font-bold">Start Simulation</h1>
        <Suspense fallback={<FormSkeleton />}>
          <SimulateFormLoader />
        </Suspense>
      </div>
    </main>
  );
}


