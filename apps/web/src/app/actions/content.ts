'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const API_URL = process.env['API_INTERNAL_URL'] ?? 'http://localhost:3001';

async function apiFetch(
  path: string,
  options: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('aems_token')?.value;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  });

  if (res.status === 204) return { ok: true, status: 204, body: null };
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Protocol Actions ─────────────────────────────────────────────────────────

export async function createProtocolAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = formData.get('name') as string;
  const version = formData.get('version') as string;
  const careLevel = formData.get('careLevel') as string;
  const phasesJson = formData.get('phases') as string;

  if (!name || !version || !careLevel || !phasesJson) {
    return { success: false, error: 'All fields are required.' };
  }

  let phases: unknown;
  try {
    phases = JSON.parse(phasesJson);
  } catch {
    return { success: false, error: 'Phases must be valid JSON.' };
  }

  if (!Array.isArray(phases) || phases.length === 0) {
    return { success: false, error: 'Phases must be a non-empty JSON array.' };
  }

  const result = await apiFetch('/protocols', {
    method: 'POST',
    body: JSON.stringify({ name, version, careLevel, phases }),
  });

  if (!result.ok) {
    const body = result.body as { error?: string; message?: string } | null;
    return {
      success: false,
      error: body?.message ?? body?.error ?? `Server error (${result.status})`,
    };
  }

  const protocol = (result.body as { protocol?: { id: string } })?.protocol;
  redirect(`/protocols/${protocol?.id ?? ''}`);
}

export async function publishProtocolAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id') as string;
  if (!id) return { success: false, error: 'Missing protocol ID.' };

  const result = await apiFetch(`/protocols/${id}/publish`, { method: 'POST' });

  if (!result.ok) {
    const body = result.body as { error?: string; message?: string } | null;
    return {
      success: false,
      error: body?.message ?? body?.error ?? `Server error (${result.status})`,
    };
  }

  redirect(`/protocols/${id}`);
}

// ─── Case Actions ─────────────────────────────────────────────────────────────

export async function createCaseAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = formData.get('name') as string;
  const version = formData.get('version') as string;
  const careLevel = formData.get('careLevel') as string;
  const difficultyLevel = Number(formData.get('difficultyLevel'));
  const chiefComplaint = formData.get('chiefComplaint') as string;
  const contextNarrative = formData.get('contextNarrative') as string;
  const setting = formData.get('setting') as string;
  const dispatchInfo = (formData.get('dispatchInfo') as string) || undefined;
  const initialPatientStateJson = formData.get('initialPatientState') as string;
  const allowedProtocolIdsRaw = formData.get('allowedProtocolIds') as string;
  const rulesJson = (formData.get('rules') as string) || '[]';

  if (
    !name ||
    !version ||
    !careLevel ||
    !difficultyLevel ||
    !chiefComplaint ||
    !contextNarrative ||
    !setting ||
    !initialPatientStateJson ||
    !allowedProtocolIdsRaw
  ) {
    return { success: false, error: 'All required fields must be filled in.' };
  }

  let initialPatientState: unknown;
  try {
    initialPatientState = JSON.parse(initialPatientStateJson);
  } catch {
    return { success: false, error: 'Initial patient state must be valid JSON.' };
  }

  let rules: unknown[];
  try {
    rules = JSON.parse(rulesJson);
    if (!Array.isArray(rules)) throw new Error();
  } catch {
    return { success: false, error: 'Rules must be a valid JSON array.' };
  }

  // allowedProtocolIds may be a comma-separated list (from multi-select hidden field)
  const allowedProtocolIds = allowedProtocolIdsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedProtocolIds.length === 0) {
    return { success: false, error: 'At least one allowed protocol must be selected.' };
  }

  const result = await apiFetch('/cases', {
    method: 'POST',
    body: JSON.stringify({
      name,
      version,
      careLevel,
      difficultyLevel,
      scenario: { chiefComplaint, contextNarrative, setting, dispatchInfo },
      initialPatientState,
      allowedProtocolIds,
      rules,
    }),
  });

  if (!result.ok) {
    const body = result.body as { error?: string; message?: string } | null;
    return {
      success: false,
      error: body?.message ?? body?.error ?? `Server error (${result.status})`,
    };
  }

  const caseData = (result.body as { case?: { id: string } })?.case;
  redirect(`/cases/${caseData?.id ?? ''}`);
}

export async function publishCaseAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get('id') as string;
  if (!id) return { success: false, error: 'Missing case ID.' };

  const result = await apiFetch(`/cases/${id}/publish`, { method: 'POST' });

  if (!result.ok) {
    const body = result.body as { error?: string; message?: string } | null;
    return {
      success: false,
      error: body?.message ?? body?.error ?? `Server error (${result.status})`,
    };
  }

  redirect(`/cases/${id}`);
}
