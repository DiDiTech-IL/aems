import { z } from 'zod';
import { PatientStateSchema } from './vitals.js';
import { RuleSchema } from './rules.js';

// ─── Case Template ───────────────────────────────────────────────────────────

export const CaseStatusSchema = z.enum(['draft', 'published', 'deprecated']);

export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CaseTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: CaseStatusSchema,
  difficultyLevel: z.number().int().min(1).max(3),
  careLevel: z.enum(['BLS', 'ALS']),
  scenario: z.object({
    chiefComplaint: z.string().min(1),
    contextNarrative: z.string().min(1),
    setting: z.string().min(1),
    dispatchInfo: z.string().optional(),
  }),
  initialPatientState: PatientStateSchema,
  allowedProtocolIds: z.array(z.string().uuid()).min(1),
  rules: z.array(RuleSchema),
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  createdBy: z.string().uuid(),
});

export type CaseTemplate = z.infer<typeof CaseTemplateSchema>;
