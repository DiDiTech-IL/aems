import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, caseTemplates, protocolTemplates } from '@aems/db';
import { CaseTemplateSchema } from '@aems/shared-types';
import { authenticate, requireRole } from '../middleware/auth.js';

const CreateCaseBodySchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  careLevel: z.enum(['BLS', 'ALS']),
  difficultyLevel: z.number().int().min(1).max(3),
  scenario: z.object({
    chiefComplaint: z.string().min(1),
    contextNarrative: z.string().min(1),
    setting: z.string().min(1),
    dispatchInfo: z.string().optional(),
  }),
  initialPatientState: z.unknown(),
  allowedProtocolIds: z.array(z.string().uuid()).min(1),
  rules: z.array(z.unknown()).default([]),
});

const ListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'deprecated']).optional(),
  careLevel: z.enum(['BLS', 'ALS']).optional(),
  difficultyLevel: z.coerce.number().int().min(1).max(3).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function caseRoutes(app: FastifyInstance): Promise<void> {
  // GET /cases
  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = ListQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'Validation error', issues: query.error.issues });
      }

      const { status, careLevel, difficultyLevel, limit, offset } = query.data;

      const conditions = [];
      if (status) conditions.push(eq(caseTemplates.status, status));
      if (careLevel) conditions.push(eq(caseTemplates.careLevel, careLevel));
      if (difficultyLevel !== undefined)
        conditions.push(eq(caseTemplates.difficultyLevel, difficultyLevel));

      const rows = await db
        .select()
        .from(caseTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset);

      return reply.send({ cases: rows, limit, offset });
    },
  );

  // GET /cases/:id
  app.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select()
        .from(caseTemplates)
        .where(eq(caseTemplates.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'Not Found', message: 'Case not found.' });
      }

      return reply.send({ case: row });
    },
  );

  // POST /cases
  app.post(
    '/',
    { preHandler: [authenticate, requireRole('admin', 'instructor')] },
    async (request, reply) => {
      const body = CreateCaseBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', issues: body.error.issues });
      }

      // Verify all referenced protocols exist and are published
      for (const protocolId of body.data.allowedProtocolIds) {
        const [proto] = await db
          .select({ id: protocolTemplates.id, status: protocolTemplates.status })
          .from(protocolTemplates)
          .where(eq(protocolTemplates.id, protocolId))
          .limit(1);

        if (!proto) {
          return reply.status(422).send({
            error: 'Validation error',
            message: `Protocol "${protocolId}" does not exist.`,
          });
        }
        if (proto.status !== 'published') {
          return reply.status(422).send({
            error: 'Validation error',
            message: `Protocol "${protocolId}" is not published.`,
          });
        }
      }

      const draft = {
        id: uuidv4(),
        ...body.data,
        status: 'draft' as const,
        createdBy: request.user.sub,
        createdAt: new Date().toISOString(),
      };

      const parsed = CaseTemplateSchema.safeParse(draft);
      if (!parsed.success) {
        return reply.status(422).send({ error: 'Schema error', issues: parsed.error.issues });
      }

      const [row] = await db
        .insert(caseTemplates)
        .values({
          name: parsed.data.name,
          version: parsed.data.version,
          status: 'draft',
          careLevel: parsed.data.careLevel,
          difficultyLevel: parsed.data.difficultyLevel,
          scenario: parsed.data.scenario,
          initialPatientState: parsed.data.initialPatientState,
          allowedProtocolIds: parsed.data.allowedProtocolIds,
          rules: parsed.data.rules,
          createdBy: request.user.sub,
        })
        .returning();

      return reply.status(201).send({ case: row });
    },
  );

  // POST /cases/:id/publish
  app.post(
    '/:id/publish',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select()
        .from(caseTemplates)
        .where(eq(caseTemplates.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'Not Found', message: 'Case not found.' });
      }

      if (row.status === 'published') {
        return reply.status(409).send({ error: 'Conflict', message: 'Case is already published.' });
      }

      const [updated] = await db
        .update(caseTemplates)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(caseTemplates.id, id))
        .returning();

      return reply.send({ case: updated });
    },
  );
}
