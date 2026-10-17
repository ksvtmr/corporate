# Развёртывание, окружения и CI/CD

Техническое описание того, как код попадает с компьютера разработчика на публичный сайт. Пошаговая инструкция для ежедневной работы с Claude Code — в [`WORKFLOW.md`](./WORKFLOW.md).

## 1. Что из себя представляет проект

| Вопрос | Ответ |
| :--- | :--- |
| Frontend | React 18 + TypeScript (strict), React Router 6, Tailwind CSS 3, сборщик Vite 5 |
| Backend | В этом репозитории **нет** серверного кода. Все запросы `/api/v1/*` обслуживает эмулятор бэкенда в браузере (`src/mocks/`, режим `VITE_USE_MOCK=true`). Реальный бэкенд подключается через `VITE_USE_MOCK=false` + `VITE_API_BASE_URL` (контракты — `API_CONTRACTS.md`) |
| База данных | Серверной БД нет. Демо-данные хранятся в `localStorage` браузера посетителя (`iclever_mock_db`). Схема версионирована (`SCHEMA_VERSION` в `src/mocks/db.ts`), миграция `migrate()` выполняется при загрузке, без потери данных; покрыта тестом `src/mocks/__tests__/identity.test.ts` |
| Пакетный менеджер | npm, lockfile `package-lock.json` (в CI — `npm ci`) |
| Хостинг (production) | **GitHub Pages**, ветка `gh-pages`, адрес `https://ksvtmr.github.io/corporate/` |
| Превью | GitHub Pages, папка `pr-<номер PR>/` в той же ветке `gh-pages` |
| Docker | Образ nginx `ghcr.io/ksvtmr/corporate` (для самостоятельного хостинга; на GitHub Pages не влияет) |
| Frontend и backend | Разворачиваются раздельно; сейчас разворачивается только frontend |

### Почему GitHub Pages, а не Vercel/Netlify/Railway

Проект — статическое SPA без сервера, репозиторий уже на GitHub, Pages уже включён и публиковал сайт. GitHub Pages и GitHub Actions бесплатны, не требуют сторонних аккаунтов и секретов: пайплайн использует только встроенный `GITHUB_TOKEN`. Переход на другой хостинг понадобится, когда появится реальный бэкенд (например, Railway/Render для API) — тогда frontend можно оставить на Pages и собрать его с `VITE_USE_MOCK=false` и адресом API.

## 2. Окружения

| | Development | Preview | Production |
| :--- | :--- | :--- | :--- |
| Где | ваш компьютер | `https://ksvtmr.github.io/corporate/pr-<N>/` | `https://ksvtmr.github.io/corporate/` |
| Когда обновляется | сразу при сохранении файла (HMR) | при каждом push в ветку открытого PR в `main`, после успешных проверок | после merge в `main`, после успешных проверок |
| Кто видит | только вы | все, у кого есть ссылка | все |
| API | Mock API (по умолчанию) или прокси на ваш бэкенд | Mock API | Mock API (переключается переменной репозитория `VITE_USE_MOCK`) |
| Данные | `localStorage` вашего браузера | `localStorage` с префиксом `pr-<N>:` — отдельно от production | `localStorage` посетителя (`iclever_mock_db`) |
| Отметка | — | жёлтый значок «Тестовая версия · <commit>» внизу слева | — |

Изоляция превью: все версии сайта живут на одном домене `ksvtmr.github.io`, поэтому без изоляции превью могло бы прочитать и «мигрировать» демо-данные, созданные посетителем на рабочем сайте. Сборки превью используют `VITE_STORAGE_NAMESPACE=pr-<N>` (`src/kit/storage.ts`): база, сессия и черновики хранятся под отдельными ключами. Это проверено в браузере (вход в превью не трогает данные и сессию production).

## 3. Переменные окружения

Полный список с комментариями — [`.env.example`](./.env.example). Всё, что начинается с `VITE_`, встраивается в публичный JavaScript — **никаких секретов** в этих переменных.

