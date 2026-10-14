---
name: diploma-orchestrator
description: Оркестрирует фичи в репозитории diploma — расширяет глобальный project-orchestrator проектным контекстом и локальными UI-скилами. Применять ко всем нетривиальным задачам. Не применять, если сообщение начинается с «фикс» или «fix».
---

# Diploma Orchestrator

**Сначала прочитай и следуй** глобальному оркестратору: `~/.gemini/config/skills/project-orchestrator/SKILL.md` (скил `project-orchestrator`). Этот файл — проектная специфика поверх глобального оркестратора.

## Дополнительные роли (только diploma)

| Роль | Скил | Модель Antigravity |
|------|------|--------------------|
| Системный дизайнер | `.agents/skills/diploma-system-designer/SKILL.md` | UI-токены по макету → `flash` / `inherit`; новая система/спорные решения → `pro` |
| Тестировщик фронта | `.agents/skills/diploma-frontend-tester/SKILL.md` | Линейный сценарий → `flash` / `inherit`; много веток/багов → `pro` |
| Структурный архитектор | `.agents/skills/diploma-structural-architect/SKILL.md` | `pro` |
| Документатор | `.agents/skills/diploma-documenter/SKILL.md` | `flash` / `inherit` |

После кода: если затронут UI-юзкейс — делегируй **тестировщика** (проверка в браузере или через автотесты обязательна).

## Контекст репозитория diploma

- `backend/services/*` — микросервисы; внешний REST — `api-gateway` :8080; Swagger: `make swagger` из корня или `backend/`
- `study/` — Vite/React, dev :5173
- `ai/` — AI отдельно; в backend только контракты
- `documentation/achievements/` — отчёты документатора

## Ограничения diploma

- Clean Architecture в backend-сервисах
- REST только через `api-gateway`
- Git commit только если пользователь явно попросил

## Иконки (frontend)

- Все UI-иконки в `study/` — только из **`lucide-react`**
- Подбор: [lucide.dev/icons](https://lucide.dev/icons)
- Импорт по имени, по одной иконке на import (tree-shaking)
- Декоративные иконки: `aria-hidden="true"`; смысл кнопки — через видимый текст или `aria-label`
- Размеры: **16–18px** в навбаре, **18–22px** в карточках
