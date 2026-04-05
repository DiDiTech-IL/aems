import { auth } from '@clerk/nextjs/server';

const API_INTERNAL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Use Clerk's server auth helper to get the current session token.
  // This works in Server Components, Server Actions, and Route Handlers.
  const { getToken } = await auth();
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const res = await fetch(`${API_INTERNAL}/api/v1${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`[server-api] ${res.status} ${path}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message === 'fetch failed') {
      console.error(`[server-api] API unreachable at ${API_INTERNAL}. Is the API server running?`);
      
      // Provide graceful fallbacks for common routes when dev server API is offline.
      if (path === '/analytics/summary') {
        return { total: 0, completed: 0, aborted: 0 } as unknown as T;
      }
      if (path.startsWith('/simulations') || path.startsWith('/cases') || path.startsWith('/protocols')) {
        return { data: [], cases: [], protocols: [] } as unknown as T;
      }
      
      throw new Error('API is currently unreachable.');
    }
    throw err;
  }
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
  auth: {
    me: () =>
      serverFetch<{ user: { id: string; email: string; role: string } }>('/auth/me'),
  },
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
      serverFetch<{ total: number; completed: number; aborted: number }>('/analytics/summary'),
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
