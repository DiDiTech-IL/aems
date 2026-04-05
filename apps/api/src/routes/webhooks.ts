import type { FastifyInstance } from 'fastify';
import { Webhook } from 'svix';
import { eq } from 'drizzle-orm';
import { db, users } from '@aems/db';
import type { RbacRole } from '@aems/shared-types';
import { env } from '../env.js';

// ─── Clerk webhook event shapes (minimal — only fields we use) ────────────────

interface ClerkEmailAddress {
  email_address: string;
  verification?: { status: string };
}

interface ClerkUserCreatedEvent {
  type: 'user.created';
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
  };
}

interface ClerkUserDeletedEvent {
  type: 'user.deleted';
  data: { id: string };
}

interface ClerkOrgMembershipEvent {
  type: 'organizationMembership.created' | 'organizationMembership.updated';
  data: {
    public_user_data: { user_id: string };
    role: string; // e.g. "org:admin", "org:instructor"
  };
}

type ClerkWebhookEvent =
  | ClerkUserCreatedEvent
  | ClerkUserDeletedEvent
  | ClerkOrgMembershipEvent;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a Clerk org role slug ("org:admin", "org:instructor", etc.)
 * to our internal RbacRole.  Unknown slugs default to 'trainee'.
 */
function parseOrgRole(clerkRole: string): RbacRole {
  const slug = clerkRole.replace(/^org:/, '');
  const valid: RbacRole[] = ['admin', 'instructor', 'trainee', 'observer'];
  return valid.includes(slug as RbacRole) ? (slug as RbacRole) : 'trainee';
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /webhooks/clerk
   *
   * Receives Clerk webhook events and syncs them into the local shadow users table.
   * Handled events:
   *   - user.created               → insert user row
   *   - user.deleted               → delete user row
   *   - organizationMembership.created / .updated → update role
   *
   * Security: Svix signature verified against CLERK_WEBHOOK_SECRET.
   * Raw body is required for signature verification — we add a content-type
   * parser scoped to this route's encapsulated context.
   */
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (_req, body, done) => {
      try {
        // Attach raw string for svix and also parse for route handlers
        done(null, { raw: body as string, parsed: JSON.parse(body as string) });
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post<{ Body: { raw: string; parsed: unknown } }>(
    '/webhooks/clerk',
    async (request, reply) => {
      const svixId = request.headers['svix-id'] as string | undefined;
      const svixTs = request.headers['svix-timestamp'] as string | undefined;
      const svixSig = request.headers['svix-signature'] as string | undefined;

      if (!svixId || !svixTs || !svixSig) {
        return reply.status(400).send({ error: 'Missing svix headers.' });
      }

      let event: ClerkWebhookEvent;
      try {
        const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
        event = wh.verify(request.body.raw, {
          'svix-id': svixId,
          'svix-timestamp': svixTs,
          'svix-signature': svixSig,
        }) as ClerkWebhookEvent;
      } catch {
        return reply.status(400).send({ error: 'Invalid webhook signature.' });
      }

      // ── Handle events ─────────────────────────────────────────────────────

      if (event.type === 'user.created') {
        const primaryEmail =
          event.data.email_addresses.find(
            (e) => e.verification?.status === 'verified',
          )?.email_address ?? event.data.email_addresses[0]?.email_address;

        if (primaryEmail) {
          await db
            .insert(users)
            .values({ id: event.data.id, email: primaryEmail, role: 'trainee' })
            .onConflictDoNothing();
        }
      } else if (event.type === 'user.deleted') {
        await db.delete(users).where(eq(users.id, event.data.id));
      } else if (
        event.type === 'organizationMembership.created' ||
        event.type === 'organizationMembership.updated'
      ) {
        const userId = event.data.public_user_data.user_id;
        const role = parseOrgRole(event.data.role);
        await db
          .update(users)
          .set({ role, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      return reply.status(200).send({ received: true });
    },
  );
}