| Переменная | Development | Preview | Production | Назначение |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_USE_MOCK` | `.env.local`, по умолчанию `true` | `true` | переменная репозитория, по умолчанию `true` | Mock API или реальный бэкенд |
| `VITE_API_BASE_URL` | `.env.local`, `/api` | — | переменная репозитория, по умолчанию `/api` | адрес реального API |
| `VITE_BASE` | `/` | `/corporate/pr-<N>/` | `/corporate/` | путь, по которому открывается приложение (ставит пайплайн) |
| `VITE_DEPLOY_ENV` | — | `preview` | `production` | значок превью |
| `VITE_STORAGE_NAMESPACE` | пусто | `pr-<N>` | пусто | изоляция данных превью |
| `VITE_APP_VERSION` | `dev` | SHA коммита | SHA коммита | `<meta name="app-version">`, по нему smoke-тест ждёт новую версию |
| `DEV_API_PROXY_TARGET` | `.env.local` | — | — | только dev-сервер: куда проксировать `/api` при `VITE_USE_MOCK=false` |
| `PAGES_URL` | — | переменная репозитория (необязательно) | переменная репозитория (необязательно) | если подключён свой домен: например `https://learn.example.kz/` |

Переменные репозитория задаются в GitHub: **Settings → Secrets and variables → Actions → вкладка Variables**. Секреты (`Secrets`) сейчас не нужны. Когда появится реальный бэкенд, его ключи и пароли БД хранятся **только на сервере бэкенда** (Railway/Render/свой сервер), а не во frontend.

## 4. CI/CD-пайплайн

Файлы: `.github/workflows/`.

```
pull request в main / push в main
        │
        ▼
 checks: npm ci → lint → typecheck → i18n:check (ru/kk/en) → unit+integration тесты (в т.ч. миграции схемы) → build
        │ (только если всё зелёное)
        ▼
 e2e: 9 сценариев в Chromium (Playwright) на production-сборке
        │ (только если всё зелёное)
        ├── PR ─────► deploy-preview: сборка с base /corporate/pr-N/ → gh-pages/pr-N/ → smoke-тест URL → комментарий со ссылкой в PR
        └── main ───► deploy-production: сборка → корень gh-pages (папки pr-*/ сохраняются) → smoke-тест URL
                       └─► docker.yml: образ ghcr.io/ksvtmr/corporate:latest и :sha-<коммит> (только после успешного CI/CD)
```

| Workflow | Когда запускается | Что делает |
| :--- | :--- | :--- |
| `ci.yml` (**CI/CD**) | PR в `main`, push в `main`, вручную | проверки, E2E, деплой превью или production, smoke-тест |
| `preview-cleanup.yml` | PR закрыт или слит | удаляет `gh-pages/pr-<N>/` |
| `rollback.yml` | только вручную | возвращает предыдущий (или указанный) релиз production |
| `docker.yml` | после успешного CI/CD на `main`, теги `v*` | собирает и публикует Docker-образ |

Гарантии:

* **Сломанная сборка не попадает на сайт**: деплой-джобы имеют `needs: [checks, e2e]`; при любой ошибке они не запускаются.
* **Деплой проверяется по-настоящему**: `e2e/smoke.mjs` ждёт, пока по публичному адресу начнёт отдаваться именно новый коммит (`<meta name="app-version">`), проверяет загрузку ресурсов, прямую ссылку на защищённую страницу, вход демо-администратора, обновление страницы и значок окружения. Ошибка деплоя → красный крестик в Actions и в PR.
* **Публикации не мешают друг другу**: все записи в `gh-pages` идут через одну очередь (`concurrency: gh-pages-publish`).
* **Логи без секретов**: секреты не используются; `GITHUB_TOKEN` маскируется GitHub автоматически.
* **Зависимости кэшируются**: `actions/setup-node` с `cache: npm`.
* PR из форков превью не получают (у них нет прав на запись) — проверки для них выполняются.

### Как устроена ветка `gh-pages`

```
gh-pages/
├── index.html, assets/   ← production (последний релиз main)
├── 404.html              ← общий для всех: перенаправляет прямые ссылки в нужное приложение
├── .nojekyll
├── pr-12/                ← превью PR #12
└── pr-15/                ← превью PR #15
```

