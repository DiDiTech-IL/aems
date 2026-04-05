import { buildApp } from './app.js';
import { env } from './env.js';
import { closeRedis } from './redis.js';

const app = await buildApp();

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal} — shutting down gracefully.`);
  await app.close();
  await closeRedis();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`AEMS API listening on ${env.HOST}:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
