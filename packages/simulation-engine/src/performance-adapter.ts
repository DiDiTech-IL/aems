/**
 * PerformanceAdapter
 *
 * Adjusts simulation difficulty deterministically based on the difficulty level.
 * Level 1 = clean protocol training (no noise)
 * Level 2 = noise & distractions (timing pressure, extra non-relevant info)
 * Level 3 = ambiguous real-world (incomplete info, conflicting signals)
 *
 * NOT AI-driven. All adjustments are rule-based and deterministic.
 */

export type DifficultyLevel = 1 | 2 | 3;

export interface DifficultyConfig {
  /** Multiplier on time windows for required actions (< 1 = tighter) */
  timeWindowMultiplier: number;
  /** Whether to surface distractor symptoms in the scenario */
  includeDistractors: boolean;
  /** Whether some patient info is initially withheld */
  partialInitialInfo: boolean;
  /** Score penalty multiplier for wrong actions */
  wrongActionPenaltyMultiplier: number;
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  1: {
    timeWindowMultiplier: 1.5,
    includeDistractors: false,
    partialInitialInfo: false,
    wrongActionPenaltyMultiplier: 1.0,
  },
  2: {
    timeWindowMultiplier: 1.0,
    includeDistractors: true,
    partialInitialInfo: false,
    wrongActionPenaltyMultiplier: 1.25,
  },
  3: {
    timeWindowMultiplier: 0.8,
    includeDistractors: true,
    partialInitialInfo: true,
    wrongActionPenaltyMultiplier: 1.5,
  },
};

export function getDifficultyConfig(level: DifficultyLevel): DifficultyConfig {
  return DIFFICULTY_CONFIGS[level];
}

/**
 * Applies difficulty scaling to an action's time window.
 * Returns undefined if there is no time window defined.
 */
export function scaleTimeWindow(
  baseSeconds: number | undefined,
  level: DifficultyLevel,
): number | undefined {
  if (baseSeconds === undefined) return undefined;
  const config = getDifficultyConfig(level);
  return Math.round(baseSeconds * config.timeWindowMultiplier);
}

/**
 * Scales the penalty for a wrong action based on difficulty.
 */
export function scaleWrongActionPenalty(basePoints: number, level: DifficultyLevel): number {
  const config = getDifficultyConfig(level);
  return Math.round(basePoints * config.wrongActionPenaltyMultiplier);
}
