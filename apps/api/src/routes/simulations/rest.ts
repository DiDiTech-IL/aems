import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc } from 'drizzle-orm';
import { db, simulationRuns, simulationEvents, caseTemplates, protocolTemplates } from '@aems/db';
import { authenticate, requireRole } from '../../middleware/auth.js';
import {
  initSimulationState,
  saveState,
  loadState,
  deleteState,
} from '../../simulation/engine.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const StartSimulationBody = z.object({
  caseTemplateId: z.string().uuid(),
  protocolTemplateId: z.string().uuid(),
  difficultyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
});

const ListSimulationsQuery = z.object({
  traineeId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'aborted']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const simulationsRestPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /simulations
   * Start a new simulation run.
   * Trainees can only start their own. Trainers/admins can start for any user.
   */
  fastify.post(
    '/simulations',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = req.user;
      const body = StartSimulationBody.safeParse(req.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', details: body.error.flatten() });
      }

      const { caseTemplateId, protocolTemplateId, difficultyLevel } = body.data;

      // Verify case exists and is published
      const [caseRow] = await db
        .select({ id: caseTemplates.id, status: caseTemplates.status, version: caseTemplates.version })
        .from(caseTemplates)
        .where(eq(caseTemplates.id, caseTemplateId))
        .limit(1);

      if (!caseRow) return reply.status(404).send({ error: 'Case template not found.' });
      if (caseRow.status !== 'published') {
        return reply.status(409).send({ error: 'Case template is not published.' });
      }

      // Verify protocol exists and is published
      const [protocolRow] = await db
        .select({ id: protocolTemplates.id, status: protocolTemplates.status, version: protocolTemplates.version })
        .from(protocolTemplates)
        .where(eq(protocolTemplates.id, protocolTemplateId))
        .limit(1);

      if (!protocolRow) return reply.status(404).send({ error: 'Protocol template not found.' });
      if (protocolRow.status !== 'published') {
        return reply.status(409).send({ error: 'Protocol template is not published.' });
      }

      const runId = uuidv4();
      const now = new Date();

      // Insert DB record
      await db.insert(simulationRuns).values({
        id: runId,
        traineeId: user.sub,
        caseTemplateId,
        caseTemplateVersion: caseRow.version,
        protocolTemplateId,
        protocolTemplateVersion: protocolRow.version,
        difficultyLevel,
        status: 'active',
        startedAt: now,
        currentPhaseId: '', // will be filled by initSimulationState
        currentPatientState: {},
        mistakeLog: [],
      });

      // Build and persist state to Redis
      const state = await initSimulationState(
        runId,
        caseTemplateId,
        protocolTemplateId,
        user.sub,
        difficultyLevel,
      );

      // Update DB with initial phase + patient state
      await db
        .update(simulationRuns)
        .set({
          currentPhaseId: state.currentPhaseId,
          currentPatientState: state.patientState,
        })
        .where(eq(simulationRuns.id, runId));

      await saveState(state);

      return reply.status(201).send({
        runId,
        currentPhaseId: state.currentPhaseId,
        patientState: state.patientState,
        difficultyLevel,
        wsUrl: `/simulations/${runId}/ws`,
      });
    },
  );

  /**
   * GET /simulations
   * List simulation runs. Admins/trainers see all (or filter by traineeId).
   * Trainees see only their own.
   */
  fastify.get(
    '/simulations',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = req.user;
      const query = ListSimulationsQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'Validation error', details: query.error.flatten() });
      }

      const { traineeId, status, limit, offset } = query.data;

      // Trainees can only query their own
      const effectiveTraineeId =
        user.role === 'trainee' ? user.sub : (traineeId ?? undefined);

      const conditions = [];
      if (effectiveTraineeId) conditions.push(eq(simulationRuns.traineeId, effectiveTraineeId));
      if (status) conditions.push(eq(simulationRuns.status, status));

      const rows = await db
        .select({
          id: simulationRuns.id,
          traineeId: simulationRuns.traineeId,
          caseTemplateId: simulationRuns.caseTemplateId,
          protocolTemplateId: simulationRuns.protocolTemplateId,
          difficultyLevel: simulationRuns.difficultyLevel,
          status: simulationRuns.status,
          outcome: simulationRuns.outcome,
          startedAt: simulationRuns.startedAt,
          completedAt: simulationRuns.completedAt,
        })
        .from(simulationRuns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(simulationRuns.startedAt))
        .limit(limit)
        .offset(offset);

      return reply.send({ data: rows, limit, offset });
    },
  );

  /**
   * GET /simulations/:runId
   * Full simulation run detail, including score breakdown.
   */
  fastify.get<{ Params: { runId: string } }>(
    '/simulations/:runId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { runId } = req.params;
      if (!z.string().uuid().safeParse(runId).success) {
        return reply.status(400).send({ error: 'runId must be a UUID.' });
      }

      const [row] = await db
        .select()
        .from(simulationRuns)
        .where(eq(simulationRuns.id, runId))
        .limit(1);

      if (!row) return reply.status(404).send({ error: 'Simulation run not found.' });

      // Trainees can only see their own
      if (req.user.role === 'trainee' && row.traineeId !== req.user.sub) {
        return reply.status(403).send({ error: 'Access denied.' });
      }

      // For active runs, enrich with live Redis state
      let liveState = null;
      if (row.status === 'active') {
        const state = await loadState(runId);
        if (state) {
          liveState = {
            elapsedMs: state.elapsedMs,
            patientState: state.patientState,
            currentPhaseId: state.currentPhaseId,
          };
        }
      }

      return reply.send({ ...row, liveState });
    },
  );

  /**
   * GET /simulations/:runId/events
   * Full event log for a completed simulation.
   * Trainers and admins only.
   */
  fastify.get<{ Params: { runId: string } }>(
    '/simulations/:runId/events',
    { preHandler: [authenticate, requireRole('instructor', 'admin')] },
    async (req, reply) => {
      const { runId } = req.params;
      if (!z.string().uuid().safeParse(runId).success) {
        return reply.status(400).send({ error: 'runId must be a UUID.' });
      }

      const events = await db
        .select()
        .from(simulationEvents)
        .where(eq(simulationEvents.simulationRunId, runId))
        .orderBy(simulationEvents.timestampMs);

      return reply.send({ data: events });
    },
  );

  /**
   * DELETE /simulations/:runId
   * Abort an active simulation run.
   */
  fastify.delete<{ Params: { runId: string } }>(
    '/simulations/:runId',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { runId } = req.params;
      if (!z.string().uuid().safeParse(runId).success) {
        return reply.status(400).send({ error: 'runId must be a UUID.' });
      }

      const [row] = await db
        .select({ status: simulationRuns.status, traineeId: simulationRuns.traineeId })
        .from(simulationRuns)
        .where(eq(simulationRuns.id, runId))
        .limit(1);

      if (!row) return reply.status(404).send({ error: 'Simulation run not found.' });

      const user = req.user;
      if (user.role === 'trainee' && row.traineeId !== user.sub) {
        return reply.status(403).send({ error: 'Access denied.' });
      }

      if (row.status !== 'active') {
        return reply.status(409).send({ error: 'Only active simulations can be aborted.' });
      }

      await db
        .update(simulationRuns)
        .set({ status: 'aborted', completedAt: new Date() })
        .where(eq(simulationRuns.id, runId));

      await deleteState(runId);

      return reply.status(204).send();
    },
  );
};
