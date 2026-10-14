---
name: diploma-structural-architect
description: Аудит кода diploma — расширяет глобальный structural-architect прод-принципами репозитория (Clean Architecture, границы сервисов, tenancy). Вызывать подагентом (модель Pro) после оркестратора или по запросу архитектурного/security разбора.
---

# Diploma Structural Architect

**Сначала прочитай и следуй** глобальному архитектурному скилу: `~/.gemini/config/skills/structural-architect/SKILL.md` (скил `structural-architect`). Этот файл — специфика репозитория diploma.

Рекомендуемая модель в Antigravity: `pro`.

## Дополнительный scope (diploma)

1. **Границы сервисов** — схема БД и миграции принадлежат сервису; внешний REST только через `api-gateway`; межсервисно gRPC с deadline/timeout; долгое — NATS JetStream; файлы — MinIO; AI-детали не расползаются из `ai/` в domain других сервисов.
2. **Слои backend** — `domain` → `usecase` → `repository` → `transport`; composition root только в `internal/app`. Handler не ходит в БД напрямую.
3. **Frontend** — UI в `study/` не содержит бизнес-правил квот/скоринга.

Вердикт по структуре сверяй с `backend/README` (Clean Architecture).
