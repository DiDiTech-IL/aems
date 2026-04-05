import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db, simulationRuns, simulationEvents, caseTemplates, protocolTemplates } from '@aems/db';
import {
  evaluateRules,
  applyEffectsToPatient,
  createInitialScore,
  applyScoreEffects,
  recordActionScore,
  toScoreBreakdown,
  getDifficultyConfig,
} from '@aems/simulation-engine';
import {
  validateAction,
  evaluatePhaseCompletion,
} from '@aems/protocol-engine';
import {
  type PatientState,
  type Rule,
  type ProtocolTemplate,
  type SimulationRun,
  PatientStateSchema,
  RuleSchema,
} from '@aems/shared-types';
import type { ScoreEngineState } from '@aems/simulation-engine';
import { getRedis } from '../redis.js';

interface SimulationState {
  runId: string;
  caseTemplateId: string;
  protocolTemplateId: string;
  traineeId: string;
  elapsedMs: number;
  patientState: PatientState;
  currentPhaseId: string;
  performedActionIds: Set<string>;
  firedOneShotRuleIds: Set<string>;
  flags: Record<string, unknown>;
  score: ScoreEngineState;
  wrongActionCount: number;
  mistakeLog: SimulationRun['mistakeLog'];
  rules: Rule[];
  protocol: ProtocolTemplate;
  difficultyLevel: 1 | 2 | 3;
  status: 'active' | 'completed' | 'aborted';
  startedAtMs: number;
}

const REDIS_TTL_SECONDS = 60 * 60 * 4; // 4 hours

// ─── State persistence (Redis) ───────────────────────────────────────────────

async function saveState(state: SimulationState): Promise<void> {
  const redis = getRedis();
  const serializable = {
    ...state,
    performedActionIds: [...state.performedActionIds],
    firedOneShotRuleIds: [...state.firedOneShotRuleIds],
  };
  await redis.setex(
    `sim:${state.runId}`,
    REDIS_TTL_SECONDS,
    JSON.stringify(serializable),
  );
}

async function loadState(runId: string): Promise<SimulationState | null> {
  const redis = getRedis();
  const raw = await redis.get(`sim:${runId}`);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    ...(parsed as Omit<SimulationState, 'performedActionIds' | 'firedOneShotRuleIds'>),
    performedActionIds: new Set(parsed['performedActionIds'] as string[]),
    firedOneShotRuleIds: new Set(parsed['firedOneShotRuleIds'] as string[]),
  };
}

async function deleteState(runId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`sim:${runId}`);
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function persistEvent(
  runId: string,
  type: string,
  payload: Record<string, unknown>,
  timestampMs: number,
): Promise<void> {
  await db.insert(simulationEvents).values({
    id: uuidv4(),
    simulationRunId: runId,
    timestampMs,
    type,
    payload,
  });
}

async function persistRunUpdate(
  runId: string,
  fields: Partial<typeof simulationRuns.$inferInsert>,
): Promise<void> {
  await db.update(simulationRuns).set(fields).where(eq(simulationRuns.id, runId));
}

// ─── Simulation Engine Core ───────────────────────────────────────────────────

/**
 * Initialises a new SimulationState from DB records.
 * Called once when a simulation is started via REST, then stored in Redis.
 */
export async function initSimulationState(
  runId: string,
  caseTemplateId: string,
  protocolTemplateId: string,
  traineeId: string,
  difficultyLevel: 1 | 2 | 3,
): Promise<SimulationState> {
  const [caseRow] = await db
    .select()
    .from(caseTemplates)
    .where(eq(caseTemplates.id, caseTemplateId))
    .limit(1);

  const [protocolRow] = await db
    .select()
    .from(protocolTemplates)
    .where(eq(protocolTemplates.id, protocolTemplateId))
    .limit(1);

  if (!caseRow || !protocolRow) {
    throw new Error('Case or protocol template not found.');
  }

  const patientState = PatientStateSchema.parse(caseRow.initialPatientState);
  const rules = (caseRow.rules as unknown[]).map((r) => RuleSchema.parse(r));
  const protocol = protocolRow as unknown as ProtocolTemplate;
  const firstPhase = protocol.phases.sort((a, b) => a.order - b.order)[0];

  if (!firstPhase) throw new Error('Protocol has no phases.');

  return {
    runId,
    caseTemplateId,
    protocolTemplateId,
    traineeId,
    elapsedMs: 0,
    patientState,
    currentPhaseId: firstPhase.id,
    performedActionIds: new Set(),
    firedOneShotRuleIds: new Set(),
    flags: {},
    score: createInitialScore(),
    wrongActionCount: 0,
    mistakeLog: [],
    rules,
    protocol,
    difficultyLevel,
    status: 'active',
    startedAtMs: Date.now(),
  };
}

// ─── Action Processing ────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  message: string;
  patientState: PatientState;
  score: ReturnType<typeof toScoreBreakdown>;
  simulationEnded: boolean;
  outcome?: 'success' | 'failure' | 'partial';
  phaseAdvanced: boolean;
  nextPhaseId?: string;
}

