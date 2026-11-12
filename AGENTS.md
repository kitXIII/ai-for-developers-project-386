# AGENTS.md

## Команды

- `mise run` — dev-сервер (Fastify + Vite через @fastify/vite, порт 3000)
- `mise run check` — полный CI-гейт: format → lint → typecheck → test → gen:check → knip → jactionlint → typos → secrets → agent-config + osv-scanner (нужна сеть)
- `mise run fix` — безопасные автоисправления
- `mise run test` / `pnpm test:watch` — Vitest

## API-контракт (главный источник правды)

- Контракт — TypeSpec в `packages/api/spec/*.tsp`. После изменения: `pnpm gen` (tsp compile → openapi.json → hey-api SDK).
- Сервер импортирует из `@app/api` **только типы** (`import type { Message } from '@app/api/types'`),
  чтобы не тянуть рантайм-зависимость.
- Клиент ходит в API только через React Query: `useQuery(getMessageOptions())` из `@app/api/react-query`;
  Zod-схемы форм — `@app/api/zod`.

## Проверки и их особенности

- oxlint запускается с `--deny-warnings`: любое предупреждение = ошибка.
- oxfmt: точки с запятой, одинарные кавычки, ширина 100.
- typecheck — это три отдельных tsc-прохода (root/client `Bundler`, `tsconfig.server.json` NodeNext,
  `tsconfig.test.json`). В server-коде NodeNext: относительные импорты соседних модулей пишутся
  с расширением .js (как в `server/index.ts`), хотя сами файлы — .ts.
- Тесты используют `app.inject()` Fastify — без HTTP-сервера и Vite; стройте приложение через
  `buildApp({ serveClient: false, logger: false })` (см. `test/api/contract.test.ts`).
- `mise run check` включает `agent-config` (`agnix --strict .`) — валидирует этот файл: не ломайте
  структуру и ссылки в `AGENTS.md`/README.

## Структура

- `client/` — React 19 + Mantine 9 (SPA, Vite); `server/` — Fastify 5, точка входа `server/index.ts`,
  приложение собирается в `buildApp()` (`server/app.ts`);
- `packages/api` (`@app/api`) — единственный workspace-пакет: контракт + генерируемый SDK.

## Ограничения

- `dist/`, `node_modules/`, `packages/api/generated/` — не рецензировать и не исправлять.
- `.github/workflows/hexlet-check.yml` — не трогать.
