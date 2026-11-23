# syntax=docker/dockerfile:1

# Production image. Stages: base (node + pnpm), build (full deps, vite + tsc
# output in dist/), prod-deps (runtime dependencies only), runtime.
# The runtime needs dist/ (bundle, dist/migrate.js and cached vite.config.json),
# prod node_modules and package.json — @fastify/vite resolves the app root by
# it. `migrations/` travels next to `dist/` for the deploy entry (ADR 0010).

FROM node:26-alpine AS base
WORKDIR /app
# Node 26 ships without corepack, so pnpm comes from the version
# pinned in the packageManager field of package.json.
COPY package.json ./
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM node:26-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# The migration runner resolves `../migrations` from `dist/` (ADR 0010).
COPY --from=build /app/migrations ./migrations
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