GitHub Pages отдаёт один `404.html` на весь сайт. Скрипт `scripts/pages-404.mjs` генерирует его так, что ссылка вида `/corporate/pr-12/corporate/employees` открывает приложение превью №12, а `/corporate/corporate/employees` — production; `src/main.tsx` восстанавливает исходный адрес. Публикацию выполняет `scripts/publish-pages.sh`; каждая публикация — отдельный коммит в `gh-pages` («Production @ <sha>», «Preview PR #N @ <sha>»), поэтому история релизов сохраняется.

## 5. Откат (rollback)

**Быстрый откат (1–2 минуты, без пересборки):** GitHub → **Actions → Rollback production → Run workflow**.
* Поле `version` пустое — вернуть релиз, который был перед текущим.
* Или вставить SHA коммита `main` (полный или первые 7 символов) — вернуть конкретный релиз.

Workflow берёт файлы этого релиза из истории `gh-pages` (ровно те, что уже проходили проверки), публикует их и прогоняет smoke-тест. Повторный запуск без `version` вернёт обратно.

**Постоянное исправление:** откатить сам код, чтобы следующий деплой не вернул ошибку:

```bash
git checkout main && git pull
git revert <sha-плохого-коммита>      # для merge-коммита: git revert -m 1 <sha>
git push origin HEAD:revert-bad-release   # затем открыть PR → превью → merge
```

Ограничение: первый релиз, доступный для отката, — первый деплой через новый пайплайн; более ранние версии из старого workflow в `gh-pages` не сохранились (он перезаписывал ветку).

## 6. Данные и миграции

* Сейчас серверной БД нет — деплой физически не может изменить или удалить чьи-либо данные: данные каждого посетителя лежат в его браузере.
* Миграции демо-схемы: увеличить `SCHEMA_VERSION`, добавить шаг в `migrate()` (`src/mocks/db.ts`) и тест в `src/mocks/__tests__/identity.test.ts`. CI запускает эти тесты перед любым деплоем. Миграции только добавляют/преобразуют поля, данные не сбрасываются.
* Превью не может изменить данные production (см. «Изоляция превью»).
* Когда появится реальная БД: миграции запускает **бэкенд** при своём деплое, отдельным шагом с резервной копией перед изменением схемы; превью должны использовать отдельную тестовую БД, а не production. Разрушительные миграции (удаление столбцов/таблиц) — только вручную, после бэкапа и явного согласования.

## 7. Что нужно сделать владельцу репозитория (один раз)

1. **Проверить Pages**: Settings → Pages → Source: *Deploy from a branch*, Branch: `gh-pages`, папка `/ (root)`. (Судя по успешным запускам «pages build and deployment», это уже включено.)
2. **Защитить `main`** (чтобы непроверенный код нельзя было слить): Settings → Branches → *Add branch ruleset* (или *Add rule*) для `main`:
   * Require a pull request before merging;
   * Require status checks to pass → добавить `Lint, typecheck, i18n, unit tests, build` и `End-to-end (Chromium)`;
   * Block force pushes.
3. **Права Actions** обычно менять не нужно: workflow сами запрашивают `contents: write` (запись в `gh-pages`) и `pull-requests: write` (комментарий со ссылкой). Если в организации действует запрет — Settings → Actions → General → Workflow permissions → *Read and write permissions*.
4. *(Необязательно)* Settings → Environments → `production` → *Required reviewers* — тогда каждый деплой в production будет ждать нажатия «Approve».
5. *(Необязательно)* свой домен: Settings → Pages → Custom domain и переменная `PAGES_URL`.

## 8. Docker (альтернативный хостинг)

```bash
docker run -d -p 8080:8080 ghcr.io/ksvtmr/corporate:latest   # http://localhost:8080
docker compose up --build                                   # собрать локально
```

Образ собирается только из коммитов `main`, прошедших CI/CD (тег `latest` и `sha-<коммит>`); откат — запуск предыдущего тега `sha-…`. nginx-конфигурация (`nginx.conf`) сама обслуживает прямые ссылки и выставляет заголовки безопасности (CSP и др.). Учтите: GitHub Pages не позволяет задавать заголовки ответа, поэтому CSP из `nginx.conf` действует только в Docker-варианте.

## 9. Проверка локально так же, как на GitHub Pages

```bash
VITE_BASE=/corporate/ npm run build
mkdir -p .pages-local && cp -R dist/. .pages-local/ && node scripts/pages-404.mjs /corporate/ .pages-local/404.html
npm run pages:serve -- .pages-local 4300            # http://127.0.0.1:4300/corporate/
SMOKE_URL=http://127.0.0.1:4300/corporate/ npm run test:smoke
```
