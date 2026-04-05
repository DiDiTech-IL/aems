import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, users } from '@aems/db';
import { authenticate } from '../middleware/auth.js';

/**
 * GET /auth/me — returns the current user's profile from the local shadow table.
 * Used by the web frontend to resolve the logged-in user's role and email.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found.' });
    }

    return reply.send({ user });
  });
}