export async function processAction(
  state: SimulationState,
  actionId: string,
  clientTimestampMs: number,
): Promise<ActionResult> {
  const elapsedMs = clientTimestampMs;
  state.elapsedMs = elapsedMs;

  // 1. Validate action against current protocol phase
  const validation = validateAction(
    state.protocol,
    state.currentPhaseId,
    actionId,
    state.performedActionIds,
    elapsedMs,
  );

  if (validation.isMistake) {
    state.wrongActionCount++;
    state.mistakeLog.push({
      timestampMs: elapsedMs,
      actionId,
      description: validation.reason,
    });
  }

  // 2. Record score
  if (validation.classification !== 'wrong' || validation.scoreValue !== 0) {
    const diffCfg = getDifficultyConfig(state.difficultyLevel);
    const adjustedScore =
      validation.classification === 'wrong'
        ? Math.round(validation.scoreValue * diffCfg.wrongActionPenaltyMultiplier)
        : validation.scoreValue;

    state.score = recordActionScore(state.score, {
      actionId,
      actionLabel: actionId,
      classification: validation.classification,
      scoreValue: adjustedScore,
    });
  }

  // 3. Mark action performed
  state.performedActionIds.add(actionId);

  await persistEvent(state.runId, 'action_performed', {
    actionId,
    classification: validation.classification,
    isMistake: validation.isMistake,
    reason: validation.reason,
    scoreValue: validation.scoreValue,
  }, elapsedMs);

  // 4. Run rule engine
  const ruleResult = evaluateRules(state.rules, {
    simulationRunId: state.runId,
    elapsedMs,
    performedActionIds: state.performedActionIds,
    patientState: state.patientState,
    flags: state.flags,
    firedOneShotRuleIds: state.firedOneShotRuleIds,
  });

  // 5. Apply effects: physiology + score
  state.patientState = applyEffectsToPatient(state.patientState, ruleResult.effects);
  state.score = applyScoreEffects(state.score, ruleResult.effects);

  for (const ruleId of ruleResult.firedRuleIds) {
    state.firedOneShotRuleIds.add(ruleId);
  }

  // Update flags from set_flag effects
  for (const effect of ruleResult.effects) {
    if (effect.type === 'set_flag') {
      state.flags[effect.flag] = effect.value;
    }
  }

  // 6. Check for end_simulation effect
  let simulationEnded = false;
  let outcome: 'success' | 'failure' | 'partial' | undefined;
  for (const effect of ruleResult.effects) {
    if (effect.type === 'end_simulation') {
      simulationEnded = true;
      outcome = effect.outcome;
    }
  }

  // 7. Check phase completion
  const currentPhase = state.protocol.phases.find((p) => p.id === state.currentPhaseId);
  let phaseAdvanced = false;
  let nextPhaseId: string | undefined;

  if (currentPhase && !simulationEnded) {
    const completion = evaluatePhaseCompletion(
      currentPhase,
      state.performedActionIds,
      state.wrongActionCount,
      elapsedMs,
    );

    if (completion.complete) {
      const sortedPhases = state.protocol.phases.sort((a, b) => a.order - b.order);
      const currentIndex = sortedPhases.findIndex((p) => p.id === state.currentPhaseId);
      const next = sortedPhases[currentIndex + 1];

      if (next) {
        state.currentPhaseId = next.id;
        phaseAdvanced = true;
        nextPhaseId = next.id;

        await persistEvent(state.runId, 'phase_advanced', {
          fromPhaseId: currentPhase.id,
          toPhaseId: next.id,
          passed: completion.passed,
        }, elapsedMs);
      } else {
        // All phases complete
        simulationEnded = true;
        outcome = completion.passed ? 'success' : 'partial';
      }
    }
  }

  // 8. Finalise simulation if ended
  if (simulationEnded) {
    state.status = 'completed';
    const finalScore = toScoreBreakdown(state.score);

    await persistEvent(state.runId, 'simulation_ended', {
      outcome,
      score: finalScore,
    }, elapsedMs);

    await persistRunUpdate(state.runId, {
      status: 'completed',
      outcome: outcome ?? 'partial',
      score: finalScore,
      currentPatientState: state.patientState,
      currentPhaseId: state.currentPhaseId,
      mistakeLog: state.mistakeLog,
      completedAt: new Date(),
    });

    await deleteState(state.runId);
  } else {
    // Persist state back to Redis
    await persistRunUpdate(state.runId, {
      currentPatientState: state.patientState,
      currentPhaseId: state.currentPhaseId,
      mistakeLog: state.mistakeLog,
    });
    await saveState(state);
  }

  return {
    success: !validation.isMistake,
    message: validation.reason,
    patientState: state.patientState,
    score: toScoreBreakdown(state.score),
    simulationEnded,
    ...(outcome !== undefined ? { outcome } : {}),
    phaseAdvanced,
    ...(nextPhaseId !== undefined ? { nextPhaseId } : {}),
  };
}

export { saveState, loadState, deleteState };
