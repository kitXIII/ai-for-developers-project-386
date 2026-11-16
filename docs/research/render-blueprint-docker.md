# `render.yaml` для `kit-calls`: Docker на free-плане в Singapore

Резолюция research-тикета [#41](https://github.com/kitXIII/ai-for-developers-project-386/issues/41).
Источники — официальная документация Render (Blueprint YAML Reference и JSON-схема `render.yaml`,
Docker, free plan, auto-deploy/CI, build pipeline, health checks, MCP) и исходники
`render-oss/render-mcp-server`. Render MCP в этом окружении не авторизован (нет `RENDER_API_KEY`),
поэтому живой `plan_blueprint` не запускался: ниже — документация, а не результат вызова API.
Дата сверки: 2026-11-16.

Жёсткие рамки решения (не пересматриваются): Blueprint через MCP, образ собирается Render'ом из
`./Dockerfile` с контекстом `.`, имя сервиса `kit-calls`, регион `singapore`, план `free`, ветка
`main`, health check `/`, автодеплой после зелёных GitHub-чеков.

## 1. Резолюция: готовый `render.yaml`

```yaml
services:
  - type: web
    name: kit-calls
    runtime: docker
    plan: free
    region: singapore
    branch: main
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /
    autoDeployTrigger: checksPass
```

`dockerfilePath` и `dockerContext` совпадают с дефолтами (`./Dockerfile`, корень репозитория) и
могут быть опущены; оставлены явно, чтобы конфигурация не зависела от дефолтов Render.
`dockerCommand`, `startCommand` и `buildCommand` не нужны: у образа есть `CMD`
(`CMD ["node", "dist/index.js"]`), а `buildCommand` для Docker задавать нельзя.
`repo` не нужен: по умолчанию Render берёт репозиторий, в котором лежит Blueprint.

### Поля: обязательность и дефолты

По [Blueprint YAML Reference](https://render.com/docs/blueprint-spec) и
[JSON-схеме](https://render.com/schema/render.yaml.json) (`definitions.serverService`):

| Поле                | Обязательно                 | Дефолт Render                                 | У нас                |
| ------------------- | --------------------------- | --------------------------------------------- | -------------------- |
| `name`              | да                          | —                                             | `kit-calls`          |
| `type`              | да                          | —                                             | `web`                |
| `runtime`           | да (если нет `buildSource`) | —                                             | `docker`             |
| `plan`              | нет                         | `0.5c-512mb` (платный) для нового web-сервиса | `free`               |
| `region`            | нет                         | `oregon`                                      | `singapore`          |
| `branch`            | нет                         | ветка Blueprint'а (если репозиторий тот же)   | `main`               |
| `dockerfilePath`    | нет                         | `./Dockerfile`                                | `./Dockerfile`       |
| `dockerContext`     | нет                         | корень репозитория                            | `.`                  |
| `dockerCommand`     | нет                         | `CMD` из `Dockerfile`                         | не задаём            |
| `healthCheckPath`   | нет                         | не задан → TCP-проверка                       | `/`                  |
| `autoDeployTrigger` | нет                         | `commit` для нового сервиса                   | `checksPass`         |
| `repo`              | нет                         | репозиторий, содержащий `render.yaml`         | не задаём            |
| `numInstances`      | нет                         | `1`                                           | не задаём (free = 1) |

Важное: **`plan` по умолчанию платный** (`0.5c-512mb`), поэтому `plan: free` обязателен.
`region` и `type` после создания сервиса поменять нельзя; `plan` — можно (это вызовет деплой).

`autoDeployTrigger` — актуальное имя поля; enum в схеме: `off`, `commit`, `checksPass`
(старое `autoDeploy: true/false` — deprecated, при наличии обоих побеждает `autoDeployTrigger`).
`checksPass` в Blueprint-спеке допустим и не имеет оговорок про Docker или free-план.

## 2. Как ведёт себя `checksPass`

Официальная формулировка ([Deploys → Integrating with CI](https://render.com/docs/deploys#integrating-with-ci)):

- Render ждёт завершения CI-чеков **нового коммита** и деплоит, если **все** чеки прошли.
- «Прошёл» = GitHub conclusion `success`, `neutral` или `skipped`.
- Render **не деплоит**, если (а) у коммита не обнаружено ни одного чека или (б) хотя бы один чек
  упал (`failure`, `cancelled`, `timed_out` и т. п.).
- Поддерживаются GitHub Actions и инструменты, пишущие в GitHub Checks API. Проверяются чеки
  коммита в связанной ветке, а не «required checks» из branch protection: в документации речь про
  **все** чеки репозитория. Отдельного механизма «только required» нет.

Для этого репозитория на push в `main` это означает, что гейтом становятся **все** workflow-джобы:

- `quality` (`on: push: branches: [main]`) — джоба `Quality gates`; `architecture` запускается
  только на pull request, `security` — только по расписанию, поэтому на push они дают `skipped`,
  что считается успехом;
- `hexlet-check` (`on: push: branches: ['**']`) — джоба `Hexlet project check`;
- `release-please` (`on: push: branches: [main]`) — джоба `Release please`.

То есть `hexlet-check` **входит** в гейт, и его красный результат блокирует деплой, даже если
`quality` зелёный. Если GitHub Actions отключены или для коммита почему-то не создано ни одного
чек-рана (например, пуш от бота/через API с `GITHUB_TOKEN`, не порождающий workflow), Render
**не задеплоит** — это не «деплой по таймауту», а именно «нет чеков → нет деплоя».

Чего документация не говорит: сколько именно Render ждёт чеки и есть ли у ожидания таймаут/повтор.
Это не подтверждено — при первом деплое надо посмотреть на страницу Deploys/Events сервиса.

Ограничений `checksPass` для free-плана или Docker-сервисов в документации нет: это поведение
Git-based сервиса, а Docker-from-Dockerfile — Git-based сервис.

## 3. Free + Docker + Singapore

- `free` — валидный план web-сервиса в схеме Blueprint (`serverPlan`) и в
  [Compute plans](https://render.com/docs/compute-plans): 0.1 CPU / 512 MB. Docker — обычный
  `runtime` web-сервиса; в [Docker on Render](https://render.com/docs/docker#building-from-a-dockerfile)
  сказано, что Blueprints и остальные платформенные возможности поддерживаются для Docker так же,
  как для нативных рантаймов. В списке ограничений free-плана Docker не упомянут
  ([Free](https://render.com/docs/free#free-web-services)).
- `singapore` — валидный регион ([Regions](https://render.com/docs/regions), enum схемы). Free-инстансы
  в Singapore существуют: status-страница Render дважды в 2026 году описывала временное отключение
  именно «free instance types in the Singapore region»
  ([инцидент 2026-03-13](https://status.render.com/incidents/d9k4p51v1y7g),
  [инцидент 2026-04-08](https://status.render.com/incidents/1sjd0k0fstjs)).
- Прямой фразы «free + docker + singapore поддерживается» в документации нет. Подтверждены по
  отдельности все три составляющие и отсутствие ограничений на их сочетание; окончательная проверка —
  успешный `plan_blueprint` (план с ошибкой валидации вернёт `planningOutcome: failed` и `notices`,
  до апрува дело не дойдёт).

Лимиты free ([Free web services](https://render.com/docs/free#free-web-services)):

- 0.1 CPU / 512 MB RAM, один инстанс; scaling, persistent disk, shell/SSH, edge caching и
  one-off jobs недоступны; входящий rate limit заметно ниже, чем у платных
  ([Troubleshooting](https://render.com/docs/troubleshooting-deploys#http-error-codes)).
- 750 free instance-hours на workspace в календарный месяц; при исчерпании free-сервисы
  приостанавливаются до начала следующего месяца. Один круглосуточно живой сервис съедает
  ~744 часа из 750.
- Spin-down после 15 минут без входящего трафика (HTTP-запросы и WebSocket), spin-up ~1 минута;
  Render может перезапустить free-сервис в любой момент.
- Эфемерный filesystem: изменения теряются при каждом деплое, рестарте и spin-down.
- Сборка идёт не на free-инстансе: pipeline — 2 CPU / 8 GB (Starter tier), 500 pipeline-минут в
  месяц на Hobby-плане workspace ([Build pipeline](https://render.com/docs/build-pipeline#pipeline-minutes)).
  Исчерпание минут без платёжного метода останавливает новые сборки до конца месяца.
- Таймауты: build/pipeline — 120 минут, pre-deploy — 30 минут, start command — 15 минут; новый
  инстанс должен пройти health checks в течение 15 минут, иначе деплой отменяется
  ([Deploy steps](https://render.com/docs/deploys#deploy-steps),
  [Health checks](https://render.com/docs/health-checks#handling-failures)). Отдельного
  «таймаута первого деплоя» в документации нет — первый деплой ограничен этими же лимитами.

## 4. `repo`, `repoId`, путь к `render.yaml`, ветка

- В Blueprint-спеке у сервиса есть только `repo` (URL Git-репозитория), и он **необязателен**: если
  не задан, используется репозиторий, содержащий `render.yaml`
  ([`repo`](https://render.com/docs/blueprint-spec#repo)). Поля `repoId` в схеме нет, а у
  `serverService` стоит `additionalProperties: false` — лишний ключ будет отклонён валидацией.
  Репозиторий Blueprint'а задаётся на уровне самого Blueprint (в MCP — `repoUrl`, `branch`, `path`).
- По умолчанию Render ищет `render.yaml` в корне репозитория; путь настраивается — в дашборде поле
  _Blueprint Path_, в MCP — параметр `path` (дефолт `render.yaml`)
  ([Setup](https://render.com/docs/infrastructure-as-code#setup)).
- `branch` сервиса: если репозиторий тот же, что у Blueprint, и поле опущено — берётся ветка
  Blueprint'а. Мы задаём `main` явно. Blueprint привязывается к ветке при создании; каждый push в эту
  ветку, **меняющий файл Blueprint'а**, запускает sync и передеплой затронутых ресурсов.
- MCP `create_blueprint` принимает `repoUrl` только в виде `https://` или `ssh://` (SCP-style
  `git@github.com:...` отклоняется, SSH конвертируется в HTTPS). Текущий `origin` в репозитории —
  `git@github.com:kitXIII/ai-for-developers-project-386.git`, поэтому в вызов надо передавать
  `https://github.com/kitXIII/ai-for-developers-project-386`.
- Автодеплой требует подключённого Git-провайдера: «Services that use … a public Git repository URL
  must be deployed manually» ([Automatic deploys](https://render.com/docs/deploys#automatic-deploys)).
  Репозиторий публичный, поэтому перед созданием Blueprint'а GitHub должен быть подключён в Render
  как Git provider; иначе `checksPass` может оказаться нерабочим. Это следствие документированного
  правила, а не отдельно проверенный факт — проверяется по переключателю Auto-Deploy в настройках
  сервиса после создания.
- `render.yaml` должен уже лежать в `main` на момент `create_blueprint`: инструмент читает только
  удалённый репозиторий, локальные незапушенные изменения не видны.

## 5. Требования к контейнеру

- HTTP-сервер обязан слушать `0.0.0.0` (IPv6 не поддерживается) и порт из `PORT`
  ([Port binding](https://render.com/docs/web-services#port-binding)). `PORT` по умолчанию `10000`
  для всех web-сервисов; Render прокидывает его в контейнер, поэтому `ENV PORT=3000` в `Dockerfile`
  перекрывается, а `server/index.ts` читает `process.env.PORT`. `EXPOSE 3000` — только метаданные,
  на Render не влияет. Если Render не сможет определить порт, деплой упадёт с ошибкой port scan.
- Занятые порты Render: `18012`, `18013`, `19099` — не используем.
- Health check: с `healthCheckPath: /` Render шлёт HTTP GET на `/` и считает проверку успешной при
  ответе `2xx`/`3xx` **в течение 5 секунд**; иначе — неуспешной. `Host` — верифицированный custom
  domain, иначе `<service>.onrender.com`. В нашем приложении `GET /` отдаёт `reply.html()` (SPA),
  то есть 200.
- Без `healthCheckPath` по умолчанию работает TCP-проб: успех = инстанс принимает TCP-соединение на
  открытом порту за 5 секунд. TCP не проверяет, что приложение действительно отвечает по HTTP;
  HTTP-проверка проверяет приложение.
- Успешный деплой: сборка прошла, новый инстанс поднялся и **все** новые инстансы одновременно
  проходят health checks — тогда трафик переключается. Если за 15 минут это не произошло, деплой
  отменяется, продолжает работать предыдущая версия. Для первого деплоя предыдущей версии нет —
  сервис просто останется не Live.
- `Dockerfile` должен содержать `CMD` или `ENTRYPOINT` — у нас есть `CMD ["node", "dist/index.js"]`.

## 6. Alpha-инструменты MCP против дашборда

Из описаний инструментов в `render-oss/render-mcp-server`
([README → Blueprints](https://github.com/render-oss/render-mcp-server#blueprints),
`pkg/blueprint/tools.go`) и [документации MCP](https://render.com/docs/mcp-server):

- Все Blueprint-инструменты помечены «public alpha (early access)», их контракт может меняться.
  Публичная страница документации MCP перечисляет сервисы/деплои/логи/метрики/БД/Key Value, но
  Blueprint-инструменты там ещё не описаны — они есть в README open-source сервера.
- `create_blueprint` создаёт Blueprint и **планирует** первый sync, но не применяет изменения.
  Параметры: `repoUrl` (обязателен), `branch`, `path` (дефолт `render.yaml`), `name` (дефолт — имя
  репозитория без `.git`), `autoSync` (дефолт `true`), `existingResources` (дефолт `create_new`),
  `workspaceId` (или выбранный workspace).
- `approve_blueprint` применяет **уже спланированный** sync и требует явной авторизации пользователя:
  «Call approve_blueprint only after the user authorizes applying the reviewed plan».
  Значения `sync: false`-переменных передаются через `manualEnvVars`; в нашем Blueprint таких
  переменных нет.
- `plan_blueprint` не применяет изменения; при `planningOutcome: failed` или `no_changes` апрув
  запрещён. Если уже есть pending/running sync, надо дождаться его завершения.
- `update_blueprint` умеет менять только `name`, `branch`, `path`, `autoSync`. Удаления Blueprint'а
  или ресурсов через MCP нет; изменения вне этих полей — через дашборд/REST API. Масштабирование и
  другие операционные настройки MCP не меняет.
- Первый sync требует апрува даже при `autoSync: true`; после апрува `autoSync` применяет последующие
  push'и, меняющие файл Blueprint'а.
- `approve_blueprint` возвращает `dashboardUrl` и состояние sync **до** завершения сборки/деплоя;
  дождаться результата через MCP-ответ нельзя — нужны дашборд, `get_blueprint`, логи/деплои.
- `existingResources: create_new` (дефолт) при совпадении имён создаёт ресурсы с добавленным
  случайным суффиксом. Если сервис `kit-calls` уже существует, план покажет другое имя — это надо
  заметить до апрува (или использовать `adopt`).
- MCP работает только с удалённым репозиторием: локальные правки Blueprint-файла должны быть
  запушены до `create_blueprint`/`plan_blueprint`.

## 7. Подводные камни и чек-лист первого деплоя

Подводные камни:

1. **Забыть `plan: free`** — дефолт платный `0.5c-512mb`, и сервис молча станет платным.
2. **`checksPass` — это все чеки, а не только required.** Красный `hexlet-check` или
   `release-please` блокирует деплой; ноль чеков — тоже блокирует. `skipped`-джобы не мешают.
3. **`hexlet-check` бежит на каждый push** (`branches: '**'`) и является внешним грейдинговым
   action'ом; его падение по причинам, не связанным с рантаймом, останавливает деплой.
4. **Публичный репозиторий без подключённого Git provider** — по документации такой сервис
   деплоится только вручную, то есть автодеплой и `checksPass` не заработают. Подключить GitHub в
   Render до создания Blueprint'а.
5. **Sync Blueprint'а и CI-чеки** — при push, меняющем `render.yaml`, Blueprint автоматически
   применяет конфигурацию и передеплоивает затронутые сервисы; в документации не сказано, что этот
   передеплой ждёт `checksPass`. Не смешивайте правку `render.yaml` с рискованным кодом в одном
   коммите (или выключите `autoSync`). Это не подтверждено документацией — проверить на практике.
6. **Имя с суффиксом** из-за `existingResources: create_new` при коллизии с уже существующим
   `kit-calls`.
7. **Данные приложения живут в памяти** (`inMemoryBookings`, `inMemoryMeetingTypes` в `server/app.ts`):
   spin-down free-сервиса, рестарт и каждый деплой стирают бронирования и типы встреч. Для free-плана
   это не «теоретическая» потеря, а штатное поведение.
8. **750 instance-hours** — один всегда включённый сервис почти исчерпывает месячную квоту; при
   нескольких free-сервисах они делят её.
9. **500 pipeline-минут** на Hobby: каждый Docker-билд (pnpm install + build) их тратит; без
   платёжного метода при исчерпании сборки останавливаются до конца месяца.
10. **Холодный старт ~1 минута** после spin-down: первый запрос (и пользователь) ждёт. Судя по тому,
    что free-сервисы по документации всё же засыпают, health-пробы Render не удерживают их от
    spin-down; отдельно это не документировано.
11. **`region` и `type` неизменяемы** после создания; ошибка в регионе = пересоздание сервиса.
12. **Ручные правки Blueprint-управляемого сервиса в дашборде** перезаписываются при следующем sync.
13. **`PORT`**: не хардкодить 3000 в `listen`; `EXPOSE 3000` и `ENV PORT=3000` в образе безвредны,
    потому что Render передаёт свой `PORT`, а код читает переменную окружения.

Чек-лист первого деплоя:

1. GitHub подключён в Render как Git provider; `render.yaml` уже в `main`.
2. `create_blueprint` с `repoUrl: https://github.com/kitXIII/ai-for-developers-project-386`,
   `branch: main`, `path: render.yaml`, `name: kit-calls` (иначе имя Blueprint'а будет именем репо),
   `autoSync: true`.
3. План: ровно один сервис `kit-calls`, `runtime: docker`, `plan: free`, `region: singapore`,
   без суффикса в имени, `notices` без ошибок. При `planningOutcome: failed` — исправить и
   перепланировать, не апрувить.
4. `approve_blueprint` после явного подтверждения человеком; дождаться окончания сборки в дашборде
   по `dashboardUrl` (MCP-ответ приходит раньше).
5. Логи сборки: pnpm install, `pnpm build`, сборка образа; уложиться в 120 минут (реально — минуты).
6. После Live: `GET https://kit-calls.onrender.com/` → 200 и SPA; health check `/` зелёный.
7. Настройки сервиса: Auto-Deploy = _After CI Checks Pass_, branch `main`, health check `/`,
   plan Free, region Singapore.
8. Проверить гейт: пуш в `main` (например, тот же `render.yaml` отдельным коммитом) должен встать
   в ожидание чеков и задеплоиться только после зелёных `quality`, `hexlet-check`, `release-please`.
9. Проверить spin-down (15 минут без трафика) и что после него приложение поднимается ~за минуту,
   а данные в памяти ожидаемо теряются.

## 8. Источники

| Что подтверждаем                                                              | Источник                                                                                                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Поля Blueprint, дефолты, `autoDeployTrigger: checksPass`                      | [Blueprint YAML Reference](https://render.com/docs/blueprint-spec), [JSON-схема](https://render.com/schema/render.yaml.json)                  |
| `checksPass`: все чеки, `success`/`neutral`/`skipped`, ноль чеков/красный чек | [Deploys → Integrating with CI](https://render.com/docs/deploys#integrating-with-ci)                                                          |
| Автодеплой требует Git provider; публичный repo URL — только вручную          | [Deploys → Automatic deploys](https://render.com/docs/deploys#automatic-deploys)                                                              |
| Путь Blueprint-файла, привязка к ветке, sync по push                          | [Blueprints → Setup](https://render.com/docs/infrastructure-as-code#setup)                                                                    |
| Docker-from-Dockerfile, Blueprints для Docker, `CMD`/`dockerCommand`          | [Docker on Render](https://render.com/docs/docker#building-from-a-dockerfile)                                                                 |
| Free web services: 0.1 CPU/512 MB, 750 часов, spin-down 15 мин, ограничения   | [Deploy for Free](https://render.com/docs/free#free-web-services)                                                                             |
| Порт, `0.0.0.0`, `PORT=10000`, reserved ports, детект порта                   | [Web Services → Port binding](https://render.com/docs/web-services#port-binding)                                                              |
| HTTP/TCP health checks, 2xx/3xx, 5 сек, 15 минут на деплой                    | [Health Checks](https://render.com/docs/health-checks)                                                                                        |
| 500 pipeline-минут Hobby, build 2 CPU/8 GB, таймауты                          | [Build Pipeline](https://render.com/docs/build-pipeline)                                                                                      |
| Регионы, включая Singapore                                                    | [Regions](https://render.com/docs/regions)                                                                                                    |
| Free-инстансы в Singapore существуют; были временные отключения               | [Status 2026-03-13](https://status.render.com/incidents/d9k4p51v1y7g), [Status 2026-04-08](https://status.render.com/incidents/1sjd0k0fstjs)  |
| MCP: alpha Blueprint-инструменты, `create`/`plan`/`approve`, ограничения      | [render-mcp-server README](https://github.com/render-oss/render-mcp-server#blueprints), [MCP Server docs](https://render.com/docs/mcp-server) |

Не подтверждено документацией (и потому вынесено в риски, а не в факты): точный таймаут ожидания
чеков в `checksPass`; явная фраза «free + docker + singapore поддерживается»; ждёт ли Blueprint-sync
CI-чеки перед передеплоем; работает ли автодеплой для публичного репозитория, подключённого только
по URL, без Git provider.
