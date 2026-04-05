export { evaluateRules } from './rule-engine.js';
export type { RuleEngineContext, RuleEngineResult } from './rule-engine.js';

export {
  createInitialScore,
  applyScoreEffects,
  recordActionScore,
  toScoreBreakdown,
} from './score-engine.js';
export type { ScoreEngineState } from './score-engine.js';

export { applyEffectsToPatient } from './physiology-model.js';

export {
  getDifficultyConfig,
  scaleTimeWindow,
  scaleWrongActionPenalty,
} from './performance-adapter.js';
export type { DifficultyLevel, DifficultyConfig } from './performance-adapter.js';
