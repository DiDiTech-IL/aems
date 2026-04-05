import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, users } from '@aems/db';
import { env } from '../env.js';
import { authenticate } from '../middleware/auth.js';

const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['instructor', 'trainee']).default('trainee'),
});

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/register
  app.post('/register', async (request, reply) => {
    const body = RegisterBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', issues: body.error.issues });
    }

    const { email, password, role } = body.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, role })
      .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt });

    return reply.status(201).send({ user });
  });

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = LoginBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', issues: body.error.issues });
    }

    const { email, password } = body.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Constant-time failure — don't reveal whether email exists
      await bcrypt.hash(password, env.BCRYPT_ROUNDS);
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials.' });
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    } as unknown as import('@aems/shared-types').JwtPayload);

    return reply.send({ token });
  });

  // GET /auth/me
  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub } = request.user;

    const [user] = await db
      .select({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, sub))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found.' });
    }

    return reply.send({ user });
  });
}
