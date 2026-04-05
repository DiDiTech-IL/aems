import { cookies } from 'next/headers';

const API_INTERNAL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get('aems_token')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_INTERNAL}/api/v1${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`[server-api] ${res.status} ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface SimulationRunDetail {
  id: string;
  traineeId: string;
  caseTemplateId: string;
  protocolTemplateId: string;
  difficultyLevel: number;
  status: string;
  outcome: string | null;
  score: { total: number; max: number; breakdown: Record<string, number> } | null;
  mistakeLog: Array<{ actionId: string; phase: string; reason: string; timestampMs: number }>;
  startedAt: string;
  completedAt: string | null;
  currentPhaseId: string;
}

export interface ProtocolRow {
  id: string;
  name: string;
  version: string;
  status: string;
  careLevel: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface ProtocolRowFull extends ProtocolRow {
  phases: unknown[];
  createdBy: string;
}

export interface CaseRow {
  id: string;
  name: string;
  version: string;
  status: string;
  careLevel: string;
  difficultyLevel: number;
  createdAt: string;
  publishedAt: string | null;
}

export interface CaseRowFull extends CaseRow {
  scenario: {
    chiefComplaint: string;
    contextNarrative: string;
    setting: string;
    dispatchInfo?: string;
  };
  initialPatientState: unknown;
  allowedProtocolIds: string[];
  rules: unknown[];
  createdBy: string;
}

export const serverApi = {
  simulations: {
    list: (params?: { status?: string }) => {
      const qs = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return serverFetch<{
        data: Array<{ id: string; outcome?: string; difficultyLevel?: number; completedAt?: string }>;
      }>(`/simulations${qs}`);
    },
    get: (runId: string) => serverFetch<SimulationRunDetail>(`/simulations/${runId}`),
  },
  analytics: {
    summary: () =>
      serverFetch<{ total: number; completed: number; aborted: number }>('/analytics/me/summary'),
  },
  cases: {
    list: (params?: { status?: string }) => {
      const qs = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return serverFetch<{ cases: CaseRow[] }>(`/cases${qs}`);
    },
    get: (id: string) =>
      serverFetch<{ case: CaseRowFull }>(`/cases/${id}`).then((r) => r.case),
  },
  protocols: {
    list: (params?: { status?: string }) => {
      const qs = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
      return serverFetch<{ protocols: ProtocolRow[] }>(`/protocols${qs}`);
    },
    get: (id: string) =>
      serverFetch<{ protocol: ProtocolRowFull }>(`/protocols/${id}`).then((r) => r.protocol),
  },
};
