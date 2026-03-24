---
glob: "**/lib/supabase/**,**/app/api/**"
---

# Supabase правила

- Серверный клиент — `createServerClient` из `/lib/supabase/server.ts`, никогда не импортировать браузерный на сервере
- Браузерный клиент — `createBrowserClient` из `/lib/supabase/client.ts`, только в Client Components
- Типы — всегда использовать сгенерированные из `/lib/supabase/types.ts` (команда: `supabase gen types typescript`)
- Ошибки Supabase — логировать `console.error(error)`, пользователю показывать русский текст
- Storage пути — формат `{bucket}/{session_id}/{timestamp}_{filename}` для уникальности
- Realtime — подписка только в Client Components, отписка в cleanup useEffect
- Не писать SQL вручную в коде — использовать Supabase query builder
- RLS — доверять политикам, не дублировать проверки прав в коде
