# Календарь звонков

## Overview

Сервис бронирования календаря звонков (учебный проект Хекслета): Fastify 5 + @fastify/vite на сервере,
React 19 + Mantine 9 (SPA) на клиенте, API-контракт в TypeSpec → hey-api SDK. Функциональные сценарии
и подробности стека — в `README.md`.

## Команды

- `mise run` — dev-сервер (Fastify + Vite через @fastify/vite, порт 3000)
- `mise run check` — полный CI-гейт: format → lint → typecheck → test → gen:check → knip → jactionlint → typos → secrets → agent-config + osv-scanner (нужна сеть)
- `mise run check:staged -- <файлы>` / `mise run fix:staged -- <файлы>` — быстрая проверка/автоисправления конкретных файлов; полный `check` гоняйте один раз в конце работы
- `mise run fix` — безопасные автоисправления
- `mise run test` / `pnpm test:watch` — Vitest

## API-контракт (главный источник правды)

- Контракт — TypeSpec в `packages/api/spec/*.tsp`. После изменения: `pnpm gen` (tsp compile → openapi.json → hey-api SDK).
- Сервер импортирует из `@app/api` **только типы** (`import type { Message } from '@app/api/types'`),
  чтобы не тянуть рантайм-зависимость.
- Клиент ходит в API только через React Query: `useQuery(getMessageOptions())` из `@app/api/react-query`;
  Zod-схемы форм — `@app/api/zod`. Правило «только типы» проверяется линтером (`no-restricted-imports` для `server/**`).
- В `packages/api` TypeScript закреплён на 6-й версии (`typescript: "6.0.3"`) — генератор hey-api (openapi-ts)
  ещё не поддерживает TS 7 native. Поэтому в dependabot для этого пакета `typescript` в `ignore`.

## Коммиты

Сообщения коммитов следуют Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `ci:`).
Commitlint проверяет каждый коммит: заголовок — до 120 символов, каждая строка тела — до 100.

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
- Фиксеры (`oxfmt`, `oxlint`, `typos`) в pre-commit могут оставить правки в рабочем дереве, если
  хук упал после них: после неудачного коммита проверяйте `git status` перед повторной попыткой.

## Структура

- `client/` — React 19 + Mantine 9 (SPA, Vite); `server/` — Fastify 5, точка входа `server/index.ts`,
  приложение собирается в `buildApp()` (`server/app.ts`);
- `packages/api` (`@app/api`) — единственный workspace-пакет: контракт + генерируемый SDK.

## Ограничения

- `dist/`, `node_modules/`, `packages/api/generated/` — не рецензировать и не исправлять.
- `.github/workflows/hexlet-check.yml` — не трогать.
- `.agents/skills/` — вендорские сторонние скиллы: исключены из oxfmt, typos и agnix; не редактировать и не форматировать.

## Agent skills

### Issue tracker

Задачи и спеки живут в GitHub Issues этого репо, все операции через `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels

Дефолтный набор из пяти лейблов: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` в корне + `docs/adr/`. See `docs/agents/domain.md`.
