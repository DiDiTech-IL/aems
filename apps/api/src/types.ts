import type { FastifyInstance } from 'fastify';
import type { JwtPayload } from '@aems/shared-types';

// Extend Fastify request with resolved Clerk user context.
// Populated by the authenticate() preHandler in middleware/auth.ts.
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export type { FastifyInstance };
