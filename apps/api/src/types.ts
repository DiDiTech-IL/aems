import type { FastifyInstance } from 'fastify';
import type { JwtPayload } from '@aems/shared-types';

// Extend Fastify types for JWT and RBAC
declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export type { FastifyInstance };
