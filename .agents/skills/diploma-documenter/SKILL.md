---
name: diploma-documenter
description: После таски diploma — расширяет глобальный project-documenter путями api-gateway Swagger и documentation/achievements. Вызывать подагентом (модель Flash или Inherit) после оркестратора, когда таска завершена.
---

# Diploma Documenter

**Сначала прочитай и следуй** глобальному скилу документатора: `~/.gemini/config/skills/project-documenter/SKILL.md` (скил `project-documenter`). Этот файл — специфика diploma.

Рекомендуемая модель в Antigravity: `flash` или `inherit`.

## Swagger (diploma)

Live-артефакты: `backend/services/api-gateway/docs/live/` (`live_docs.go`, `live_swagger.json`, `live_swagger.yaml`).

Точка входа генерации: `backend/services/api-gateway/cmd/gateway/main.go`.

Команды генерации (в PowerShell через `;`, не `&&`):

```powershell
make swagger; make swagger-check
```

Эквивалент из `backend/`: те же цели Makefile.

Не редактируй `docs/parity/` как «обновление live»: parity — отдельный контракт совместимости.

## Отчёты (diploma)

Каталог: `documentation/achievements/`.

В шаблоне отчёта поле **Области**: `backend | study | ai | infra`.

В секции **Проверки** дополнительно указывай:

- Браузерный юзкейс: PASS / FAIL / не вызывался (если проводилась проверка через `diploma-frontend-tester`)
