import { z } from 'zod';

// ─── Protocol Action ─────────────────────────────────────────────────────────

export const ActionClassificationSchema = z.enum(['required', 'optional', 'wrong', 'bonus']);

export type ActionClassification = z.infer<typeof ActionClassificationSchema>;

export const ProtocolActionSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  classification: ActionClassificationSchema,
  scoreValue: z.number().int(),
  timeWindowSeconds: z.number().positive().optional(),
  dependsOnActionIds: z.array(z.string()).default([]),
});

export type ProtocolAction = z.infer<typeof ProtocolActionSchema>;

// ─── Protocol Phase ──────────────────────────────────────────────────────────

export const ProtocolPhaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  order: z.number().int().min(0),
  actions: z.array(ProtocolActionSchema).min(1),
  successCriteria: z.object({
    requiredActionIds: z.array(z.string()),
    maxWrongActions: z.number().int().min(0).default(0),
    timeLimitSeconds: z.number().positive().optional(),
  }),
});

export type ProtocolPhase = z.infer<typeof ProtocolPhaseSchema>;

// ─── Protocol Template ───────────────────────────────────────────────────────

export const ProtocolStatusSchema = z.enum(['draft', 'published', 'deprecated']);

export type ProtocolStatus = z.infer<typeof ProtocolStatusSchema>;

export const ProtocolTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: ProtocolStatusSchema,
  careLevel: z.enum(['BLS', 'ALS']),
  phases: z.array(ProtocolPhaseSchema).min(1),
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  createdBy: z.string().uuid(),
});

export type ProtocolTemplate = z.infer<typeof ProtocolTemplateSchema>;
