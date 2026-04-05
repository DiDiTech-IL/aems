import type { FastifyRequest, FastifyReply } from 'fastify';
import type { RbacRole } from '@aems/shared-types';

/**
 * Fastify preHandler that verifies JWT and attaches payload to request.user.
 * Use as: { preHandler: [authenticate] }
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or missing token.' });
  }
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
