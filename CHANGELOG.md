# Changelog

## [0.2.1](https://github.com/kitXIII/ai-for-developers-project-386/compare/v0.2.0...v0.2.1) (2026-11-16)


### Miscellaneous Chores

* release 0.2.1 ([8a54460](https://github.com/kitXIII/ai-for-developers-project-386/commit/8a54460067420b61d589404fcdc42790f05e1a4b))

## [0.2.0](https://github.com/kitXIII/ai-for-developers-project-386/compare/v0.1.0...v0.2.0) (2026-11-16)

### Features

- add 404 page for unknown routes ([6618e7f](https://github.com/kitXIII/ai-for-developers-project-386/commit/6618e7f55ad7e1c729835a4e036a77b0337270cb))
- add home page with booking and admin entry points ([5889a7c](https://github.com/kitXIII/ai-for-developers-project-386/commit/5889a7c0d59b926c9ad22d8776c3245cf724d565))
- add mobile burger navigation to the AppShell ([be5722](https://github.com/kitXIII/ai-for-developers-project-386/commit/dbe57227e24808d661ca75f15bae19fb5e04dadf))
- AGENTS.md ([6b919f4](https://github.com/kitXIII/ai-for-developers-project-386/commit/6b919f40118e201573e58a6e4cc443e8b4aa95f1))
- **api:** контракт бронирования звонков — типы, слоты, брони ([391db96](https://github.com/kitXIII/ai-for-developers-project-386/commit/391db96c50030f4cd0574eae6e091b94345d62b7))
- **api:** правила валидации и коды ошибок контракта ([5592076](https://github.com/kitXIII/ai-for-developers-project-386/commit/5592076fb965d3b587bb841b88289c071ead3f2f))
- **client:** вкладка «Бронирования» — таблица предстоящих броней ([d55ddc1](https://github.com/kitXIII/ai-for-developers-project-386/commit/d55ddc137fbd28c99839a0d3eaf2bbb7eb28b585))
- **client:** вкладка «Типы встреч» с созданием в Modal и детализацией ([7c0a649](https://github.com/kitXIII/ai-for-developers-project-386/commit/7c0a6495d3b60117463b59c8f2a1489bafd8910c))
- **client:** выбор типа встречи и каркас мастера бронирования ([bbdad82](https://github.com/kitXIII/ai-for-developers-project-386/commit/bbdad825b8be08d69dbc6f297de2cb859e11855f)), closes [#12](https://github.com/kitXIII/ai-for-developers-project-386/issues/12)
- **client:** шаг «Дата и время» — календарь окна записи и слоты дня ([8bcf92f](https://github.com/kitXIII/ai-for-developers-project-386/commit/8bcf92f600980ad9321632a1186a1e232a346ea2))
- **client:** шаг «Имя и подтверждение» и экран успеха мастера ([be77334](https://github.com/kitXIII/ai-for-developers-project-386/commit/be77334eeeca3c538921b0a564f2d2d273b2e7b5))
- move contextual navigation to the AppShell header ([0038978](https://github.com/kitXIII/ai-for-developers-project-386/commit/003897836f50f48f547da8b84fcde2589446c657))
- **server:** in-memory хранилище и админские ручки типов встреч ([04d93e8](https://github.com/kitXIII/ai-for-developers-project-386/commit/04d93e8c52db8196e7f9e84a2aaa2a50b042e82e))
- **server:** гостевые операции чтения типов встреч ([aac858a](https://github.com/kitXIII/ai-for-developers-project-386/commit/aac858a6be0a0431f73189f60b9947c9e26cee96))
- **server:** создание брони POST /api/v1/bookings ([b488199](https://github.com/kitXIII/ai-for-developers-project-386/commit/b4881995638ca35eb2fe8d41e3943ba71f89828f))
- **server:** список предстоящих броней GET /api/v1/admin/bookings ([62c9283](https://github.com/kitXIII/ai-for-developers-project-386/commit/62c928362040e3d8596d44c18a7596d8003919ba))
- **server:** чистая функция генерации слотов по ADR 0002 ([38a567e](https://github.com/kitXIII/ai-for-developers-project-386/commit/38a567e94e48c879dcb576ab05c0bfa9c8a85935))
- **server:** эндпоинт слотов GET /meeting-types/{id}/slots ([c50a1f5](https://github.com/kitXIII/ai-for-developers-project-386/commit/c50a1f5717d843908dff3ede03b5b51f01c90ec5))
- set teal as the primary theme color ([8bb619c](https://github.com/kitXIII/ai-for-developers-project-386/commit/8bb619ce51bcf61e89af8b8f36275d4185b8e1a4))
- upd AGENTS.md ([be5fce8](https://github.com/kitXIII/ai-for-developers-project-386/commit/be5fce8d48a02a6681f23064111feef50c29f5bd))
- в README.md добавлена секция о сервисе ([d0ae36d](https://github.com/kitXIII/ai-for-developers-project-386/commit/d0ae36dfb6e4dd6732c74cc2b9b7a3cb3a7cbad3))
- генерация клиентского SDK переведена на react-query ([d514c06](https://github.com/kitXIII/ai-for-developers-project-386/commit/d514c0677ee52d84e87bee830536e78c746b746e))
- добавлен TypeSpec и автогенерация типов и SDK ([ac1d17a](https://github.com/kitXIII/ai-for-developers-project-386/commit/ac1d17a7b625d56b0effb08b3840bb53dcb999d8))
- добавлен продакшн Docker-образ ([6d62c2a](https://github.com/kitXIII/ai-for-developers-project-386/commit/6d62c2a6bbc7fc7a7766067dac35e0a45245b8e8))
- подключена библиотека компонентов mantine ([a966971](https://github.com/kitXIII/ai-for-developers-project-386/commit/a966971a30565acdd71b6f22fcb6731a7b89e81d))
- создание каркаса, начальная настройка проекта ([e7480c8](https://github.com/kitXIII/ai-for-developers-project-386/commit/e7480c838ae9b33f242c82ce5e1dfdecb799a8ac))

### Bug Fixes

- исправления описания сервиса в README.md ([9e95eab](https://github.com/kitXIII/ai-for-developers-project-386/commit/9e95eabfc22f050db8ff40397455683cee97b93a))
- исправлено форматирование в проекте ([0631b26](https://github.com/kitXIII/ai-for-developers-project-386/commit/0631b26e9b420937625bb6db85f0665c9daa1d77))
