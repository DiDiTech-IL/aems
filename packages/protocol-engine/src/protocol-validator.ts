import type {
  ProtocolTemplate,
  ProtocolPhase,
  ProtocolAction,
  ActionClassification,
} from '@aems/shared-types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionValidationResult {
  actionId: string;
  classification: ActionClassification;
  scoreValue: number;
  isMistake: boolean;
  reason: string;
}

export interface PhaseCompletionResult {
  phaseId: string;
  complete: boolean;
  passed: boolean;
  missingRequiredActionIds: string[];
  wrongActionCount: number;
  timeLimitExceeded: boolean;
}

// ─── Immutability Guard ───────────────────────────────────────────────────────

/**
 * Throws if a caller attempts to operate on a published protocol in a mutating way.
 * All writes to published protocols must be rejected at the API layer,
 * but this provides a defence-in-depth check in the engine.
 */
export function assertNotPublished(protocol: ProtocolTemplate, operation: string): void {
  if (protocol.status === 'published') {
    throw new Error(
      `Cannot ${operation} on published protocol "${protocol.name}" v${protocol.version}. ` +
        `Create a new version instead.`,
    );
  }
}

// ─── Protocol Validator ───────────────────────────────────────────────────────

/**
 * Validates that a ProtocolTemplate is internally consistent.
 * Pure function — throws on validation failure.
 */
export function validateProtocolStructure(protocol: ProtocolTemplate): void {
  const phaseOrders = protocol.phases.map((p) => p.order);
  const uniqueOrders = new Set(phaseOrders);
  if (uniqueOrders.size !== protocol.phases.length) {
    throw new Error(`Protocol "${protocol.name}": duplicate phase order values detected.`);
  }

  const allActionIds = new Set<string>();
  for (const phase of protocol.phases) {
    for (const action of phase.actions) {
      if (allActionIds.has(action.id)) {
        throw new Error(
          `Protocol "${protocol.name}": duplicate action id "${action.id}" in phase "${phase.name}".`,
        );
      }
      allActionIds.add(action.id);
    }
  }

  for (const phase of protocol.phases) {
    for (const requiredId of phase.successCriteria.requiredActionIds) {
      if (!phase.actions.some((a) => a.id === requiredId)) {
        throw new Error(
          `Protocol "${protocol.name}" phase "${phase.name}": ` +
            `successCriteria references unknown action id "${requiredId}".`,
        );
      }
    }

    for (const action of phase.actions) {
      for (const depId of action.dependsOnActionIds) {
        if (!allActionIds.has(depId)) {
          throw new Error(
            `Protocol "${protocol.name}": action "${action.id}" depends on unknown action "${depId}".`,
          );
        }
      }
    }
  }
}

// ─── Action Lookup ────────────────────────────────────────────────────────────

export function findAction(
  protocol: ProtocolTemplate,
  actionId: string,
): ProtocolAction | undefined {
  for (const phase of protocol.phases) {
    const action = phase.actions.find((a) => a.id === actionId);
    if (action) return action;
  }
  return undefined;
}

export function findPhaseForAction(
  protocol: ProtocolTemplate,
  actionId: string,
): ProtocolPhase | undefined {
  return protocol.phases.find((p) => p.actions.some((a) => a.id === actionId));
}

// ─── Action Validation ────────────────────────────────────────────────────────

/**
 * Validates a performed action against the current protocol phase.
 * Returns classification, score value, and whether it's a mistake.
 * Pure function.
 */
export function validateAction(
  protocol: ProtocolTemplate,
  currentPhaseId: string,
  actionId: string,
  performedActionIds: ReadonlySet<string>,
  elapsedMs: number,
): ActionValidationResult {
  const phase = protocol.phases.find((p) => p.id === currentPhaseId);
  if (!phase) {
    return {
      actionId,
      classification: 'wrong',
      scoreValue: 0,
      isMistake: true,
      reason: `Phase "${currentPhaseId}" not found in protocol.`,
    };
  }

  const action = phase.actions.find((a) => a.id === actionId);

  if (!action) {
    // Check if it belongs to a different phase (out of sequence)
    const otherPhase = findPhaseForAction(protocol, actionId);
    if (otherPhase) {
      return {
        actionId,
        classification: 'wrong',
        scoreValue: 0,
        isMistake: true,
        reason: `Action "${actionId}" belongs to phase "${otherPhase.id}", not current phase "${currentPhaseId}".`,
      };
    }

    return {
      actionId,
      classification: 'wrong',
      scoreValue: 0,
      isMistake: true,
      reason: `Action "${actionId}" is not part of this protocol.`,
    };
  }

  if (action.classification === 'wrong') {
    return {
      actionId,
      classification: 'wrong',
      scoreValue: action.scoreValue,
      isMistake: true,
      reason: `Action "${action.label}" is explicitly contraindicated in this protocol.`,
    };
  }

  // Check dependencies
  for (const depId of action.dependsOnActionIds) {
    if (!performedActionIds.has(depId)) {
      return {
        actionId,
        classification: 'wrong',
        scoreValue: 0,
        isMistake: true,
        reason: `Action "${action.label}" requires "${depId}" to be performed first.`,
      };
    }
  }

  // Check time window
  if (action.timeWindowSeconds !== undefined) {
    const windowMs = action.timeWindowSeconds * 1000;
    if (elapsedMs > windowMs) {
      return {
        actionId,
        classification: action.classification,
        scoreValue: Math.round(action.scoreValue * 0.5), // partial credit for late
        isMistake: false,
        reason: `Action "${action.label}" performed after time window — partial credit awarded.`,
      };
    }
  }

  return {
    actionId,
    classification: action.classification,
    scoreValue: action.scoreValue,
    isMistake: false,
    reason: `Action "${action.label}" correctly performed.`,
  };
}

// ─── Phase Completion ─────────────────────────────────────────────────────────

/**
 * Determines whether a phase's success criteria have been met.
 * Pure function.
 */
export function evaluatePhaseCompletion(
  phase: ProtocolPhase,
  performedActionIds: ReadonlySet<string>,
  wrongActionCount: number,
  elapsedMs: number,
): PhaseCompletionResult {
  const missingRequiredActionIds = phase.successCriteria.requiredActionIds.filter(
    (id) => !performedActionIds.has(id),
  );

  const timeLimitExceeded =
    phase.successCriteria.timeLimitSeconds !== undefined &&
    elapsedMs > phase.successCriteria.timeLimitSeconds * 1000;

  const allRequiredMet = missingRequiredActionIds.length === 0;
  const wrongsWithinLimit = wrongActionCount <= phase.successCriteria.maxWrongActions;

  const complete = allRequiredMet;
  const passed = allRequiredMet && wrongsWithinLimit && !timeLimitExceeded;

  return {
    phaseId: phase.id,
    complete,
    passed,
    missingRequiredActionIds,
    wrongActionCount,
    timeLimitExceeded,
  };
}
