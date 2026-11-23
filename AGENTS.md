# Календарь звонков

## Overview

Сервис бронирования календаря звонков (учебный проект Хекслета): Fastify 5 + @fastify/vite на сервере,
React 19 + Mantine 9 (SPA) на клиенте, API-контракт в TypeSpec → hey-api SDK. Функциональные сценарии
и подробности стека — в `README.md`.

## Команды

- `mise run` — dev-сервер (Fastify + Vite через @fastify/vite, порт 3000)
- `mise run check` — полный CI-гейт: format → lint → typecheck → test → gen:check → knip → easement → jactionlint → typos → secrets → agent-config + osv-scanner (нужна сеть)
- `mise run check:staged -- <файлы>` / `mise run fix:staged -- <файлы>` — быстрая проверка/автоисправления конкретных файлов; полный `check` гоняйте один раз в конце работы
- `mise run fix` — безопасные автоисправления
- `mise run test` / `pnpm test:watch` — Vitest
- `mise run db:migrate` — применить SQL-миграции из `migrations/` к `DATABASE_URL` для локальной
  БД (через `drizzle-kit`). В проде миграции запускает entrypoint контейнера
  (`node dist/migrate.js && node dist/index.js`, `dockerCommand` в `render.yaml`), а `dist/index.js`
  сам схему не меняет (`docs/adr/0010-migrations-in-deploy.md`). В приложении `DATABASE_URL` читают
  `server/migrate.ts` (deploy-вход) и `server/index.ts` (передаёт опцией в `buildApp()`);
  `server/repositories/drizzle.config.ts` читает ту же переменную только для CLI `drizzle-kit` и
  никогда в рантайме. Без переменной приложение работает на in-memory адаптерах
  (`docs/adr/0008-postgres-drizzle.md`).
- `mise run test:e2e` — Playwright e2e (`test/e2e/*.spec.ts`, проекты mobile 360×800 и desktop 1280×720;
  входит в `check`). Локально браузер ставится один раз: `pnpm exec playwright install chromium`.
  В CI job `check` ставит его сам на каждом прогоне: `pnpm exec playwright install --with-deps chromium`

## API-контракт (главный источник правды)

- Разработка ведётся от контракта (Design First): сначала TypeSpec → `pnpm gen` → артефакты,
  затем сервер и клиент реализуются отдельно. См. `docs/adr/0001-design-first-api.md`.
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

Каждый коммит ссылается на тикет из GitHub Issues: в теле указывается номер задачи
в формате `(тикет #42)`, а коммит, закрывающий задачу, содержит `Closes #42`.

## Процесс

Агент доводит тикет до ветки и открытого PR и останавливается: мерж и прямой пуш в `main` —
решение человека. Явная команда с номером PR («мержи #42»; «мержи и бери X» — только PR,
закрывающий X) разрешает ровно названный PR, но запрет в `opencode.json` технический: одобрение
в диалоге его не снимает, поэтому по такой команде человек либо мержит сам, либо временно убирает
правило.

## Проверки и их особенности

- oxlint запускается с `--deny-warnings`: любое предупреждение = ошибка.
- oxfmt: точки с запятой, одинарные кавычки, ширина 100.
- typecheck — это три отдельных tsc-прохода (root/client `Bundler`, `tsconfig.server.json` NodeNext,
  `tsconfig.test.json`). В server-коде NodeNext: относительные импорты соседних модулей пишутся
  с расширением .js (как в `server/index.ts`), хотя сами файлы — .ts.
- Тесты делятся на два образца. HTTP-тесты (`test/api/contract.test.ts`, `test/server/app.test.ts`)
  строят приложение через `buildApp({ serveClient: false, logger: false })` и ходят в него
  `app.inject()` Fastify — без HTTP-сервера и Vite. `test/server/composition.test.ts` тоже строит
  приложение (в том числе `buildApp` с недоступной БД), но запросы не инжектит: он проверяет
  композицию и то, что старт падает до `listen`. Юнит-тесты слоёв (`test/server/models`,
  `services`, `repositories`, `shared`) приложение не строят — они вызывают модули напрямую.
