import type { AiClient, AiRequest, AiResponse } from './types.js';

/**
 * Stub AI client — returns deterministic mock narration.
 * Replace with LlamaClient when llama.cpp is available.
 *
 * SAFETY: This client cannot make medical decisions.
 * It only generates descriptive text based on structured input.
 */
export class StubAiClient implements AiClient {
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(request: AiRequest): Promise<AiResponse> {
    let text: string;

    switch (request.type) {
      case 'patient_condition': {
        const { patientState, elapsedSeconds } = request;
        const { heartRate, spO2, gcs } = patientState.vitals;
        text =
          `[STUB] At ${elapsedSeconds}s — Patient is ${patientState.consciousness}, ` +
          `HR ${heartRate}, SpO2 ${spO2}%, GCS ${gcs}. ` +
          `Airway: ${patientState.airway}. ` +
          (request.recentSymptoms.length > 0
            ? `New symptoms: ${request.recentSymptoms.join(', ')}.`
            : 'No new symptoms reported.');
        break;
      }

      case 'debrief_summary': {
        const { outcome, scoreTotal, scoreMax, mistakeCount, missionDurationSeconds } = request;
        const pct = scoreMax > 0 ? Math.round((scoreTotal / scoreMax) * 100) : 0;
        text =
          `[STUB] Simulation complete — Outcome: ${outcome}. ` +
          `Score: ${scoreTotal}/${scoreMax} (${pct}%). ` +
          `Duration: ${missionDurationSeconds}s. ` +
          `Mistakes: ${mistakeCount}.`;
        break;
      }
    }

    return { text, requestType: request.type, stubbed: true };
  }
}
