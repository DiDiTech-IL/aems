import { describe, it, expect } from '@jest/globals';
import {
  createInitialScore,
  applyScoreEffects,
  recordActionScore,
  toScoreBreakdown,
} from './score-engine.js';
import type { RuleEffect } from '@aems/shared-types';

describe('ScoreEngine', () => {
  it('starts at zero', () => {
    const score = createInitialScore();
    expect(score.total).toBe(0);
    expect(score.breakdown).toHaveLength(0);
  });

  it('adds points for score_delta effects', () => {
    const effects: RuleEffect[] = [
      { type: 'score_delta', points: 10, reason: 'required:airway' },
    ];
    const result = applyScoreEffects(createInitialScore(), effects);
    expect(result.total).toBe(10);
    expect(result.required).toBe(10);
  });

  it('subtracts deductions correctly', () => {
    const effects: RuleEffect[] = [
      { type: 'score_delta', points: -5, reason: 'wrong:nitroglycerin' },
    ];
    const result = applyScoreEffects(createInitialScore(), effects);
    expect(result.total).toBe(-5);
    expect(result.deductions).toBe(5);
  });

  it('ignores non-score effects', () => {
    const effects: RuleEffect[] = [
      { type: 'add_symptom', symptom: 'chest pain' },
      { type: 'score_delta', points: 5, reason: 'optional:pulse-ox' },
    ];
    const result = applyScoreEffects(createInitialScore(), effects);
    expect(result.total).toBe(5);
  });

  it('accumulates multiple effects', () => {
    const effects: RuleEffect[] = [
      { type: 'score_delta', points: 10, reason: 'required:A' },
      { type: 'score_delta', points: 5, reason: 'optional:B' },
      { type: 'score_delta', points: -3, reason: 'wrong:C' },
    ];
    const result = applyScoreEffects(createInitialScore(), effects);
    expect(result.total).toBe(12);
    expect(result.required).toBe(10);
    expect(result.optional).toBe(5);
    expect(result.deductions).toBe(3);
  });

  it('recordActionScore registers required action', () => {
    const result = recordActionScore(createInitialScore(), {
      actionId: 'a1',
      actionLabel: 'Open airway',
      classification: 'required',
      scoreValue: 20,
    });
    expect(result.total).toBe(20);
    expect(result.required).toBe(20);
    expect(result.breakdown[0]).toMatchObject({ reason: 'required:Open airway', points: 20 });
  });

  it('toScoreBreakdown converts state to schema type', () => {
    const state = createInitialScore();
    const breakdown = toScoreBreakdown(state);
    expect(breakdown).toMatchObject({
      total: 0,
      required: 0,
      optional: 0,
      bonus: 0,
      deductions: 0,
      breakdown: [],
    });
  });
});
