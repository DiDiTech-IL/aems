import { describe, it, expect } from '@jest/globals';
import {
  validateProtocolStructure,
  assertNotPublished,
  validateAction,
  evaluatePhaseCompletion,
} from './protocol-validator.js';
import type { ProtocolTemplate, ProtocolPhase } from '@aems/shared-types';
import { v4 as uuidv4 } from 'uuid';

function makeProtocol(overrides?: Partial<ProtocolTemplate>): ProtocolTemplate {
  return {
    id: uuidv4(),
    name: 'Test BLS Protocol',
    version: '1.0.0',
    status: 'draft',
    careLevel: 'BLS',
    createdAt: new Date().toISOString(),
    createdBy: uuidv4(),
    phases: [
      {
        id: 'phase-1',
        name: 'Primary Survey',
        order: 0,
        actions: [
          {
            id: 'action-scene-safe',
            label: 'Scene safety check',
            classification: 'required',
            scoreValue: 10,
            dependsOnActionIds: [],
          },
          {
            id: 'action-gloves',
            label: 'Don gloves',
            classification: 'optional',
            scoreValue: 5,
            dependsOnActionIds: [],
          },
          {
            id: 'action-wrong',
            label: 'Administer morphine without assessment',
            classification: 'wrong',
            scoreValue: -20,
            dependsOnActionIds: [],
          },
        ],
        successCriteria: {
          requiredActionIds: ['action-scene-safe'],
          maxWrongActions: 0,
        },
      },
    ],
    ...overrides,
  };
}

describe('ProtocolValidator', () => {
  describe('validateProtocolStructure', () => {
    it('accepts a valid protocol', () => {
      expect(() => validateProtocolStructure(makeProtocol())).not.toThrow();
    });

    it('rejects duplicate phase orders', () => {
      const protocol = makeProtocol();
      protocol.phases.push({ ...protocol.phases[0]!, id: 'phase-2', order: 0 });
      expect(() => validateProtocolStructure(protocol)).toThrow(/duplicate phase order/);
    });

    it('rejects duplicate action ids', () => {
      const protocol = makeProtocol();
      protocol.phases[0]!.actions.push({
        id: 'action-scene-safe',
        label: 'Duplicate',
        classification: 'optional',
        scoreValue: 0,
        dependsOnActionIds: [],
      });
      expect(() => validateProtocolStructure(protocol)).toThrow(/duplicate action id/);
    });

    it('rejects successCriteria referencing unknown action', () => {
      const protocol = makeProtocol();
      protocol.phases[0]!.successCriteria.requiredActionIds.push('nonexistent-action');
      expect(() => validateProtocolStructure(protocol)).toThrow(/unknown action id/);
    });
  });

  describe('assertNotPublished', () => {
    it('throws when protocol is published', () => {
      const protocol = makeProtocol({ status: 'published' });
      expect(() => assertNotPublished(protocol, 'update')).toThrow(/Cannot update/);
    });

    it('does not throw for draft protocols', () => {
      const protocol = makeProtocol({ status: 'draft' });
      expect(() => assertNotPublished(protocol, 'update')).not.toThrow();
    });
  });

  describe('validateAction', () => {
    it('returns correct classification for a valid required action', () => {
      const protocol = makeProtocol();
      const result = validateAction(protocol, 'phase-1', 'action-scene-safe', new Set(), 0);
      expect(result.classification).toBe('required');
      expect(result.isMistake).toBe(false);
      expect(result.scoreValue).toBe(10);
    });

    it('marks explicitly wrong actions as mistakes', () => {
      const protocol = makeProtocol();
      const result = validateAction(protocol, 'phase-1', 'action-wrong', new Set(), 0);
      expect(result.isMistake).toBe(true);
      expect(result.classification).toBe('wrong');
    });

    it('marks actions from unknown protocol as wrong', () => {
      const protocol = makeProtocol();
      const result = validateAction(protocol, 'phase-1', 'not-in-protocol', new Set(), 0);
      expect(result.isMistake).toBe(true);
    });

    it('gives partial credit for late but valid action', () => {
      const protocol = makeProtocol();
      protocol.phases[0]!.actions[0]!.timeWindowSeconds = 30;
      const result = validateAction(protocol, 'phase-1', 'action-scene-safe', new Set(), 60000);
      expect(result.scoreValue).toBe(5); // 50% of 10
      expect(result.isMistake).toBe(false);
    });
  });

  describe('evaluatePhaseCompletion', () => {
    const phase: ProtocolPhase = {
      id: 'phase-1',
      name: 'Primary Survey',
      order: 0,
      actions: [],
      successCriteria: {
        requiredActionIds: ['action-scene-safe'],
        maxWrongActions: 0,
      },
    };

    it('is not complete when required action is missing', () => {
      const result = evaluatePhaseCompletion(phase, new Set(), 0, 0);
      expect(result.complete).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('is complete and passed when required action is performed', () => {
      const result = evaluatePhaseCompletion(phase, new Set(['action-scene-safe']), 0, 1000);
      expect(result.complete).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('is complete but not passed when too many wrong actions', () => {
      const result = evaluatePhaseCompletion(phase, new Set(['action-scene-safe']), 1, 0);
      expect(result.complete).toBe(true);
      expect(result.passed).toBe(false);
    });
  });
});
