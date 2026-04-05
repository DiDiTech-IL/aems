import { z } from 'zod';
import { PatientStateSchema } from './vitals.js';

// ─── Simulation Event ────────────────────────────────────────────────────────

export const SimulationEventSchema = z.object({
  id: z.string().uuid(),
  simulationRunId: z.string().uuid(),
  timestampMs: z.number().int().min(0),
  type: z.enum([
    'action_performed',
    'vital_changed',
    'rule_triggered',
    'score_updated',
    'phase_advanced',
    'simulation_ended',
    'ai_narration',
  ]),
  payload: z.record(z.string(), z.unknown()),
});

export type SimulationEvent = z.infer<typeof SimulationEventSchema>;

// ─── Score Breakdown ─────────────────────────────────────────────────────────

export const ScoreBreakdownSchema = z.object({
  total: z.number().int(),
  required: z.number().int(),
  optional: z.number().int(),
  bonus: z.number().int(),
  deductions: z.number().int(),
  breakdown: z.array(
    z.object({
      reason: z.string(),
      points: z.number().int(),
    }),
  ),
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// ─── Simulation Run ──────────────────────────────────────────────────────────

export const SimulationStatusSchema = z.enum([
  'pending',
  'active',
  'paused',
  'completed',
  'aborted',
]);

export type SimulationStatus = z.infer<typeof SimulationStatusSchema>;

export const SimulationRunSchema = z.object({
  id: z.string().uuid(),
  caseTemplateId: z.string().uuid(),
  caseTemplateVersion: z.string(),
  protocolTemplateId: z.string().uuid(),
  protocolTemplateVersion: z.string(),
  traineeId: z.string().uuid(),
  instructorId: z.string().uuid().optional(),
  status: SimulationStatusSchema,
  difficultyLevel: z.number().int().min(1).max(3),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  currentPatientState: PatientStateSchema,
  currentPhaseId: z.string(),
  events: z.array(SimulationEventSchema),
  score: ScoreBreakdownSchema.optional(),
  outcome: z.enum(['success', 'failure', 'partial']).optional(),
  mistakeLog: z.array(
    z.object({
      timestampMs: z.number().int().min(0),
      actionId: z.string(),
      description: z.string(),
    }),
  ),
});

export type SimulationRun = z.infer<typeof SimulationRunSchema>;
