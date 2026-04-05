import { describe, it, expect } from '@jest/globals';
import { evaluateRules } from './rule-engine.js';
import type { Rule, PatientState, RuleEngineContext } from '@aems/shared-types';
import { v4 as uuidv4 } from 'uuid';

const basePatient: PatientState = {
  vitals: {
    heartRate: 90,
    systolicBP: 120,
    diastolicBP: 80,
    respiratoryRate: 16,
    spO2: 98,
    temperature: 37,
    gcs: 15,
  },
  symptoms: [],
  airway: 'patent',
  breathing: 'normal',
  circulation: 'normal',
  consciousness: 'alert',
};

function makeContext(overrides?: Partial<RuleEngineContext>): RuleEngineContext {
  return {
    simulationRunId: uuidv4(),
    elapsedMs: 0,
    performedActionIds: new Set(),
    patientState: basePatient,
    flags: {},
    firedOneShotRuleIds: new Set(),
    ...overrides,
  };
}

describe('RuleEngine', () => {
  it('fires a rule with simulation_start trigger at t=0', () => {
    const rule: Rule = {
      id: uuidv4(),
      name: 'Start rule',
      trigger: { type: 'simulation_start' },
      conditions: [],
      effects: [{ type: 'score_delta', points: 0, reason: 'init' }],
      priority: 0,
      oneShot: false,
    };

    const result = evaluateRules([rule], makeContext({ elapsedMs: 0 }));
    expect(result.firedRuleIds).toContain(rule.id);
  });

  it('does not fire simulation_start trigger after t=0', () => {
    const rule: Rule = {
      id: uuidv4(),
      name: 'Start rule',
      trigger: { type: 'simulation_start' },
      conditions: [],
      effects: [{ type: 'score_delta', points: 0, reason: 'init' }],
      priority: 0,
      oneShot: false,
    };

    const result = evaluateRules([rule], makeContext({ elapsedMs: 1000 }));
    expect(result.firedRuleIds).toHaveLength(0);
  });

  it('fires action_performed trigger when action is in the set', () => {
    const actionId = 'action-oxygen';
    const rule: Rule = {
      id: uuidv4(),
      name: 'O2 applied',
      trigger: { type: 'action_performed', actionId },
      conditions: [],
      effects: [{ type: 'score_delta', points: 10, reason: 'required:O2' }],
      priority: 0,
      oneShot: false,
    };

    const result = evaluateRules(
      [rule],
      makeContext({ performedActionIds: new Set([actionId]) }),
    );
    expect(result.firedRuleIds).toContain(rule.id);
    expect(result.effects[0]).toMatchObject({ type: 'score_delta', points: 10 });
  });

  it('does NOT fire a one-shot rule that has already fired', () => {
    const rule: Rule = {
      id: uuidv4(),
      name: 'One shot',
      trigger: { type: 'simulation_start' },
      conditions: [],
      effects: [{ type: 'score_delta', points: 5, reason: 'bonus' }],
      priority: 0,
      oneShot: true,
    };

    const result = evaluateRules(
      [rule],
      makeContext({ firedOneShotRuleIds: new Set([rule.id]) }),
    );
    expect(result.firedRuleIds).toHaveLength(0);
  });

  it('fires vital_threshold trigger when condition is met', () => {
    const rule: Rule = {
      id: uuidv4(),
      name: 'Bradycardia alert',
      trigger: { type: 'vital_threshold', vital: 'heartRate', operator: 'lt', value: 60 },
      conditions: [],
      effects: [{ type: 'add_symptom', symptom: 'bradycardia' }],
      priority: 0,
      oneShot: false,
    };

    const lowHRPatient: PatientState = {
      ...basePatient,
      vitals: { ...basePatient.vitals, heartRate: 45 },
    };

    const result = evaluateRules([rule], makeContext({ patientState: lowHRPatient }));
    expect(result.firedRuleIds).toContain(rule.id);
  });

  it('respects rule priority ordering', () => {
    const lowPriority: Rule = {
      id: uuidv4(),
      name: 'Low',
      trigger: { type: 'simulation_start' },
      conditions: [],
      effects: [{ type: 'score_delta', points: 1, reason: 'low' }],
      priority: 0,
      oneShot: false,
    };
    const highPriority: Rule = {
      id: uuidv4(),
      name: 'High',
      trigger: { type: 'simulation_start' },
      conditions: [],
      effects: [{ type: 'score_delta', points: 100, reason: 'high' }],
      priority: 10,
      oneShot: false,
    };

    const result = evaluateRules([lowPriority, highPriority], makeContext());
    expect(result.firedRuleIds[0]).toBe(highPriority.id);
  });
});
