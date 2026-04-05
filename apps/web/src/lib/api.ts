const API_BASE = '/api/v1';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)aems_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]!) : '';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getTokenFromCookie();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { /* non-JSON error body */ }
    throw new ApiError(res.status, `HTTP ${res.status}`, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string; role: string }>('/auth/me'),
};

// ─── Protocols ────────────────────────────────────────────────────────────────

export const protocolsApi = {
  list: (params?: { status?: string; careLevel?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ data: unknown[] }>(`/protocols${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<unknown>(`/protocols/${id}`),
};

// ─── Cases ────────────────────────────────────────────────────────────────────

export const casesApi = {
  list: (params?: { status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ data: unknown[] }>(`/cases${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<unknown>(`/cases/${id}`),
};

// ─── Simulations ──────────────────────────────────────────────────────────────

export const simulationsApi = {
  start: (caseTemplateId: string, protocolTemplateId: string, difficultyLevel: 1 | 2 | 3) =>
    request<{ runId: string; wsUrl: string; currentPhaseId: string; patientState: unknown }>(
      '/simulations',
      {
        method: 'POST',
        body: JSON.stringify({ caseTemplateId, protocolTemplateId, difficultyLevel }),
      },
    ),

  list: (params?: { status?: string; traineeId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ data: unknown[] }>(`/simulations${qs ? `?${qs}` : ''}`);
  },

  get: (runId: string) => request<unknown>(`/simulations/${runId}`),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: (traineeId?: string) => {
    const qs = traineeId ? `?traineeId=${traineeId}` : '';
    return request<unknown>(`/analytics/summary${qs}`);
  },
  leaderboard: (caseTemplateId?: string) => {
    const qs = caseTemplateId ? `?caseTemplateId=${caseTemplateId}` : '';
    return request<{ data: unknown[] }>(`/analytics/leaderboard${qs}`);
  },
};

export { ApiError };
