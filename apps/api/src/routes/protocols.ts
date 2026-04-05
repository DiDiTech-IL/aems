import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db, protocolTemplates } from '@aems/db';
import { ProtocolTemplateSchema } from '@aems/shared-types';
import { validateProtocolStructure, assertNotPublished } from '@aems/protocol-engine';
import { authenticate, requireRole } from '../middleware/auth.js';

const CreateProtocolBodySchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  careLevel: z.enum(['BLS', 'ALS']),
  phases: z.array(z.unknown()).min(1),
});

const ListQuerySchema = z.object({
  status: z.enum(['draft', 'published', 'deprecated']).optional(),
  careLevel: z.enum(['BLS', 'ALS']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function protocolRoutes(app: FastifyInstance): Promise<void> {
  // GET /protocols
  app.get(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const query = ListQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: 'Validation error', issues: query.error.issues });
      }

      const { status, careLevel, limit, offset } = query.data;

      const conditions = [];
      if (status) conditions.push(eq(protocolTemplates.status, status));
      if (careLevel) conditions.push(eq(protocolTemplates.careLevel, careLevel));

      const rows = await db
        .select()
        .from(protocolTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(limit)
        .offset(offset);

      return reply.send({ protocols: rows, limit, offset });
    },
  );

  // GET /protocols/:id
  app.get(
    '/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select()
        .from(protocolTemplates)
        .where(eq(protocolTemplates.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'Not Found', message: 'Protocol not found.' });
      }

      return reply.send({ protocol: row });
    },
  );

  // POST /protocols
  app.post(
    '/',
    { preHandler: [authenticate, requireRole('admin', 'instructor')] },
    async (request, reply) => {
      const body = CreateProtocolBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', issues: body.error.issues });
      }

      // Validate full structure via protocol engine
      const draft = {
        id: uuidv4(),
        ...body.data,
        status: 'draft' as const,
        createdBy: request.user.sub,
        createdAt: new Date().toISOString(),
      };

      const parsed = ProtocolTemplateSchema.safeParse(draft);
      if (!parsed.success) {
        return reply.status(422).send({ error: 'Schema error', issues: parsed.error.issues });
      }

      try {
        validateProtocolStructure(parsed.data);
      } catch (err) {
        return reply.status(422).send({
          error: 'Protocol structure error',
          message: err instanceof Error ? err.message : String(err),
        });
      }

      const [row] = await db
        .insert(protocolTemplates)
        .values({
          name: parsed.data.name,
          version: parsed.data.version,
          status: 'draft',
          careLevel: parsed.data.careLevel,
          phases: parsed.data.phases,
          createdBy: request.user.sub,
        })
        .returning();

      return reply.status(201).send({ protocol: row });
    },
  );

  // POST /protocols/:id/publish
  app.post(
    '/:id/publish',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select()
        .from(protocolTemplates)
        .where(eq(protocolTemplates.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'Not Found', message: 'Protocol not found.' });
      }

      if (row.status === 'published') {
        return reply.status(409).send({ error: 'Conflict', message: 'Protocol is already published.' });
      }

      const [updated] = await db
        .update(protocolTemplates)
        .set({ status: 'published', publishedAt: new Date() })
        .where(eq(protocolTemplates.id, id))
        .returning();

      return reply.send({ protocol: updated });
    },
  );

  // DELETE /protocols/:id  (soft deprecate — never hard delete published)
  app.delete(
    '/:id',
    { preHandler: [authenticate, requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [row] = await db
        .select()
        .from(protocolTemplates)
        .where(eq(protocolTemplates.id, id))
        .limit(1);

      if (!row) {
        return reply.status(404).send({ error: 'Not Found', message: 'Protocol not found.' });
      }

      // Use assertNotPublished as a guard — published protocols cannot be removed
      try {
        assertNotPublished(
          row as unknown as Parameters<typeof assertNotPublished>[0],
          'delete',
        );
      } catch (err) {
        return reply.status(409).send({
          error: 'Conflict',
          message: err instanceof Error ? err.message : String(err),
        });
      }

      await db
        .update(protocolTemplates)
        .set({ status: 'deprecated' })
        .where(eq(protocolTemplates.id, id));

      return reply.status(204).send();
    },
  );
}
