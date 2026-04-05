import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { db, simulationRuns } from '@aems/db';
import { authenticate, requireRole } from '../middleware/auth.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const TraineeAnalyticsQuery = z.object({
  traineeId: z.string().uuid().optional(),
});

const LeaderboardQuery = z.object({
  caseTemplateId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const analyticsPlugin: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /analytics/summary
   * Returns aggregate stats for the requesting trainee,
   * or a specfied trainee if the caller is a trainer/admin.
   */
  fastify.get(
    '/analytics/summary',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = req.user;
      const query = TraineeAnalyticsQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'Validation error', details: query.error.flatten() });
      }

      // Trainees can only query their own stats
      const targetId =
        user.role === 'trainee' ? user.sub : (query.data.traineeId ?? user.sub);

      if (user.role === 'trainee' && query.data.traineeId && query.data.traineeId !== user.sub) {
        return reply.status(403).send({ error: 'Access denied.' });
      }

      const [totals] = await db
        .select({
          total: count(),
          completed: sql<number>`sum(case when ${simulationRuns.status} = 'completed' then 1 else 0 end)`,
          aborted: sql<number>`sum(case when ${simulationRuns.status} = 'aborted' then 1 else 0 end)`,
        })
        .from(simulationRuns)
        .where(eq(simulationRuns.traineeId, targetId));

      const completed = await db
        .select({
          id: simulationRuns.id,
          caseTemplateId: simulationRuns.caseTemplateId,
          outcome: simulationRuns.outcome,
          score: simulationRuns.score,
          difficultyLevel: simulationRuns.difficultyLevel,
          completedAt: simulationRuns.completedAt,
        })
        .from(simulationRuns)
        .where(
          and(
            eq(simulationRuns.traineeId, targetId),
            eq(simulationRuns.status, 'completed'),
          ),
        )
        .orderBy(desc(simulationRuns.completedAt))
        .limit(100);

      // Derive per-case best scores
      const perCase: Record<string, { bestScore: number; attempts: number; lastOutcome: string }> =
        {};

      for (const run of completed) {
        const caseId = run.caseTemplateId;
        const totalScore =
          typeof run.score === 'object' &&
          run.score !== null &&
          'total' in run.score
            ? Number((run.score as Record<string, unknown>)['total'] ?? 0)
            : 0;

        const existing = perCase[caseId];
        if (!existing) {
          perCase[caseId] = {
            bestScore: totalScore,
            attempts: 1,
            lastOutcome: run.outcome ?? 'unknown',
          };
        } else {
          existing.attempts++;
          if (totalScore > existing.bestScore) existing.bestScore = totalScore;
          existing.lastOutcome = run.outcome ?? existing.lastOutcome;
        }
      }

      return reply.send({
        traineeId: targetId,
        total: Number(totals?.total ?? 0),
        completed: Number(totals?.completed ?? 0),
        aborted: Number(totals?.aborted ?? 0),
        perCase,
      });
    },
  );

  /**
   * GET /analytics/leaderboard
   * Top scores for a given case. Trainers and admins only.
   */
  fastify.get(
    '/analytics/leaderboard',
    { preHandler: [authenticate, requireRole('instructor', 'admin')] },
    async (req, reply) => {
      const query = LeaderboardQuery.safeParse(req.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'Validation error', details: query.error.flatten() });
      }

      const { caseTemplateId, limit } = query.data;

      const conditions = [eq(simulationRuns.status, 'completed')];
      if (caseTemplateId) conditions.push(eq(simulationRuns.caseTemplateId, caseTemplateId));

      const rows = await db
        .select({
          traineeId: simulationRuns.traineeId,
          caseTemplateId: simulationRuns.caseTemplateId,
          score: simulationRuns.score,
          outcome: simulationRuns.outcome,
          completedAt: simulationRuns.completedAt,
          difficultyLevel: simulationRuns.difficultyLevel,
        })
        .from(simulationRuns)
        .where(and(...conditions))
        .orderBy(
          desc(sql`(${simulationRuns.score}->>'total')::numeric`),
        )
        .limit(limit);

      return reply.send({ data: rows });
    },
  );

  /**
   * GET /analytics/cohort
   * Platform-wide aggregate stats. Admins only.
   */
  fastify.get(
    '/analytics/cohort',
    { preHandler: [authenticate, requireRole('admin')] },
    async (_req, reply) => {
      const [stats] = await db
        .select({
          totalRuns: count(),
          completedRuns: sql<number>`sum(case when ${simulationRuns.status} = 'completed' then 1 else 0 end)`,
          successRate: sql<number>`
            round(
              100.0 * sum(case when ${simulationRuns.outcome} = 'success' then 1 else 0 end)
              / nullif(sum(case when ${simulationRuns.status} = 'completed' then 1 else 0 end), 0),
              2
            )
          `,
          avgScore: sql<number>`
            round(
              avg((${simulationRuns.score}->>'total')::numeric),
              2
            )
          `,
        })
        .from(simulationRuns);

      return reply.send(stats);
    },
  );
};
