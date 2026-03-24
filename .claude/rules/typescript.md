---
glob: "**/*.{ts,tsx}"
---

# TypeScript правила

- Нет `any` — использовать `unknown` с type guard или конкретные типы из `/lib/supabase/types.ts`
- Нет `as Type` без проверки — использовать type guard или Zod parse
- Props компонентов — всегда явный интерфейс, не inline
- Async функции — всегда обрабатывать ошибки через try/catch или `.catch()`
- Null checks — использовать optional chaining `?.` и nullish coalescing `??`
- Enum значения статусов — `const` объекты, не TypeScript enum
- Экспорт типов — `export type`, не `export interface` (совместимость с isolatedModules)
