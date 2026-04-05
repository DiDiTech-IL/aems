'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface Props {
  cases: Array<{ id: string; name: string }>;
  protocols: Array<{ id: string; name: string }>;
}

// Client Component — only interactive selections and the start mutation live here.
// Cases and protocols arrive as serialised props from the Server Component above it.
export function StartSimulationForm({ cases, protocols }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (!selectedCase || !selectedProtocol) return;
    setError(null);

    startTransition(async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/v1/simulations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            caseTemplateId: selectedCase,
            protocolTemplateId: selectedProtocol,
            difficultyLevel: difficulty,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { runId } = (await res.json()) as { runId: string };
        router.push(`/simulate/${runId}`);
      } catch {
        setError('Failed to start simulation. Please try again.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Case</span>
        <select
          value={selectedCase}
          onChange={(e) => setSelectedCase(e.target.value)}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a case…</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Protocol</span>
        <select
          value={selectedProtocol}
          onChange={(e) => setSelectedProtocol(e.target.value)}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">Select a protocol…</option>
          {protocols.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-400">Difficulty</span>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                difficulty === d
                  ? 'border-blue-500 bg-blue-900 text-blue-200'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              Level {d}
            </button>
          ))}
        </div>
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={!selectedCase || !selectedProtocol || isPending}
        className="mt-2 rounded-lg bg-blue-600 py-2 font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Starting…' : 'Start'}
      </button>
    </div>
  );
}