- `mise run check` включает `agent-config` (`agnix --strict .`) — валидирует этот файл: не ломайте
  структуру и ссылки в `AGENTS.md`/README.
- Фиксеры (`oxfmt`, `oxlint`, `typos`) в pre-commit могут оставить правки в рабочем дереве, если
  хук упал после них: после неудачного коммита проверяйте `git status` перед повторной попыткой.
- Красный `mise run check` отменяет соседние задачи, и `gen:check` может умереть посреди
  `pnpm gen`, оставив `packages/api/generated` недописанным. После падения проверяйте `git status`
  и при необходимости восстанавливайте сгенерированное: `git checkout -- packages/api/generated`.

## Архитектурный гейт (easement)

`easement` проверяет импорты против `easement.yml`: компоненты `client`, `server`, `api`
(`packages/api`) и плоские слои `server-*` с `priority: 1` — `server-routes`, `server-services`,
`server-repositories`, `server-models`, `server-shared`. `server` — только wiring (`app.ts`,
`index.ts`), у него явный перечень пяти слоёв. Направление зависимостей:
`server (wiring) → server-routes → server-services → server-repositories → server-models`,
плюс `server-shared → server-models`; `api` разрешён всем слоям. `layers` делает приложения
сиблингами над контрактом (`client → server` запрещён), `manifests` требует объявлять внешние
пакеты в `package.json`, сгенерированный SDK — `target_only`. Правила для агентов:

- Пользуйтесь скиллом `easement` перед добавлением файла или импорта и всегда, когда `easement check`
  падает: `easement explain <path>` до кода, нарушение чините по его `because`, а не правкой конфига.
- После изменения кода запускайте `easement check` — он должен завершаться с кодом 0
  (на pre-push и в CI он запускается сам).
- Новый слой сервера — новый компонент `server-*` с `priority: 1` и явная запись в `may_depend_on`
  у тех, кто им пользуется. Не расширяйте `layers` (`server-*` там разрешил бы `client → server-*`)
  и не заводите `common` для слоёв (он выдаёт разрешения всем, включая клиент).
- Никогда не редактируйте `easement.yml`, не перегенерируйте бейслайн (`easement baseline`) и не
  добавляйте комментарии `easement:disable` без согласования с человеком.

## Структура

- `client/` — React 19 + Mantine 9 (SPA, Vite); `server/` — Fastify 5, точка входа `server/index.ts`,
  приложение собирается в `buildApp()` (`server/app.ts`); тексты интерфейса и ошибок — каталог
  `server/shared/i18n/` (`ru.ts`, `t()`), на клиенте его загружает `<MessagesProvider>`
  (`client/lib/i18n.tsx`) через `GET /api/v1/messages`;
- `packages/api` (`@app/api`) — единственный workspace-пакет: контракт + генерируемый SDK.

## Ограничения

- `dist/`, `node_modules/`, `packages/api/generated/` — не рецензировать и не исправлять.
- Пользовательский текст в `client/**` и `server/**` — только из каталога: новая строка = новый
  ключ в `server/shared/i18n/ru.ts`, новая ветка — модель в `packages/api/spec/i18n.tsp`. Кириллицу
  вне каталога ловит `test/i18n/no-hardcoded-text.test.ts`; документированные исключения — каталог
  `server/shared/i18n/` и bootstrap-экран в `client/lib/i18n.tsx`, который показывается до
  загрузки каталога. См. `docs/adr/0007-i18n-message-catalog.md`.
- `.github/workflows/hexlet-check.yml` — не трогать.
- `.agents/skills/` — вендорские сторонние скиллы: исключены из oxfmt, typos и agnix; не редактировать и не форматировать.

## Agent skills

### Issue tracker

Задачи и спеки живут в GitHub Issues этого репо, все операции через `gh` CLI.
See `docs/agents/issue-tracker.md`.

Состояние процесса — в GitHub: активный цикл = открытая карта `wayfinder:map` (прогресс — sub-issues),
завершённые циклы = релизы и закрытые спеки. Как их найти — раздел «Состояние процесса»
в `docs/agents/issue-tracker.md`.

### Triage labels

Дефолтный набор из пяти лейблов: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` в корне + `docs/adr/`. See `docs/agents/domain.md`.
