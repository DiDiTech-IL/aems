import type {
  Rule,
  RuleEffect,
  PatientState,
  SimulationEvent,
} from '@aems/shared-types';
import { v4 as uuidv4 } from 'uuid';

export interface RuleEngineContext {
  simulationRunId: string;
  elapsedMs: number;
  performedActionIds: ReadonlySet<string>;
  patientState: PatientState;
  flags: Readonly<Record<string, unknown>>;
  firedOneShotRuleIds: ReadonlySet<string>;
}

export interface RuleEngineResult {
  effects: RuleEffect[];
  firedRuleIds: string[];
  events: SimulationEvent[];
}

/**
 * Evaluates all rules against the current context.
 * Pure function — no side effects.
 */
export function evaluateRules(
  rules: readonly Rule[],
  context: RuleEngineContext,
): RuleEngineResult {
  const effects: RuleEffect[] = [];
  const firedRuleIds: string[] = [];
  const events: SimulationEvent[] = [];

  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (rule.oneShot && context.firedOneShotRuleIds.has(rule.id)) {
      continue;
    }

    if (!isTriggerActive(rule, context)) {
      continue;
    }

    if (!areConditionsMet(rule, context)) {
      continue;
    }

    firedRuleIds.push(rule.id);
    effects.push(...rule.effects);

    events.push({
      id: uuidv4(),
      simulationRunId: context.simulationRunId,
      timestampMs: context.elapsedMs,
      type: 'rule_triggered',
      payload: {
        ruleId: rule.id,
        ruleName: rule.name,
        effectCount: rule.effects.length,
      },
    });
  }

  return { effects, firedRuleIds, events };
}

function isTriggerActive(rule: Rule, ctx: RuleEngineContext): boolean {
  const { trigger } = rule;

  switch (trigger.type) {
    case 'simulation_start':
      return ctx.elapsedMs === 0;

    case 'action_performed':
      return ctx.performedActionIds.has(trigger.actionId);

    case 'action_omitted':
      return (
        !ctx.performedActionIds.has(trigger.actionId) &&
        ctx.elapsedMs >= trigger.afterSeconds * 1000
      );

    case 'time_elapsed':
      return ctx.elapsedMs >= trigger.seconds * 1000;

    case 'vital_threshold': {
      const value = getVitalValue(ctx.patientState, trigger.vital);
      if (value === undefined) return false;
      return compareValues(value, trigger.operator, trigger.value);
    }
  }
}

function areConditionsMet(rule: Rule, ctx: RuleEngineContext): boolean {
  return rule.conditions.every((condition) => {
    if (condition.vital !== undefined && condition.operator !== undefined && condition.value !== undefined) {
      const value = getVitalValue(ctx.patientState, condition.vital);
      if (value === undefined) return false;
      return compareValues(value, condition.operator, condition.value);
    }

    if (condition.stateFlag !== undefined) {
      return ctx.flags[condition.stateFlag] === condition.flagValue;
    }

    return true;
  });
}

function getVitalValue(state: PatientState, vitalKey: string): number | undefined {
  const vitals = state.vitals as Record<string, unknown>;
  const val = vitals[vitalKey];
  return typeof val === 'number' ? val : undefined;
}

function compareValues(
  actual: number,
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq',
  expected: number,
): boolean {
  switch (operator) {
    case 'lt': return actual < expected;
    case 'lte': return actual <= expected;
    case 'gt': return actual > expected;
    case 'gte': return actual >= expected;
    case 'eq': return actual === expected;
  }
}
