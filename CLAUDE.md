# DnD Companion Platform

Веб-платформа для D&D сессий в реальном времени. Homebrew 5e, русский интерфейс.

## Стек
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase: PostgreSQL + Realtime + Auth + Storage
- Konva.js — игровая карта с токенами и туманом войны
- Howler.js — атмосферная музыка с кроссфейдом
- Zustand — локальный стейт

## Архитектура
```
/app              — роуты Next.js (App Router)
/components       — React компоненты по модулям
/lib/supabase     — клиент, серверный клиент, сгенерированные типы
/lib/realtime     — каналы и типы событий
/lib/stores       — Zustand сторы
/lib/utils        — dnd.ts (модификаторы), audio.ts (Howler wrapper)
/supabase/migrations — SQL миграции
```

## Модули
- **session** — создание/подключение по 6-символьному коду
- **character** — лист персонажа (упрощённый homebrew 5e)
- **battlemap** — Konva канвас: карта + токены + туман войны
- **combat** — боевой трекер: инициатива, HP, состояния
- **music** — 10 атмосферных сцен (Бой/Таверна/Лес/Дождь/Подземелье/Город/Тайна/Ужас/Победа/Отдых)
- **bestiary** — 150 существ SRD 5.1
- **loot** — книга предметов
- **spells** — 200 заклинаний SRD 5.1

## Realtime каналы
- `session:{id}` — подключения игроков
- `map:{session_id}` — токены, туман, смена карты
- `combat:{session_id}` — ход, HP, состояния
- `music:{session_id}` — смена сцены/трека

## Правила кода
- Весь UI текст — на русском языке
- Типы Supabase — только из `/lib/supabase/types.ts` (не писать вручную)
- RLS политики — обязательны для каждой таблицы (см. SPECIFICATION.md)
- HP персонажа никогда не уходит ниже 0 — валидация на клиенте и сервере
- Видео-карта рисуется через requestAnimationFrame на Konva, не встраивается напрямую
- Server Components — для статичных страниц; Client Components — только где нужен интерактив
- Ошибки Supabase всегда логируются, пользователю показывается русский текст

## Соглашения
- Компоненты: PascalCase, файлы: PascalCase.tsx
- Утилиты и хуки: camelCase
- БД enum values: латиница snake_case (статусы, типы, slug)
- Пути в Storage: `{bucket}/{session_id}/{filename}`
- Переменные окружения: NEXT_PUBLIC_* только для клиентских

## Субагенты (вызывать через /agents)
- `database-architect` — схема БД, миграции, RLS
- `backend-engineer` — API routes, Server Actions, Supabase queries
- `frontend-developer` — компоненты, Tailwind, Konva, Howler
- `realtime-engineer` — каналы, события, синхронизация
- `qa-reviewer` — проверка кода (только чтение)

## MCP серверы
- **context7** — актуальная документация (использовать перед написанием кода)
- **supabase** — прямая работа с БД проекта
