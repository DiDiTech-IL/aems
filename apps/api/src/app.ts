import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { getRedis } from './redis.js';
import { env } from './env.js';

// Routes
import { authRoutes } from './routes/auth.js';
import { protocolRoutes } from './routes/protocols.js';
import { caseRoutes } from './routes/cases.js';
import { simulationsRestPlugin } from './routes/simulations/rest.js';
import { simulationWsPlugin } from './routes/simulations/websocket.js';
import { analyticsPlugin } from './routes/analytics.js';

export async function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { level: env.LOG_LEVEL, transport: { target: 'pino-pretty', options: { colorize: true } } }
        : { level: env.LOG_LEVEL },
  });

  // ─── Security plugins ───────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // API-only server — no HTML responses
  });

  await app.register(fastifyCors, {
    // In production, restrict to the explicit CORS_ORIGIN env var (e.g. the Vercel URL).
    // All browser → API requests go through the Next.js rewrite proxy (same-origin),
    // so the only direct cross-origin traffic is the simulation WebSocket.
    // WebSocket connections are not subject to the browser's CORS policy, so 'false'
    // (no CORS headers on HTTP requests) is safe for same-domain deployments.
    // Set CORS_ORIGIN to your Vercel URL if you need cross-origin REST calls.
    origin:
      env.NODE_ENV === 'production'
        ? (env.CORS_ORIGIN ? env.CORS_ORIGIN : false)
        : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
    redis: getRedis(),
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip,
  });

  // ─── Auth plugin ────────────────────────────────────────────────────────────
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { algorithm: 'HS256', expiresIn: '8h' },
    // Allow passing token via ?token= query param for WebSocket handshake
    decode: { complete: true },
    messages: {
      badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
      noAuthorizationInHeaderMessage: 'Authorisation header is missing.',
      authorizationTokenExpiredMessage: 'Authorisation token has expired.',
      authorizationTokenInvalid: (err) => `Authorisation token is invalid: ${err.message}`,
    },
  });

  // Expose JWT token from query string for WebSocket routes
  app.addHook('onRequest', async (req) => {
    const token = (req.query as Record<string, string>)['token'];
    if (token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${token}`;
    }
  });

  // ─── WebSocket plugin ───────────────────────────────────────────────────────
  await app.register(fastifyWebsocket);

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(protocolRoutes, { prefix: '/api/v1/protocols' });
  await app.register(caseRoutes, { prefix: '/api/v1/cases' });
  await app.register(simulationsRestPlugin, { prefix: '/api/v1' });
  await app.register(simulationWsPlugin, { prefix: '/api/v1' });
  await app.register(analyticsPlugin, { prefix: '/api/v1' });

  // ─── Health check ───────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}
