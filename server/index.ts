import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

// The process entry is the only place that reads `DATABASE_URL` (ADR 0008):
// `buildApp()` and the composition receive it as an option, so tests and other
// embeddings never inherit the deployment's database.
const databaseUrl = process.env.DATABASE_URL;

let app: FastifyInstance | undefined;

try {
  app = await buildApp({ databaseUrl });
  await app.listen({
    port: Number(process.env.PORT ?? 3000),
    host: '0.0.0.0',
  });
} catch (error) {
  // The HTTP shell may not exist yet — the startup connection check runs before
  // routes are registered — so this fallback is the one log without a logger.
  if (app) {
    app.log.error(error);
  } else {
    console.error(error);
  }
  process.exit(1);
}
