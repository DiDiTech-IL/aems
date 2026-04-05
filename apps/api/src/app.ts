import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { getRedis } from './redis.js';
import { env } from './env.js';

// Routes
import { authRoutes } from './routes/auth.js';
import { webhookRoutes } from './routes/webhooks.js';
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

  // ─── WebSocket plugin ───────────────────────────────────────────────────────
  await app.register(fastifyWebsocket);

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(webhookRoutes, { prefix: '/api/v1' });
  await app.register(protocolRoutes, { prefix: '/api/v1/protocols' });
  await app.register(caseRoutes, { prefix: '/api/v1/cases' });
  await app.register(simulationsRestPlugin, { prefix: '/api/v1' });
  await app.register(simulationWsPlugin, { prefix: '/api/v1' });
  await app.register(analyticsPlugin, { prefix: '/api/v1' });

  // ─── Health check ───────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  return app;
}
