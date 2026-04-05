import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { z } from 'zod';
import { StubAiClient } from '@aems/ai-client';
import type { JwtPayload } from '@aems/shared-types';
import { processAction, loadState } from '../../simulation/engine.js';
import { authenticate } from '../../middleware/auth.js';

// ─── Message schemas ──────────────────────────────────────────────────────────

const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('action'),
    actionId: z.string().min(1).max(256),
    timestampMs: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('ping'),
  }),
  z.object({
    type: z.literal('abort'),
  }),
]);

type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  send(ws, { type: 'error', code, message });
}

// ─── AI narration (non-blocking, failure-safe) ────────────────────────────────

const ai = new StubAiClient();

async function requestNarration(
  _runId: string,
  patientState: unknown,
  ws: WebSocket,
): Promise<void> {
  try {
    const result = await ai.generate({
      type: 'patient_condition',
      patientState: patientState as import('@aems/shared-types').PatientState,
      elapsedSeconds: 0,
      recentSymptoms: [],
    });
    send(ws, { type: 'narration', text: result.text, stubbed: result.stubbed });
  } catch {
    // Per AGENTS.md: AI failure → simulation continues without narration
  }
}

// ─── WebSocket route ──────────────────────────────────────────────────────────

const params = z.object({ runId: z.string().uuid() });

export const simulationWsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { runId: string } }>(
    '/simulations/:runId/ws',
    { websocket: true },
    async (socket: WebSocket, req: FastifyRequest<{ Params: { runId: string } }>) => {
      // 1. Authenticate — Clerk JWT must be passed as ?token= or Authorization header
      let user: JwtPayload;
      try {
        // Reuse the shared authenticate preHandler; it sets req.user or replies 401
        const mockReply = {
          code: (_n: number) => mockReply,
          send: (_b: unknown) => { throw new Error('UNAUTHENTICATED'); },
        } as unknown as import('fastify').FastifyReply;
        await authenticate(req, mockReply);
        user = req.user;
      } catch {
        sendError(socket, 'UNAUTHENTICATED', 'Invalid or missing token.');
        socket.close(1008, 'Unauthenticated');
        return;
      }

      // 2. Validate runId param
      const parsedParams = params.safeParse(req.params);
      if (!parsedParams.success) {
        sendError(socket, 'INVALID_RUN_ID', 'runId must be a UUID.');
        socket.close(1008, 'Bad request');
        return;
      }

      const { runId } = parsedParams.data;

      // 3. Load simulation state from Redis
      const state = await loadState(runId);
      if (!state) {
        sendError(socket, 'NOT_FOUND', `Simulation run '${runId}' not found or expired.`);
        socket.close(1008, 'Not found');
        return;
      }

      // 4. Verify this trainee owns the run
      if (state.traineeId !== user.sub && user.role !== 'admin' && user.role !== 'instructor') {
        sendError(socket, 'FORBIDDEN', 'You do not have access to this simulation.');
        socket.close(1008, 'Forbidden');
        return;
      }

      // 5. Reject already-finished runs
      if (state.status !== 'active') {
        sendError(socket, 'SIMULATION_ENDED', 'This simulation has already ended.');
        socket.close(1000, 'Simulation ended');
        return;
      }

      // 6. Acknowledge connection
      send(socket, {
        type: 'connected',
        runId,
        currentPhaseId: state.currentPhaseId,
        patientState: state.patientState,
        elapsedMs: state.elapsedMs,
        difficultyLevel: state.difficultyLevel,
      });

      // 7. Message handler
      socket.on('message', async (raw: Buffer | string) => {
        let parsed: ClientMessage;
        try {
          const json: unknown = JSON.parse(raw.toString());
          parsed = ClientMessageSchema.parse(json);
        } catch {
          sendError(socket, 'INVALID_MESSAGE', 'Malformed or unrecognised message.');
          return;
        }

        if (parsed.type === 'ping') {
          send(socket, { type: 'pong' });
          return;
        }

        if (parsed.type === 'abort') {
          state.status = 'aborted';
          send(socket, { type: 'simulation_ended', outcome: 'aborted', runId });
          socket.close(1000, 'Aborted');
          return;
        }

        if (parsed.type === 'action') {
          let result;
          try {
            result = await processAction(state, parsed.actionId, parsed.timestampMs);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Internal engine error.';
            sendError(socket, 'ENGINE_ERROR', msg);
            return;
          }

          // Send deterministic result
          send(socket, {
            type: 'action_result',
            success: result.success,
            message: result.message,
            patientState: result.patientState,
            score: result.score,
            phaseAdvanced: result.phaseAdvanced,
            nextPhaseId: result.nextPhaseId,
          });

          if (result.simulationEnded) {
            send(socket, {
              type: 'simulation_ended',
              outcome: result.outcome,
              score: result.score,
              runId,
            });
            socket.close(1000, 'Simulation complete');
            return;
          }

          // Non-blocking AI narration after state is committed
          void requestNarration(runId, result.patientState, socket);
        }
      });

      socket.on('error', () => {
        // Connection lost — state persisted in Redis, client can reconnect
      });
    },
  );
};
