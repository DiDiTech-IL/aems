import type { PatientState, RuleEffect, Vitals } from '@aems/shared-types';

/**
 * Applies a list of rule effects to the patient state.
 * Pure function — returns a new PatientState.
 * Never called by AI — only by the rule/simulation engine.
 */
export function applyEffectsToPatient(
  state: PatientState,
  effects: readonly RuleEffect[],
): PatientState {
  let next = deepCopyState(state);

  for (const effect of effects) {
    switch (effect.type) {
      case 'vital_change':
        next = applyVitalDelta(next, effect.vital, effect.delta);
        break;

      case 'vital_set':
        next = setVital(next, effect.vital, effect.value);
        break;

      case 'add_symptom':
        if (!next.symptoms.includes(effect.symptom)) {
          next = { ...next, symptoms: [...next.symptoms, effect.symptom] };
        }
        break;

      case 'remove_symptom':
        next = { ...next, symptoms: next.symptoms.filter((s) => s !== effect.symptom) };
        break;

      // Non-physiology effects are handled by other engines
      case 'score_delta':
      case 'end_simulation':
      case 'set_flag':
        break;
    }
  }

  return next;
}

function applyVitalDelta(state: PatientState, vitalKey: string, delta: number): PatientState {
  const vitals = state.vitals as Record<string, unknown>;
  const current = vitals[vitalKey];
  if (typeof current !== 'number') return state;

  return {
    ...state,
    vitals: {
      ...state.vitals,
      [vitalKey]: clampVital(vitalKey, current + delta),
    },
  };
}

function setVital(state: PatientState, vitalKey: string, value: number): PatientState {
  return {
    ...state,
    vitals: {
      ...state.vitals,
      [vitalKey]: clampVital(vitalKey, value),
    },
  };
}

/**
 * Clamps physiological values to plausible ranges.
 * Prevents rule misconfiguration from producing impossible states.
 */
function clampVital(key: string, value: number): number {
  const clamps: Record<string, [number, number]> = {
    heartRate: [0, 300],
    systolicBP: [0, 300],
    diastolicBP: [0, 200],
    respiratoryRate: [0, 60],
    spO2: [0, 100],
    temperature: [20, 45],
    gcs: [3, 15],
    etco2: [0, 100],
    bloodGlucose: [0, 50],
  };

  const range = clamps[key];
  if (!range) return value;
  return Math.max(range[0], Math.min(range[1], value));
}

function deepCopyState(state: PatientState): PatientState {
  return {
    ...state,
    vitals: { ...state.vitals } as Vitals,
    symptoms: [...state.symptoms],
    notes: state.notes ? [...state.notes] : undefined,
  };
}
