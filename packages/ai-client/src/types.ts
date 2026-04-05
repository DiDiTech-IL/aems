import type { PatientState } from '@aems/shared-types';

// ─── AI Input Types ───────────────────────────────────────────────────────────
// The AI layer ONLY receives structured JSON. Never free-text medical queries.
// Never receives PII or PHI.

export interface NarrationRequest {
  type: 'patient_condition';
  patientState: PatientState;
  elapsedSeconds: number;
  recentSymptoms: string[];
}

export interface DebriefRequest {
  type: 'debrief_summary';
  outcome: 'success' | 'failure' | 'partial';
  scoreTotal: number;
  scoreMax: number;
  mistakeCount: number;
  missionDurationSeconds: number;
  keyMistakes: Array<{ timestampSeconds: number; description: string }>;
}

export type AiRequest = NarrationRequest | DebriefRequest;

export interface AiResponse {
  text: string;
  requestType: AiRequest['type'];
  /** true if this is a stub/mock response */
  stubbed: boolean;
}

// ─── AI Client Interface ──────────────────────────────────────────────────────

export interface AiClient {
  generate(request: AiRequest): Promise<AiResponse>;
  isAvailable(): Promise<boolean>;
}
