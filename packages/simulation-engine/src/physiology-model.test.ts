import { describe, it, expect } from '@jest/globals';
import { applyEffectsToPatient } from './physiology-model.js';
import type { PatientState, RuleEffect } from '@aems/shared-types';

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
  symptoms: ['chest pain'],
  airway: 'patent',
  breathing: 'normal',
  circulation: 'normal',
  consciousness: 'alert',
};

describe('PhysiologyModel', () => {
  it('applies vital_change delta', () => {
    const effects: RuleEffect[] = [{ type: 'vital_change', vital: 'heartRate', delta: -20 }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.vitals.heartRate).toBe(70);
  });

  it('applies vital_set to exact value', () => {
    const effects: RuleEffect[] = [{ type: 'vital_set', vital: 'spO2', value: 85 }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.vitals.spO2).toBe(85);
  });

  it('clamps vitals at upper bound', () => {
    const effects: RuleEffect[] = [{ type: 'vital_change', vital: 'heartRate', delta: 999 }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.vitals.heartRate).toBe(300);
  });

  it('clamps vitals at lower bound', () => {
    const effects: RuleEffect[] = [{ type: 'vital_change', vital: 'heartRate', delta: -999 }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.vitals.heartRate).toBe(0);
  });

  it('adds a symptom', () => {
    const effects: RuleEffect[] = [{ type: 'add_symptom', symptom: 'diaphoresis' }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.symptoms).toContain('diaphoresis');
  });

  it('does not duplicate symptoms', () => {
    const effects: RuleEffect[] = [{ type: 'add_symptom', symptom: 'chest pain' }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.symptoms.filter((s) => s === 'chest pain')).toHaveLength(1);
  });

  it('removes a symptom', () => {
    const effects: RuleEffect[] = [{ type: 'remove_symptom', symptom: 'chest pain' }];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.symptoms).not.toContain('chest pain');
  });

  it('does not mutate the original state', () => {
    const original = basePatient.vitals.heartRate;
    const effects: RuleEffect[] = [{ type: 'vital_change', vital: 'heartRate', delta: -50 }];
    applyEffectsToPatient(basePatient, effects);
    expect(basePatient.vitals.heartRate).toBe(original);
  });

  it('ignores score_delta and end_simulation effects', () => {
    const effects: RuleEffect[] = [
      { type: 'score_delta', points: 10, reason: 'required:x' },
      { type: 'end_simulation', outcome: 'failure', reason: 'test' },
    ];
    const result = applyEffectsToPatient(basePatient, effects);
    expect(result.vitals).toEqual(basePatient.vitals);
    expect(result.symptoms).toEqual(basePatient.symptoms);
  });
});
