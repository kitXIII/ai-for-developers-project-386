import { defineConfig } from 'drizzle-kit';

// Drizzle config lives next to the schema (ADR 0008) but its paths are resolved
// from the working directory (the project root), so `schema` and `out` are
// root-relative. This config serves the local `mise run db:migrate` path only:
// production applies the journal inside the container entrypoint
// (`server/migrate.ts`), not through drizzle-kit (ADR 0010).
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/repositories/schema.ts',
  out: './migrations',
  dbCredentials: {
    // Only the drizzle-kit CLI reads it, and `mise run db:migrate` refuses to
    // start without it. The application runtime reads `DATABASE_URL` in
    // `server/index.ts` (HTTP entry) and `server/migrate.ts` (deploy entry).
    url: process.env.DATABASE_URL ?? '',
  },
});
