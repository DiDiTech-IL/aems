import { z } from 'zod';

// ─── Rule Trigger ───────────────────────────────────────────────────────────

export const RuleTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('action_performed'),
    actionId: z.string(),
  }),
  z.object({
    type: z.literal('action_omitted'),
    actionId: z.string(),
    afterSeconds: z.number().positive(),
  }),
  z.object({
    type: z.literal('vital_threshold'),
    vital: z.string(),
    operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq']),
    value: z.number(),
  }),
  z.object({
    type: z.literal('time_elapsed'),
    seconds: z.number().positive(),
  }),
  z.object({
    type: z.literal('simulation_start'),
  }),
]);

export type RuleTrigger = z.infer<typeof RuleTriggerSchema>;

// ─── Rule Condition ──────────────────────────────────────────────────────────

export const RuleConditionSchema = z.object({
  vital: z.string().optional(),
  operator: z.enum(['lt', 'lte', 'gt', 'gte', 'eq']).optional(),
  value: z.number().optional(),
  stateFlag: z.string().optional(),
  flagValue: z.unknown().optional(),
});

export type RuleCondition = z.infer<typeof RuleConditionSchema>;

// ─── Rule Effect ─────────────────────────────────────────────────────────────

export const RuleEffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('vital_change'),
    vital: z.string(),
    delta: z.number(),
  }),
  z.object({
    type: z.literal('vital_set'),
    vital: z.string(),
    value: z.number(),
  }),
  z.object({
    type: z.literal('add_symptom'),
    symptom: z.string(),
  }),
  z.object({
    type: z.literal('remove_symptom'),
    symptom: z.string(),
  }),
  z.object({
    type: z.literal('score_delta'),
    points: z.number(),
    reason: z.string(),
  }),
  z.object({
    type: z.literal('end_simulation'),
    outcome: z.enum(['success', 'failure', 'partial']),
    reason: z.string(),
  }),
  z.object({
    type: z.literal('set_flag'),
    flag: z.string(),
    value: z.unknown(),
  }),
]);

export type RuleEffect = z.infer<typeof RuleEffectSchema>;

// ─── Rule ─────────────────────────────────────────────────────────────────────

export const RuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: RuleTriggerSchema,
  conditions: z.array(RuleConditionSchema).default([]),
  effects: z.array(RuleEffectSchema).min(1),
  priority: z.number().int().min(0).default(0),
  oneShot: z.boolean().default(false),
});

export type Rule = z.infer<typeof RuleSchema>;
