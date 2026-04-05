import { Suspense } from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { serverApi } from '@/lib/server-api';
import Link from 'next/link';

async function StatCards() {
  const summary = await serverApi.analytics.summary();
  return (
    <div className="my-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[
        { label: 'Total attempts', value: summary.total, color: "text-blue-600" },
        { label: 'Completed', value: summary.completed, color: "text-green-600" },
        { label: 'Aborted', value: summary.aborted, color: "text-red-600" },
      ].map(({ label, value, color }) => (
        <div key={label} className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="p-6">
            <dt className="truncate text-sm font-medium text-gray-500">{label}</dt>
            <dd className={`mt-2 text-3xl font-bold tracking-tight ${color}`}>{value}</dd>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentRuns() {
  const { data: runs } = await serverApi.simulations.list({ status: 'completed' });

  if (runs.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl border border-gray-200 border-dashed">
        <p className="text-sm font-medium text-gray-900">No simulations completed</p>
        <p className="mt-1 text-sm text-gray-500">Get started by launching a new simulation scenario.</p>
        <div className="mt-6">
          <Link href="/simulate" className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            Start Simulation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
      <table className="min-w-full divide-y border-t border-gray-200">
        <thead>
          <tr className="bg-gray-50 text-left text-sm font-semibold text-gray-900">
            <th className="py-3.5 pl-4 pr-3 sm:pl-6">Run ID</th>
            <th className="px-3 py-3.5">Outcome</th>
            <th className="px-3 py-3.5 text-right pr-4 sm:pr-6">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                <span className="font-mono text-gray-500">{run.id.slice(0, 8)}…</span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                  run.outcome === 'success' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                  run.outcome === 'failure' ? 'bg-red-50 text-red-700 ring-red-600/10' :
                  'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                }`}>
                  {run.outcome ?? 'unknown'}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-right pr-4 sm:pr-6">
                <a href={`/simulate/${run.id}/debrief`} className="text-blue-600 hover:text-blue-900 font-medium">
                  View Debrief<span className="sr-only">, {run.id}</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="my-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse">
          <div className="p-6">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="mt-4 h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? '';

  return (
    <div>
      <header className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">Welcome back, {email}</p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link
            href="/simulate"
            className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            New Simulation
          </Link>
        </div>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatCards />
      </Suspense>

      <section className="mt-10">
        <div className="sm:flex sm:items-center mb-6">
          <div className="sm:flex-auto">
            <h2 className="text-base font-semibold leading-6 text-gray-900">Recent simulations</h2>
            <p className="mt-2 text-sm text-gray-700">A list of all the simulations you have recently completed or attempted.</p>
          </div>
        </div>
        <Suspense fallback={<div className="h-32 rounded-xl border border-dashed border-gray-300 bg-gray-50 animate-pulse" />}>
          <RecentRuns />
        </Suspense>
      </section>
    </div>
  );
}
