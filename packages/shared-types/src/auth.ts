import { z } from 'zod';

export const RbacRoleSchema = z.enum(['admin', 'instructor', 'trainee', 'observer']);

export type RbacRole = z.infer<typeof RbacRoleSchema>;

// Clerk user IDs format: "user_xxxxxxxx"
export type ClerkUserId = string;

export const UserSchema = z.object({
  id: z.string(),          // Clerk user ID (user_xxx)
  email: z.string().email(),
  role: RbacRoleSchema,
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Represents the resolved user context attached to every authenticated request.
 * The API middleware populates this from the verified Clerk JWT + local DB lookup.
 *
 * - sub:   Clerk user ID (e.g. "user_2abc123xyz")
 * - email: from local shadow users table
 * - role:  from local shadow users table (synced from Clerk org membership via webhook)
 */
export const JwtPayloadSchema = z.object({
  sub: z.string(),              // Clerk user ID
  email: z.string().email(),
  role: RbacRoleSchema,
  iat: z.number().int().optional(),
  exp: z.number().int().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
