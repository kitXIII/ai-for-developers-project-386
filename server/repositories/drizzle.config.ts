import { defineConfig } from 'drizzle-kit';

// Drizzle config lives next to the schema (ADR 0008) but its paths are resolved
// from the working directory (the project root), so `schema` and `out` are
// root-relative. Migrations stay in the root `migrations/` folder and are
// applied by hand: `mise run db:migrate`, never at application start.
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/repositories/schema.ts',
  out: './migrations',
  dbCredentials: {
    // Only `drizzle-kit migrate` reads it; the app reads `DATABASE_URL` in
    // `server/index.ts`, and `mise run db:migrate` refuses to start without it.
    // This file is the only place outside the application runtime that reads the
    // variable.
    url: process.env.DATABASE_URL ?? '',
  },
});
