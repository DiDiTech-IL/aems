import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db, users } from '@aems/db';
import type { RbacRole } from '@aems/shared-types';
import { env } from '../env.js';

/**
 * Fastify preHandler: verifies the Clerk JWT and resolves the user from
 * the local shadow users table. Attaches { sub, email, role } to request.user.
 *
 * Token may come from:
 *   - Authorization: Bearer <token>  (REST routes)
 *   - ?token=<token>                  (WebSocket handshake)
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  const token =
    authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : ((request.query as Record<string, string>)['token'] ?? '');

  if (!token) {
    await reply.status(401).send({ error: 'Unauthorized', message: 'Missing token.' });
    return;
  }

  let clerkUserId: string;
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    clerkUserId = payload.sub;
  } catch {
    await reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token.' });
    return;
  }

  const [user] = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);

  if (!user) {
    await reply
      .status(401)
      .send({ error: 'Unauthorized', message: 'User not found in this system.' });
    return;
  }

  request.user = {
    sub: user.id,
    email: user.email,
    role: user.role as RbacRole,
  };
}

/**
 * Returns a preHandler that enforces one of the allowed roles.
 * Must be used AFTER authenticate.
 *
 * Usage: { preHandler: [authenticate, requireRole('admin', 'instructor')] }
 */
export function requireRole(...roles: RbacRole[]) {
  return async function roleGuard(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      await reply
        .status(403)
        .send({ error: 'Forbidden', message: `Requires one of roles: ${roles.join(', ')}.` });
    }
  };
}
