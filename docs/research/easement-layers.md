# Слои внутри `server/`: вложенные компоненты в easement

Исследование по тикету [#20](https://github.com/kitXIII/ai-for-developers-project-386/issues/20).
Вопрос: может ли `easement` выразить три компонента внутри `server/` (`server/models`,
`server/services`, `server/repositories`) с правилами направлений зависимостей — и как это записывается.

**Короткий ответ.** Да. Иерархии компонентов в easement нет: `components` — плоская карта, и каждый
файл принадлежит **ровно одному** компоненту. Вложенность эмулируется перекрытием `in`-паттернов и
правилом выбора владельца: побеждает больший `priority`, затем более длинный паттерн
([configuration.md:54], [components.rs:775]). Направления выражаются allow-list'ом `may_depend_on`
(и жёсткими `must_not_depend_on` / `must_not_reach`); `layers` — **отдельный источник разрешений**,
а не только запрет, и это главный подводный камень. Для нашей раскладки `routes → services →
repositories → models` достаточно четырёх компонентов `server-*` и пяти правил, без изменения
`layers`; подробности и готовый фрагмент — ниже.

Версии и первоисточники, на которых всё проверено:

- релиз `easement 0.6.6` (его ставит `mise` по `"github:mokevnin/easement" = "latest"`, `mise.toml:4`);
- `easement schema` этого бинаря (JSON Schema — машинная правда о полях);
- исходники и docs upstream на коммите
  [`582969d9ea8b1ae926072b78e84509e233e2daaa`](https://github.com/mokevnin/easement/tree/582969d9ea8b1ae926072b78e84509e233e2daaa)
  (2026-11-15) — все ссылки вида `[configuration.md:54]` ведут туда.

> Версия имеет значение: docs на `main` описывают команду `easement policy`, которой **нет** в
> выпущенном 0.6.6 (`easement policy` → `unrecognized subcommand`), и поле `Rule.allow_implementers`,
> которого нет в схеме 0.6.6. Для нашей задачи (компоненты, `priority`, `in`, `may_depend_on`,
> `layers`, `tests: auto`, `explain`/`graph`/`suggest`/`review`/`propose`) всё есть в 0.6.6.

## 1. Модель компонентов: плоскости, а не дерево

- `components` — `object` с `additionalProperties: $ref Component` (см. [easement.schema.json],
  definitions `Component` и `Rule`). Ни `children`, ни `parent`, ни `namespace` нет.
- У компонента одно обязательное поле — `in`; это глоб или список глобов. Паттерн называет
  **модуль**: каталог или файл. `P` покрывает сам `P`, всё ниже (`P/**`) и файл `P.<ext>`
  ([components.rs:9-15], [configuration.md:54]).
- Когда файл покрывают несколько компонентов, владелец выбирается по паре
  `(priority, pattern_len)`, где `pattern_len` — длина **написанного** глоба (после раскрытия
  плейсхолдеров, без хвостового `/`); при полном равенстве выигрывает **последняя** запись, а записи
  идут в алфавитном порядке имён компонентов, потому что `components` — `BTreeMap`
  ([components.rs:288-306], [components.rs:775-790], [config/mod.rs:35]).
- Один файл — один владелец: это не «вложенность», а «вырезание» (docs прямо говорят: «so a single
  file can be carved out of a larger component», [configuration.md:54]).

Отсюда следствие: `server` и `server-models` не «родитель и ребёнок», а два соседних компонента,
чей матчинг пересекается; файл `server/models/order.ts` достанется тому, кто выиграл по
`(priority, длина)`.

## 2. Поля `Component` и `Rule`, которые для этого предназначены

| Поле                             | Где         | Что делает                                                                                                         | Нужно нам?                                                   |
| -------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `in`                             | `Component` | глоб(ы) каталога/файла; `*` — в пределах одного сегмента, `**` — через каталоги; плейсхолдеры `<feature>` — слайсы | да, основа                                                   |
| `priority`                       | `Component` | кто выиграет при пересечении; по умолчанию `0`                                                                     | да, `1` на вложенных — страховка от будущих правок паттернов |
| `except`                         | `Component` | паттерны, которые компонент **отдаёт** следующему подходящему                                                      | альтернатива `priority`; проверено, работает                 |
| `optional`                       | `Component` | разрешает `in`, не покрывший ни одного файла; иначе `unmatched`                                                    | да, на время миграции (каталогов ещё нет)                    |
| `public`                         | `Component` | другие компоненты могут импортировать только эти пути                                                              | опционально: баррель `server/services/index.ts`              |
| `surfaces`                       | `Component` | именованные «поверхности» внутри **одного** компонента, каждая со своим списком `importers`                        | нет: не задаёт направления между слоями                      |
| `allow_importers`                | `Component` | только перечисленные компоненты (и сам) могут импортировать                                                        | опционально: «в routes ходит только wiring»                  |
| `isolated`                       | `Component` | экземпляры одного компонента (`*`/плейсхолдер) не зависят друг от друга                                            | нет, это про фичи, не про слои                               |
| `defines`                        | `Component` | имена типов, которые обязаны жить здесь (`*Repository`)                                                            | опционально, как страховка                                   |
| `part`                           | `Component` | часть файлов (Cargo feature)                                                                                       | нет                                                          |
| `may_depend_on`                  | `Rule`      | allow-list исходящих зависимостей                                                                                  | да, основной инструмент направлений                          |
| `must_not_depend_on`             | `Rule`      | жёсткий запрет, **сильнее** `may_depend_on`, `common` и `layers` ([configuration.md:235])                          | опционально, страховка от широких глобов                     |
| `must_not_reach`                 | `Rule`      | запрет и прямой зависимости, и любой цепочки импортов                                                              | опционально, транзитивный вариант                            |
| `max_fan_out`, `max_instability` | `Rule`      | метрики связности                                                                                                  | нет                                                          |

Четыре уточнения по конкретным полям:

- **`in`-глобы** умеют и файлы: `in: server/storage.ts` — легально и проверено (`explain` показывает
  `component: server-repositories (matches 'server/storage.ts')`). Это позволяет натянуть слои на
  текущую плоскую раскладку до физического переноса файлов.
- **`public`** на вложенном компоненте работает: при `server-services.public: [server/services/index]`
  `propose server/routes/x.ts → server/services/foo.ts` даёт `rejected [privacy]`, а
  `→ server/services/index.ts` — `allowed by may_depend_on`. Значит, баррель-паттерн применим, но
  требует самих баррелей.
- **`surfaces`** — не замена вложенным компонентам. Docs: поверхности открывают части одного
  компонента разным импортёрам, и «Both still depend on `billing`, one component with one owner, one
  place in cycles and one set of metrics» ([configuration.md:116]). Внутри одного компонента импорты
  свободны (`from == to → same component`, [config/mod.rs:924-925]), поэтому поверхности не могут
  запретить `services → routes`; для направлений нужны отдельные компоненты.
- **`isolated`** для наших каталогов не подходит и падает на загрузке конфига:
  `component 'server-models' is isolated, so every 'in' pattern needs a '*' or a placeholder like
  '<page>' to tell the instances apart, and no '**'` ([configuration.md:134], проверено).

## 3. Матчинг при пересечении `server` и `server/models`

Проверено на живом конфиге (`easement explain <path>` и `easement propose`):

1. `priority: 1` на `server-models` при `priority: 0` у `server` — выигрывает `server-models` для
   любого `server/models/**`, даже если паттерн родителя длиннее (тест upstream:
   `priority_beats_length_and_except_hands_files_on`, [components.rs:1203-1221]).
2. Без `priority` вложенный всё равно выигрывает за счёт длины паттерна: `server` (6) против
   `server/models` (13). Проверено: после снятия `priority: 1` `explain server/routes/bookings.ts`
   по-прежнему отвечает `component: server-routes (matches 'server/routes')`.
3. Полное равенство `(priority, pattern_len)` — редкость, и тогда решает алфавитный порядок:
   выигрывает запись, которая позже в `BTreeMap`, то есть имя, которое больше лексикографически
   (тест `the_last_of_equal_priority_and_pattern_length_owns_a_path`, [components.rs:858-877]).
   Поэтому `priority` на вложенных компонентах — не лишний: он делает результат независимым от
   формы паттернов и от алфавита.
4. `except` на родителе — эквивалентная альтернатива: `server: { in: server, except:
   ['server/models/**', 'server/services/**', 'server/repositories/**'] }` при `priority: 0` на
   детях. Проверено: владение уходит детям, `server` сохраняет `app.ts`/`index.ts`. Минус —
   паттерны `except` надо держать синхронными с тремя `in`; плюс — `server` явно «отдаёт», а не
   «проигрывает по длине».
5. `tests: auto` перебивает всё: компонент `tests` создаётся с `priority: 1_000_000` и `except` из
   `not_test_patterns` ([config/mod.rs:820-850]). Проверено: `explain server/services/x.test.ts` →
   `component: tests (matches '**/*.test.*')`, `priority: 1000000`. Колокация теста рядом со слоем
   не ломает слои — тест живёт в `tests`.

## 4. `layers` — это grant, а не только запрет (главный подводный камень)

Docs обещают: «A layer may depend on every layer below it and never on one above», списки-сиблинги
не зависят друг от друга, `closed: true` нельзя перескочить ([configuration.md:214-235]). Но
формулировка «rules — allow-list» ([configuration.md:57]) создаёт ложное впечатление, что `layers`
только сужает. В коде `Config::grant` перебирает источники разрешения по порядку: same component →
`forbids` (жёсткие запреты) → `tests` → `may_depend_on` → `common` → **`layers`**
([config/mod.rs:923-945]). То есть `layers` **разрешает** любую зависимость сверху вниз.

Проверено на эксперименте: если добавить вложенные компоненты в `layers` под `client`,

```
layers:
  - [client, server]
  - server-routes
  - server-services
  - server-repositories
  - server-models
  - api
```

то `propose client/x.ts → server/services/y.ts` отвечает `allowed by layers`, хотя в
`rules.client.may_depend_on` только `api`. То же с `server → client`, если поставить `client` ниже.
Это регрессия границы «SPA не ходит в сервер».

Варианты, если `layers` для вложенных всё-таки нужны:

- на `client` добавить `must_not_depend_on: ['server-*']` — жёсткий запрет сильнее `layers`
  (проверено: `client -> server-services is forbidden`, в `explain` — `forbidden: server-services
  (through 'server-*')`);
- держать вложенные компоненты **вне** `layers` (рекомендуемый вариант): направления задаются
  только `may_depend_on`, и `layers` остаётся тем, чем был — `[client, server]` + `api`;
- `closed: true` на `server-services` добавляет «нельзя перескочить» (проверено:
  `server-routes -> server-repositories is not allowed: the closed layer server-services is between
  them`), но не отменяет grant вниз для всех, кто выше, — от `client` это не спасает.

## 5. Как запретить `services → routes`

Четыре механизма, от рекомендуемого к страховочному:

1. **Не перечислять `server-routes` в `may_depend_on` у `server-services`** — allow-list по
   умолчанию всё запрещает. Сообщение: `server-services -> server-routes is not allowed (written as
   server/routes/y.ts)` + `because` правила (проверено через `propose`).
2. **Не выделять `routes` в отдельный компонент.** Тогда `services → routes` — это
   `server-services → server`: services не перечисляет `server`, и запрет получается бесплатно. Но
   `server` начнёт владеть и `app.ts` (wiring), и обработчиками, а это разные права: `app.ts`
   обязан импортировать всё, обработчикам в хранилище нельзя. Поэтому отдельный `server-routes`
   полезнее.
3. **`allow_importers: [server]` на `server-routes`** — «в routes ходит только wiring». Проверено:
   `tests -> server-routes: server-routes is open only to server`. Подводный камень: это блокирует и
   `tests`, которые захотят импортировать обработчик напрямую (docs требуют перечислять `tests` в
   `allow_importers`, если он нужен, [configuration.md:156-166], [configuration.md:122]).
4. **`must_not_depend_on: [server-routes]` у `server-services`** — избыточно при точном allow-list,
   но переживает будущее расширение глоба (`may_depend_on: ['server*']`) и даёт сообщение
   `is forbidden` вместо `is not allowed`. Так же работает `must_not_reach`, если запрет нужен
   транзитивно.

## 6. Готовый фрагмент для нашей раскладки

Целевое направление: `routes → services → repositories → models`, `server` (wiring: `app.ts`,
`index.ts`) — над всеми, `api` — под всеми (из него берутся типы), `tests` — сбоку. Вложенные
компоненты **не** добавляются в `layers`; `layers` остаётся как есть.

```yaml
components:
  server: { in: server } # wiring: app.ts, index.ts — и только они
  server-routes: { in: server/routes, priority: 1 }
  server-services: { in: server/services, priority: 1 } # optional: true, пока каталога нет
  server-repositories: { in: server/repositories, priority: 1 } # optional: true, пока каталога нет
  server-models: { in: server/models, priority: 1 } # optional: true, пока каталога нет

  # Общий код, который нужен всем слоям (errors, validation-примитивы). Через `common` его
  # разрешено импортировать каждому компоненту без перечисления (docs: common grants to every
  # component), и он не создаёт цикла с wiring-компонентом `server`.
  server-shared: { in: server/shared, optional: true }

common: [server-shared]

rules:
  server:
    may_depend_on: [api, server-routes, server-services, server-repositories, server-models]
    because: 'app.ts собирает приложение и передаёт зависимости вниз'
  server-routes:
    may_depend_on: [api, server-services, server-models]
    because: 'роуты переводят HTTP в вызовы сервисов и не ходят в хранилище'
  server-services:
    may_depend_on: [api, server-repositories, server-models]
    because: 'сценарии живут в сервисах; routes им недоступны'
  server-repositories:
    may_depend_on: [api, server-models]
    because: 'хранилище — единственное место с I/O'
  server-models:
    may_depend_on: [api]
    because: 'модели — данные и валидация без зависимостей'
  tests:
    may_depend_on: ['server*', api]
    because: 'тесты собирают приложение и дёргают любой слой'
```

Почему именно так:

- `rules.server` перечисляет все слои (или, короче, `['server-*', api]` — глоб по именам
  компонентов работает и раскрывается при загрузке, `explain` показывает `through 'server-*'`).
  Wiring-компоненту можно импортировать всё: он ничего не реализует.
- `server-routes` не перечисляет `server-repositories` → `routes → repositories` запрещено.
  Если нужен «нельзя перескакивать» на уровне `layers`, это не требуется: allow-list уже точный.
- `server-models` не перечисляет ничего, кроме `api` → `models → repositories` запрещено.
- `tests` получает глоб `'server*'`, иначе после вырезания каталогов существующие тесты
  (`test/server/slots.test.ts` и будущие на `server/services/*`) упадут:
  `tests -> server-services is not allowed` (проверено).
- `api` в каждом списке — потому что почти каждый слой берёт типы/Zod-схемы из `@app/api`.

Опциональные усиления (не обязательны для направлений):

```yaml
components:
  server-services:
    in: server/services
    priority: 1
    public: [server/services/index] # в сервис ходят только через баррель
  server-repositories:
    in: server/repositories
    priority: 1
    defines: ['*Repository'] # класс *Repository живёт только здесь

rules:
  client:
    may_depend_on: [api]
    must_not_depend_on: ['server-*'] # если вложенные когда-нибудь попадут в `layers`
  server-models:
    must_not_depend_on: [server-services, server-routes] # страховка от широкого глоба
```

И «контрактные примеры» — они пиннят решения без кода и без каталогов (проверено: пути могут не
существовать, `check` судит их как `propose`, [configuration.md:524-538]):

```yaml
examples:
  - {
      from: server/services/use-case.ts,
      to: server/routes/route.ts,
      expect: rejected,
      rule: dependency,
      because: 'services не знают про HTTP',
    }
  - {
      from: server/models/order.ts,
      to: server/repositories/orders.ts,
      expect: rejected,
      rule: dependency,
    }
  - {
      from: server/routes/route.ts,
      to: server/repositories/orders.ts,
      expect: rejected,
      rule: dependency,
    }
  - { from: test/server/use-case.test.ts, to: server/services/use-case.ts, expect: allowed }
```

Неверная экспектация печатает ровно то, что нужно:
`example server/routes/route.ts -> server/repositories/orders.ts: expects allowed, but the policy now
decides rejected [dependency] ... restore what the policy meant, or update the example if the change
is meant`.

## 7. Совместимость с `tests: auto` и `rules.tests`

- `tests: auto` создаёт компонент `tests` с `priority: 1_000_000`, `optional: true`, `except` из
  «не тестовых» паттернов и перебивает **любой** другой компонент для тестовых файлов
  ([config/mod.rs:820-850], [configuration.md:399-410]). Вложенные `server-*` этому не мешают.
- Если объявить свой компонент `tests` в `components`, загрузка падает:
  `` `tests: auto` creates a component named `tests`, which is already declared ``.
- `rules.tests.may_depend_on: [server, api]` после вырезания слоёв **перестаёт покрывать** тесты,
  которые импортируют `server/services/...`: `tests -> server-services is not allowed` (проверено).
  Лечится глобом `['server*', api]`; `tests` вне `layers`, поэтому layers их не ограничивает.
- `allow_importers` на `server-routes` (если добавлять) должен включать `tests`, иначе тесты не
  смогут импортировать обработчики: `server-routes is open only to server`.
- Тесты, лежащие внутри `server/services/*.test.ts`, принадлежат `tests`, а не слою — это ожидаемо и
  удобно.

## 8. Нужен ли baseline

Нет, и трогать его нельзя.

- `easement.baseline.yml` в репозитории есть, но пуст: `violations: []`.
- Baseline легализует **уже существующие** нарушения и только сокращается. Новые нарушения он не
  пишет: проверено на промежуточном конфиге —
  `easement: 4 new violation(s) not written: the baseline only shrinks. Fix them, or legalize them
  with 'easement baseline --accept-new' if a human agrees`; файл после запуска не изменился.
- `unmatched` (пустой каталог без `optional: true`) baseline не принимает вообще
  ([configuration.md:56]).
- Вывод: конфиг слоёв и перенос файлов должны ехать одним изменением (или временно с
  `optional: true` на ещё не созданных каталогах). `easement baseline --accept-new` не нужен.

Что показывает `check` на **текущем** плоском `server/`, если просто добавить слои (проверено):

```
server/app.ts:10: component dependency cycle: server -> server-routes -> server [cycle]
server/routes/bookings.ts:3: server-routes -> server is not allowed (written as server/errors.ts) [dependency]
  because: routes translate HTTP and never touch storage
... ещё 10 таких же на storage.ts / slots.ts / validation.ts
```

Два вывода: (а) сначала переносим файлы, потом включаем правила; (б) `server` обязан быть
wiring-only: если `storage.ts`/`slots.ts`/`errors.ts` останутся в `server`, а `app.ts` импортирует
`routes`, получится цикл `server → routes → server`. Общий код — в `server-shared` + `common`.

## 9. Что печатают команды на такой конфигурации

`easement explain server/models/x.ts` (файла нет — путь решает, это нормально):

```
server/models/x.ts
  component: server-models (matches `server/models`)
  priority: 1
  may depend on: api (may_depend_on)
  not allowed: client, server, server-repositories, server-routes, server-services, tests
  because: models are plain data
```

`explain --format json` добавляет `ownership` (`component`, `pattern`, `priority`, `provenance` с
полем политики), `grants`, `prohibitions`, `not_allowed` (`rejected_by`, `rules`, `because`,
`provenance`), `rule`. В `not_allowed` для сиблингов из `layers` есть поле
`layers: "they are siblings in one layer"`.

`easement propose server/services/x.ts server/routes/y.ts`:

```
server/services/x.ts -> server/routes/y.ts: rejected [dependency]
  server-services -> server-routes is not allowed (written as server/routes/y.ts)
  because: services hold the use cases
```

`easement graph` (на промежуточном конфиге, когда текущий код ещё нарушает правила) рисует Mermaid,
узлы — компоненты, рёбра — реальные зависимости с числом импортов и пометкой нарушения:

```
graph LR
  c2["server"]
  c3["server-models"]
  c5["server-routes"]
  c2 -->|4| c5
  c5 -.->|10 ✗| c2
  linkStyle 1 stroke:#d00,stroke-width:2px,color:#d00
```

`easement suggest` перечисляет: разрешения, которые никто не использует (`server -> server-services`
и т.п. — на пустых каталогах это ожидаемо), зависимости, которые ничем не разрешены
(`server-routes: server (10 dependency(ies))`), и «не надёжные» пункты рядом с непроиндексированными
файлами (`client -> api (not indexed: 19 file(s) of api)`). Если включить `check --suggest`, не
использованные разрешения станут `unused-allowance` — на переходный период это шум; в нашем
`mise run easement` сейчас просто `easement check` (`mise.toml:154-155`).

`easement review --base main` (проверено на временной подмене `easement.yml`) печатает то, что нужно
для PR: `Components added: server-models, server-repositories, server-routes, server-services`,
`Permissions:` со списком новых разрешений и `because`, `Surfaces:`, `Constraints:`, затем
`Policy delta on the current code:` с `introduced (11)` (цикл + зависимости на `server/storage.ts` и
др.) и `Ownership:` с переехавшими файлами. Это же — готовый текст в описание PR.

## 10. Подводные камни и ограничения

1. **`layers` разрешает, а не только запрещает** ([config/mod.rs:923-945]). Ставить вложенные
   компоненты в `layers` под `client`/`server` = выдать им право импортировать друг друга вниз;
   проверено на `propose`. Лечится `must_not_depend_on` или отказом от `layers` для слоёв.
2. **Вложенности нет.** Нельзя «вложить» один компонент в другой и унаследовать его правила;
   `priority`/длина паттерна решают, кто владеет файлом, и правила применяются только к владельцу.
3. **`server` не должен владеть кодом, который импортируют нижние слои** — иначе цикл
   `server → routes → server` (воспроизведено на текущем дереве). Wiring-компонент только собирает.
4. **Каждый новый компонент нужен в правиле или в `common`.** Компонент без правила не может
   зависеть ни от чего: `server-shared` с `in: server/shared` и без правила показывает
   `may depend on: nothing`. Ключ `rules` для необъявленного компонента — ошибка загрузки:
   `unknown component 'b' in rules`.
5. **`unmatched` не лечится baseline** и не подавляется: пока каталогов `server/models`,
   `server/services`, `server/repositories` нет, нужен `optional: true` (потом снять) или создание
   каталогов в том же PR ([configuration.md:56]).
6. **`tests`** после вырезания слоёв требует `['server*', api]` — иначе тесты на внутренности
   падают; `allow_importers` на слое должен перечислять `tests`, если тесты импортируют его напрямую.
7. **`allow_importers` блокирует и тесты**, и любые инструменты: это «другая сторона»
   `may_depend_on`, а не просто комментарий.
8. **`public`/`surfaces` не задают направления.** Один компонент — свободные импорты внутри;
   поверхности открывают пути, но не запрещают `services → routes`.
9. **`isolated` — не про слои**: требует `*`/плейсхолдер и запрещает `**`; на `server/models`
   падает при загрузке.
10. **`priority`/длина — хрупкая пара.** Если переписать `server` в `in: 'server/**'` и
    `server-models` в `in: 'server/models/**'`, вложенный всё равно выигрывает (16 > 9), но при
    экзотических паттернах и равной длине решает алфавит. Явный `priority: 1` — дешёвая страховка.
11. **`in: server` матчит и файл `server.ts`** (паттерн компилируется в `P`, `P/**`, `P.*`), так что
    корневой `server.ts` попал бы в wiring-компонент. У нас такого файла нет, но помнить стоит.
12. **`check --suggest`** на переходном конфиге ругается на неиспользованные разрешения; включать его
    сразу после появления правил не стоит.
13. **Версии:** `easement policy`, `Rule.allow_implementers` и `warn: [unused-allowance]` есть в docs
    на `main`, но не в 0.6.6; не полагаться на них в CI, пока не обновится установленный бинарь.
14. **`review` требует, чтобы конфиг существовал на merge-base** — иначе
    `cannot read the policy at the merge-base: ... is not in <sha>`; для нового файла конфига `review`
    не отработает, для правки существующего `easement.yml` — работает.

## 11. Как это проверялось

Все факты выше — из `easement 0.6.6` (`mise x -- easement ...`) на этом репозитории, с временными
конфигами (`-c easement-layers.yml` и варианты), которые удалены; `easement.yml`, baseline и код
`main` не менялись.

```sh
easement schema | jq '.definitions.Component, .definitions.Rule'
easement explain server/models/x.ts -c easement-layers.yml
easement propose server/services/x.ts server/routes/y.ts -c easement-layers.yml --no-graph
easement check -c easement-layers.yml
easement graph -c easement-layers.yml
easement suggest -c easement-layers.yml
easement review --base main          # с временной подменой easement.yml, затем git checkout --
easement baseline -c easement-layers.yml   # проверка, что новые нарушения не пишутся
```

Экспериментально подтверждено: `priority`/длина паттерна, `except`, файловые `in`, `public` на
вложенном компоненте, `allow_importers`, `defines` (загружается; совпадений типов нет), отказ
`isolated`, глоб `'server*'` в `may_depend_on` (в т.ч. через `/` в именах), `tests: auto` с
`priority 1_000_000`, grant от `layers`, `closed: true`, `must_not_depend_on` с глобом, `common`,
`examples`, поведение baseline, вывод `explain`/`graph`/`suggest`/`review`.

## 12. Первоисточники

Upstream-коммит: [`582969d`](https://github.com/mokevnin/easement/tree/582969d9ea8b1ae926072b78e84509e233e2daaa)
(2026-11-15); релиз 0.6.6 (2026-11-15).

- [configuration.md:54] — владение при пересечении, `priority`, «longest pattern», `except`.
- [configuration.md:56] — `optional`, `unmatched`, «the baseline never accepts it».
- [configuration.md:57] — `rules` как allow-list, `common`.
- [configuration.md:103-122] — `public` и именованные `surfaces`, порядок решений.
- [configuration.md:134] — `isolated` и требования к `in`.
- [configuration.md:156-166] — `allow_importers`.
- [configuration.md:214-235] — `layers`, сиблинги, `closed`, приоритет `must_not_depend_on`.
- [configuration.md:399-410] — `tests: auto`, `rules.tests`.
- [configuration.md:480-487] — `defines`.
- [configuration.md:524-538] — `examples`.
- [components.rs:9-15], [components.rs:288-306], [components.rs:775-790] — модульный паттерн,
  `pattern_len`, выбор владельца; тесты `priority_beats_length_and_except_hands_files_on`
  ([components.rs:1203-1221]) и `the_last_of_equal_priority_and_pattern_length_owns_a_path`
  ([components.rs:858-877]).
- [config/mod.rs:35], [config/mod.rs:493-496] — `BTreeMap` компонентов, `priority`.
- [config/mod.rs:820-850] — компонент `tests: auto`: `priority: 1_000_000`, `optional: true`,
  конфликт с объявленным `tests`.
- [config/mod.rs:923-945] — порядок grant: `forbids` → `tests` → `may_depend_on` → `common` →
  `layers`; [config/mod.rs:949-968] — `layer_block`/`above` (сиблинги, `closed`).
- JSON Schema: `easement schema` (0.6.6), definitions `Component`, `Rule`, `Layer`.
- Собственный `easement.yml` upstream — пример плоской раскладки и вырезания файлов через `in`
  (компонент `root: { in: src/lib.rs }`).

[configuration.md:54]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L54
[configuration.md:56]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L56
[configuration.md:57]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L57
[configuration.md:103-122]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L103-L122
[configuration.md:134]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L134
[configuration.md:156-166]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L156-L166
[configuration.md:214-235]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L214-L235
[configuration.md:235]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L235
[configuration.md:399-410]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L399-L410
[configuration.md:480-487]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L480-L487
[configuration.md:524-538]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/docs/configuration.md#L524-L538
[components.rs:9-15]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L9-L15
[components.rs:288-306]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L288-L306
[components.rs:775]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L775
[components.rs:775-790]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L775-L790
[components.rs:858-877]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L858-L877
[components.rs:1203-1221]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/components.rs#L1203-L1221
[config/mod.rs:35]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/config/mod.rs#L35
[config/mod.rs:493-496]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/config/mod.rs#L493-L496
[config/mod.rs:820-850]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/config/mod.rs#L820-L850
[config/mod.rs:923-945]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/config/mod.rs#L923-L945
[config/mod.rs:949-968]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/src/config/mod.rs#L949-L968
[easement.schema.json]: https://github.com/mokevnin/easement/blob/582969d9ea8b1ae926072b78e84509e233e2daaa/easement.schema.json
