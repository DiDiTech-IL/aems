import { z } from 'zod';

export const RbacRoleSchema = z.enum(['admin', 'instructor', 'trainee', 'observer']);

export type RbacRole = z.infer<typeof RbacRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: RbacRoleSchema,
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  role: RbacRoleSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
