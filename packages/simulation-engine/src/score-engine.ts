import type { RuleEffect, ScoreBreakdown } from '@aems/shared-types';

export interface ScoreEngineState {
  total: number;
  required: number;
  optional: number;
  bonus: number;
  deductions: number;
  breakdown: Array<{ reason: string; points: number }>;
}

export function createInitialScore(): ScoreEngineState {
  return {
    total: 0,
    required: 0,
    optional: 0,
    bonus: 0,
    deductions: 0,
    breakdown: [],
  };
}

/**
 * Applies score_delta effects to the current score state.
 * Pure function — returns a new ScoreEngineState.
 */
export function applyScoreEffects(
  current: ScoreEngineState,
  effects: readonly RuleEffect[],
): ScoreEngineState {
  let state = { ...current, breakdown: [...current.breakdown] };

  for (const effect of effects) {
    if (effect.type !== 'score_delta') continue;

    const { points, reason } = effect;

    state.breakdown.push({ reason, points });

    if (points >= 0) {
      if (reason.startsWith('required:')) {
        state.required += points;
      } else if (reason.startsWith('optional:')) {
        state.optional += points;
      } else {
        state.bonus += points;
      }
    } else {
      state.deductions += Math.abs(points);
    }

    state.total += points;
  }

  return state;
}

/**
 * Records a scored action directly (called by protocol validator on action events).
 * Pure function — returns a new ScoreEngineState.
 */
export function recordActionScore(
  current: ScoreEngineState,
  options: {
    actionId: string;
    actionLabel: string;
    classification: 'required' | 'optional' | 'wrong' | 'bonus';
    scoreValue: number;
  },
): ScoreEngineState {
  const { actionLabel, classification, scoreValue } = options;
  const state = { ...current, breakdown: [...current.breakdown] };

  const reason = `${classification}:${actionLabel}`;
  state.breakdown.push({ reason, points: scoreValue });
  state.total += scoreValue;

  switch (classification) {
    case 'required':
      state.required += scoreValue;
      break;
    case 'optional':
      state.optional += scoreValue;
      break;
    case 'bonus':
      state.bonus += scoreValue;
      break;
    case 'wrong':
      state.deductions += Math.abs(scoreValue);
      break;
  }

  return state;
}

export function toScoreBreakdown(state: ScoreEngineState): ScoreBreakdown {
  return {
    total: state.total,
    required: state.required,
    optional: state.optional,
    bonus: state.bonus,
    deductions: state.deductions,
    breakdown: state.breakdown,
  };
}
