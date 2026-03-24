# SPECIFICATION.md — DnD Companion Platform
# Версия 1.0 | Homebrew 5e | Next.js 14 + Supabase

---

## МОДУЛЬ 1 — SESSION (Сессии)

### User Stories
- Мастер создаёт сессию и получает 6-символьный код (пример: `XK9-42B`)
- Игрок вводит код → подключается к сессии → выбирает/создаёт персонажа
- Мастер видит список подключённых игроков в реальном времени
- При дисконнекте игрока — его токен остаётся на карте, статус меняется на offline
- Мастер может кикнуть игрока из сессии
- Сессия сохраняется: при перезагрузке страницы — автоподключение по session_id в localStorage

### Таблицы БД

```sql
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,           -- '6-символьный: ABC-123'
  master_id    uuid REFERENCES auth.users(id),
  name         text NOT NULL,                  -- название кампании
  status       text DEFAULT 'waiting',         -- waiting | active | paused | ended
  settings     jsonb DEFAULT '{}',             -- { allowPlayerTokenMove: true, fogEnabled: true }
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE session_players (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid REFERENCES sessions(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id),
  character_id uuid REFERENCES characters(id),
  status       text DEFAULT 'online',          -- online | offline | kicked
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);
```

### RLS Политики
```sql
-- sessions: мастер видит свои, игроки — сессии где участвуют
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_owns" ON sessions FOR ALL USING (master_id = auth.uid());
CREATE POLICY "player_reads" ON sessions FOR SELECT
  USING (id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid()));

-- session_players: мастер управляет всеми, игрок видит себя
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_manages" ON session_players FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_reads_own" ON session_players FOR SELECT
  USING (user_id = auth.uid());
```

### API Эндпойнты

```
POST /api/sessions/create
Body:    { name: string }
Returns: { session_id: uuid, code: string }
Errors:  401 (не авторизован)

POST /api/sessions/join
Body:    { code: string, character_id?: uuid }
Returns: { session_id: uuid, session: Session, players: Player[] }
Errors:  404 (код не найден), 403 (сессия закрыта), 409 (уже в сессии)

POST /api/sessions/{id}/kick
Body:    { user_id: uuid }
Returns: { success: true }
Errors:  401, 403 (не мастер)

GET /api/sessions/{id}/players
Returns: { players: SessionPlayer[] }
Errors:  401, 403 (не участник)

PATCH /api/sessions/{id}/status
Body:    { status: 'active' | 'paused' | 'ended' }
Returns: { session: Session }
Errors:  401, 403 (не мастер)
```

### Realtime события (канал: `session:{id}`)
```
player:joined     { user_id, character_id, username }
player:left       { user_id }
player:kicked     { user_id }
session:status    { status }
```

### Edge Cases
- Код генерируется уникальным: если совпадение — регенерировать (до 5 попыток)
- Мастер не может кикнуть сам себя
- Если мастер закрывает вкладку — сессия переходит в `paused`, не в `ended`
- Максимум 8 игроков в сессии (MVP: 5)
- Анонимный пользователь (без аккаунта) может участвовать через guest_token в localStorage

---

## МОДУЛЬ 2 — CHARACTER (Лист персонажа)

### User Stories
- Игрок создаёт персонажа: имя, класс (свободный текст), раса, уровень
- Заполняет 6 характеристик (STR/DEX/CON/INT/WIS/CHA) — модификаторы считаются автоматически
- Указывает HP (текущее/максимальное), AC, скорость, инициативу
- Добавляет навыки с чекбоксом владения
- Ведёт инвентарь: список предметов с весом и описанием
- Добавляет заклинания из общего списка или вручную
- Мастер видит листы всех игроков в режиме чтения
- Импорт персонажа из JSON (формат D&D Beyond)

### Таблицы БД

```sql
CREATE TABLE characters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id),
  name            text NOT NULL,
  race            text NOT NULL,
  class           text NOT NULL,
  subclass        text,
  level           int DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
  experience      int DEFAULT 0,
  alignment       text,
  background      text,

  -- Основные характеристики
  stats           jsonb NOT NULL DEFAULT '{
    "str": 10, "dex": 10, "con": 10,
    "int": 10, "wis": 10, "cha": 10
  }',

  -- Боевые характеристики
  hp_max          int NOT NULL DEFAULT 10,
  hp_current      int NOT NULL DEFAULT 10,
  hp_temp         int DEFAULT 0,
  armor_class     int DEFAULT 10,
  initiative      int DEFAULT 0,           -- если null — считать от DEX mod
  speed           int DEFAULT 30,
  hit_dice        text DEFAULT '1d8',
  death_saves     jsonb DEFAULT '{ "successes": 0, "failures": 0 }',

  -- Владения
  proficiency_bonus int DEFAULT 2,
  saving_throws   jsonb DEFAULT '{}',      -- { "str": true, "dex": false, ... }
  skills          jsonb DEFAULT '{}',      -- { "acrobatics": true, ... }

  -- Прочее
  features        jsonb DEFAULT '[]',      -- [{ name, description }]
  traits          jsonb DEFAULT '{}',      -- { personality, ideals, bonds, flaws }
  notes           text,
  avatar_url      text,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE character_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    uuid REFERENCES characters(id) ON DELETE CASCADE,
  item_id         uuid REFERENCES loot_items(id),  -- null если кастомный
  name            text NOT NULL,                    -- если кастомный
  quantity        int DEFAULT 1,
  weight          numeric(5,2) DEFAULT 0,
  equipped        bool DEFAULT false,
  description     text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE character_spells (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    uuid REFERENCES characters(id) ON DELETE CASCADE,
  spell_id        uuid REFERENCES spells(id),      -- null если кастомный
  name            text NOT NULL,
  spell_level     int DEFAULT 0,                   -- 0 = cantrip
  prepared        bool DEFAULT true,
  slots_used      int DEFAULT 0,
  notes           text
);

CREATE TABLE spell_slots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    uuid REFERENCES characters(id) ON DELETE CASCADE,
  level           int NOT NULL CHECK (level BETWEEN 1 AND 9),
  total           int NOT NULL DEFAULT 0,
  used            int NOT NULL DEFAULT 0
);
```

### RLS Политики
```sql
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON characters FOR ALL USING (user_id = auth.uid());
CREATE POLICY "master_reads" ON characters FOR SELECT
  USING (id IN (
    SELECT character_id FROM session_players sp
    JOIN sessions s ON s.id = sp.session_id
    WHERE s.master_id = auth.uid()
  ));
CREATE POLICY "session_players_read" ON characters FOR SELECT
  USING (id IN (
    SELECT character_id FROM session_players sp
    WHERE sp.session_id IN (
      SELECT session_id FROM session_players WHERE user_id = auth.uid()
    )
  ));
```

### API Эндпойнты

```
POST /api/characters
Body:    { name, race, class, level, stats, hp_max, armor_class }
Returns: { character: Character }
Errors:  401, 422 (невалидные stats)

GET /api/characters/{id}
Returns: { character: Character, inventory: Item[], spells: Spell[], spell_slots: SlotData[] }
Errors:  401, 403, 404

PATCH /api/characters/{id}
Body:    Partial<Character>
Returns: { character: Character }
Errors:  401, 403, 404

PATCH /api/characters/{id}/hp
Body:    { delta: number }              -- +5 = лечение, -5 = урон
Returns: { hp_current: number, hp_temp: number }
Errors:  401, 403

PATCH /api/characters/{id}/death-saves
Body:    { type: 'success' | 'failure' }
Returns: { death_saves: DeathSaves }
Errors:  401, 403

POST /api/characters/{id}/inventory
Body:    { item_id?: uuid, name: string, quantity: number, weight: number }
Returns: { item: InventoryItem }
Errors:  401, 403

DELETE /api/characters/{id}/inventory/{item_id}
Returns: { success: true }

POST /api/characters/import
Body:    { json: DnDBeyondJSON }
Returns: { character: Character }
Errors:  401, 422 (неверный формат)
```

### UI — Лист персонажа (вкладки)

**Вкладка "Основное":**
- Аватар (загрузка или пикер из дефолтных)
- Имя, раса, класс, подкласс, уровень, мировоззрение
- 6 карточек характеристик: значение + модификатор (авто: `floor((val-10)/2)`)
- HP bar: текущее / максимальное + кнопки +/- с инпутом на сколько изменить
- Временные HP
- AC, инициатива, скорость, кость хитов

**Вкладка "Навыки":**
- Броски спасения (6 штук) с чекбоксом владения
- 18 навыков с чекбоксом, модификатором и итоговым бонусом

**Вкладка "Инвентарь":**
- Список предметов: название, кол-во, вес, чекбокс "экипировано"
- Кнопка "+ Добавить" (поиск по книге лута или ввод вручную)
- Суммарный вес внизу

**Вкладка "Заклинания":**
- Ячейки заклинаний по уровням (1-9) с трекером использованных
- Список заклинаний: кантрипы отдельно, остальные по уровням
- Быстрое добавление из книги заклинаний

**Вкладка "Черты и заметки":**
- Личность, идеалы, привязанности, слабости
- Особые черты класса/расы
- Свободное текстовое поле заметок

### Edge Cases
- HP не может уйти ниже 0 (клиент и сервер)
- При HP = 0 — появляется блок бросков смерти
- Модификатор инициативы = DEX mod если поле пустое
- Импорт D&D Beyond: если поле не найдено — заполнять дефолтом, не падать
- Изменение HP персонажа во время боя — транслируется в боевой трекер через realtime

---

## МОДУЛЬ 3 — BATTLEMAP (Игровая карта)

### User Stories
- Мастер загружает карту (видео MP4/WebM или GIF или PNG/JPG до 50MB)
- Мастер добавляет токены NPC из бестиария или загружает кастомное изображение
- Токены игроков появляются автоматически при подключении (аватар персонажа)
- Мастер двигает все токены кроме игроцких; игрок двигает только свой
- Туман войны: мастер рисует/стирает видимые зоны; игроки видят только открытое
- Мастер может менять карту → все видят новую карту мгновенно
- Отдельное окно карты (popup/fullscreen) для вывода на экран/проектор
- Сетка поверх карты (опционально): квадратная, hex или отсутствует
- Масштаб карты: мастер задаёт размер клетки в пикселях (дефолт: 50px = 5 футов)
- Измерение расстояния: инструмент линейки

### Таблицы БД

```sql
CREATE TABLE map_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  map_url         text,                        -- URL в Supabase Storage
  map_type        text DEFAULT 'image',        -- image | video | gif
  grid_type       text DEFAULT 'square',       -- square | hex | none
  grid_size       int DEFAULT 50,             -- px на клетку
  grid_color      text DEFAULT '#ffffff20',
  width           int DEFAULT 1920,           -- размер карты в px
  height          int DEFAULT 1080,
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE map_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE,
  owner_type      text NOT NULL,              -- 'player' | 'npc' | 'object'
  owner_id        uuid,                       -- character_id или bestiary_id
  label           text NOT NULL,
  image_url       text,
  x               numeric(10,2) DEFAULT 0,   -- координата на канвасе
  y               numeric(10,2) DEFAULT 0,
  width           int DEFAULT 50,
  height          int DEFAULT 50,
  hp_current      int,
  hp_max          int,
  show_hp         bool DEFAULT true,
  conditions      jsonb DEFAULT '[]',         -- ['poisoned', 'prone']
  visible_to_players bool DEFAULT true,
  layer           int DEFAULT 0,             -- z-index: 0=base, 1=tokens, 2=effects
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE fog_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  fog_enabled     bool DEFAULT true,
  revealed_zones  jsonb DEFAULT '[]'          -- [{ x, y, radius }] или SVG path
);
```

### RLS Политики
```sql
ALTER TABLE map_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_members_read" ON map_state FOR SELECT
  USING (session_id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid())
    OR session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "master_write" ON map_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));

ALTER TABLE map_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_members_read" ON map_tokens FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_manages_all" ON map_tokens FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_moves_own" ON map_tokens FOR UPDATE
  USING (owner_type = 'player' AND owner_id IN (
    SELECT character_id FROM session_players WHERE user_id = auth.uid()
  ));
```

### API Эндпойнты

```
POST /api/sessions/{id}/map/upload
Body:    FormData { file: File }
Returns: { map_url: string, map_type: string }
Errors:  401, 403, 413 (>50MB), 415 (неверный тип)

PATCH /api/sessions/{id}/map
Body:    { grid_type?, grid_size?, grid_color?, map_url? }
Returns: { map_state: MapState }
Errors:  401, 403

GET /api/sessions/{id}/tokens
Returns: { tokens: MapToken[] }
Errors:  401, 403

POST /api/sessions/{id}/tokens
Body:    { owner_type, owner_id?, label, image_url?, x, y, hp_max? }
Returns: { token: MapToken }
Errors:  401, 403 (только мастер может создавать)

PATCH /api/sessions/{id}/tokens/{token_id}
Body:    { x?, y?, hp_current?, conditions?, visible_to_players? }
Returns: { token: MapToken }
Errors:  401, 403 (игрок только свой токен)

DELETE /api/sessions/{id}/tokens/{token_id}
Returns: { success: true }
Errors:  401, 403 (только мастер)

PATCH /api/sessions/{id}/fog
Body:    { fog_enabled?: bool, revealed_zones?: Zone[] }
Returns: { fog_state: FogState }
Errors:  401, 403 (только мастер)
```

### Realtime события (канал: `map:{session_id}`)
```
map:changed       { map_url, map_type, grid_type, grid_size }
token:moved       { token_id, x, y }
token:updated     { token_id, ...changes }
token:created     { token: MapToken }
token:deleted     { token_id }
fog:updated       { revealed_zones, fog_enabled }
```

### UI — Карта

- **Канвас (Konva.js):** карта как фоновый слой, поверх — сетка, туман, токены
- **Видео-карта:** HTML5 `<video>` с `loop autoplay muted` как background-image на канвасе
- **Токен:** круглое изображение, при наведении — имя + HP bar, иконки состояний под токеном
- **Туман войны:** полупрозрачный тёмный слой поверх всего; мастер инструментом "кисть" стирает, инструментом "восстановить" закрашивает
- **Toolbar мастера:** загрузить карту | добавить NPC | настройки сетки | туман вкл/выкл | линейка | очистить карту
- **Отдельное окно:** кнопка "Открыть карту в новом окне" → `/session/{id}/map/display` в fullscreen без UI

### Edge Cases
- Видео-карта: `<video>` элемент рисуется на `canvas` через `requestAnimationFrame` — не встраивается напрямую в Konva
- При смене карты мастером: старые токены NPC удаляются, токены игроков сбрасываются в центр
- Токен без `image_url` — отображается цветной круг с первой буквой label
- Игрок не видит токены с `visible_to_players = false`
- Fog of war: игроки видят область только если она в `revealed_zones`; все токены в тумане скрыты даже если `visible_to_players = true`
- Лимит токенов на сессию: 50 (MVP)

---

## МОДУЛЬ 4 — COMBAT (Боевой трекер)

### User Stories
- Мастер начинает бой: все участники сессии видят трекер
- Каждый участник бросает инициативу (кнопка = d20 + INI mod) или мастер вводит вручную
- Трекер сортирует по инициативе, показывает очередь ходов
- Кнопка "Следующий ход" переходит к следующему в очереди
- Мастер или игрок меняет HP прямо в трекере (изменение синхронизируется с листом персонажа)
- Состояния (conditions): клик → выбор из списка → иконка появляется у токена и в трекере
- Мастер может добавлять NPC в бой без создания персонажа (имя + HP + инициатива)
- Кнопка "Завершить бой" — очищает трекер, сбрасывает состояния

### Таблицы БД

```sql
CREATE TABLE combat_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  is_active       bool DEFAULT false,
  round           int DEFAULT 1,
  current_turn    int DEFAULT 0,             -- индекс в turn_order
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE combat_participants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE,
  token_id        uuid REFERENCES map_tokens(id) ON DELETE CASCADE,
  name            text NOT NULL,
  initiative      int NOT NULL DEFAULT 0,
  hp_current      int NOT NULL DEFAULT 0,
  hp_max          int NOT NULL DEFAULT 0,
  ac              int DEFAULT 10,
  is_player       bool DEFAULT false,
  conditions      jsonb DEFAULT '[]',
  is_defeated     bool DEFAULT false,
  sort_order      int DEFAULT 0             -- финальный порядок с тай-брейкерами
);
```

### RLS Политики
```sql
ALTER TABLE combat_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_participants ENABLE ROW LEVEL SECURITY;
-- Читают все участники сессии, пишет мастер
CREATE POLICY "session_read" ON combat_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON combat_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "session_read" ON combat_participants FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON combat_participants FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_update_own_hp" ON combat_participants FOR UPDATE
  USING (is_player = true AND token_id IN (
    SELECT id FROM map_tokens WHERE owner_id IN (
      SELECT character_id FROM session_players WHERE user_id = auth.uid()
    )
  ));
```

### API Эндпойнты

```
POST /api/sessions/{id}/combat/start
Body:    { participants: [{ token_id, initiative, hp_max, hp_current, ac }] }
Returns: { combat_state: CombatState, participants: CombatParticipant[] }
Errors:  401, 403, 409 (бой уже идёт)

POST /api/sessions/{id}/combat/next-turn
Returns: { current_turn: number, round: number, current_participant: CombatParticipant }
Errors:  401, 403, 404 (бой не активен)

PATCH /api/sessions/{id}/combat/participants/{pid}
Body:    { hp_current?, conditions?, initiative?, is_defeated? }
Returns: { participant: CombatParticipant }
Errors:  401, 403

POST /api/sessions/{id}/combat/participants
Body:    { name, initiative, hp_max, hp_current, ac, is_player? }
Returns: { participant: CombatParticipant }
Errors:  401, 403

DELETE /api/sessions/{id}/combat/participants/{pid}
Returns: { success: true }
Errors:  401, 403

POST /api/sessions/{id}/combat/end
Returns: { success: true }
Errors:  401, 403
```

### Realtime события (канал: `combat:{session_id}`)
```
combat:started    { participants: [], round: 1 }
combat:turn       { current_turn, participant_id, round }
combat:hp_changed { participant_id, hp_current, delta }
combat:condition  { participant_id, conditions: [] }
combat:ended      {}
```

### UI — Боевой трекер

- Боковая панель (или модальное окно) с вертикальным списком участников
- Текущий ход — выделен цветом, анимация пульса
- Каждая карточка участника: аватар | имя | HP bar (current/max) | AC | иконки состояний
- HP: кнопки `-` `+` с быстрым вводом числа урона/лечения
- Состояния (conditions): dropdown с 15 стандартными: Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious
- Кнопка "Следующий ход" у мастера
- Счётчик раунда вверху
- Кнопка "Завершить бой" (с подтверждением)

### Edge Cases
- Тай-брейкер инициативы: сначала по DEX mod, потом по порядку добавления
- При 0 HP: участник помечается `is_defeated`, уходит вниз списка, токен становится полупрозрачным
- Изменение HP через трекер → обновляет `characters.hp_current` через realtime
- Если мастер добавляет NPC без токена — создаётся токен автоматически в центре карты
- Бой нельзя начать если участников < 2

---

## МОДУЛЬ 5 — MUSIC (Атмосферная музыка)

### User Stories
- Мастер видит список сцен: Бой, Таверна, Лес, Дождь, Подземелье, Город, Тайна, Ужас, Победа, Отдых (10 сцен MVP)
- Клик на сцену → все игроки слышат музыку этой сцены (синхронно)
- Каждая сцена содержит 2-3 трека с плавным зацикливанием и кроссфейдом
- Громкость: глобальная у каждого игрока (локальная настройка, не синхронизируется)
- Мастер может нажать "Пауза" и "Стоп" для всех
- Мастер видит что сейчас играет; игроки видят название сцены (без управления)

### Таблицы БД

```sql
CREATE TABLE music_scenes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,              -- 'Бой', 'Таверна', ...
  slug        text UNIQUE NOT NULL,       -- 'boy', 'taverna', ...
  description text,
  icon        text,                       -- эмодзи или имя иконки
  color       text DEFAULT '#6366f1',     -- акцентный цвет сцены
  tracks      jsonb NOT NULL DEFAULT '[]' -- [{ title, url, duration }]
);

-- Seed данные сцен:
-- { name: 'Бой',        slug: 'boy',         icon: '⚔️',  color: '#ef4444' }
-- { name: 'Таверна',    slug: 'taverna',      icon: '🍺',  color: '#f59e0b' }
-- { name: 'Лес',        slug: 'les',          icon: '🌲',  color: '#22c55e' }
-- { name: 'Дождь',      slug: 'dozhd',        icon: '🌧️',  color: '#3b82f6' }
-- { name: 'Подземелье', slug: 'podzemelye',   icon: '💀',  color: '#6b7280' }
-- { name: 'Город',      slug: 'gorod',        icon: '🏙️',  color: '#8b5cf6' }
-- { name: 'Тайна',      slug: 'tayna',        icon: '🔮',  color: '#a855f7' }
-- { name: 'Ужас',       slug: 'uzhas',        icon: '👁️',  color: '#1f2937' }
-- { name: 'Победа',     slug: 'pobeda',       icon: '🏆',  color: '#eab308' }
-- { name: 'Отдых',      slug: 'otdykh',       icon: '🌙',  color: '#0ea5e9' }

CREATE TABLE music_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  scene_id        uuid REFERENCES music_scenes(id),
  status          text DEFAULT 'stopped', -- playing | paused | stopped
  current_track   int DEFAULT 0,
  updated_at      timestamptz DEFAULT now()
);
```

### RLS Политики
```sql
ALTER TABLE music_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read" ON music_scenes FOR SELECT USING (true);

ALTER TABLE music_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_read" ON music_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON music_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
```

### API Эндпойнты

```
GET /api/music/scenes
Returns: { scenes: MusicScene[] }

PATCH /api/sessions/{id}/music
Body:    { scene_id?: uuid, status: 'playing' | 'paused' | 'stopped' }
Returns: { music_state: MusicState }
Errors:  401, 403 (только мастер)
```

### Realtime события (канал: `music:{session_id}`)
```
music:play        { scene_id, scene_name, track_index, track_url }
music:pause       {}
music:stop        {}
music:next_track  { track_index, track_url }
```

### UI — Музыкальный плеер

- Сетка сцен (2x5): иконка + название + цветная карточка
- Активная сцена — подсвечена, анимация пульса
- Под сценами: название текущего трека + прогресс-бар (только визуальный, не скруббер)
- Кнопки: ⏸ Пауза | ⏹ Стоп | ⏭ Следующий трек
- У игроков: только индикатор текущей сцены и регулятор громкости
- Кроссфейд между сценами: 3 секунды

### Edge Cases
- Аудиофайлы хранятся в Supabase Storage, CDN-раздача
- Если игрок заходит в сессию где музыка уже играет — начинает с текущего трека
- Пользователь может заблокировать autoplay в браузере: показываем кнопку "Включить звук"
- Громкость сохраняется в localStorage (не в БД)

---

## МОДУЛЬ 6 — BESTIARY (Бестиарий)

### User Stories
- Мастер и игроки видят список существ с фильтрацией по CR, типу, размеру
- Клик на существо → карточка с полными характеристиками
- Мастер добавляет существо на карту как токен одним кликом
- Мастер создаёт кастомное существо (homebrew)
- Поиск по имени

### Таблицы БД

```sql
CREATE TABLE bestiary (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  size            text NOT NULL,          -- Tiny | Small | Medium | Large | Huge | Gargantuan
  type            text NOT NULL,          -- beast | undead | humanoid | dragon | ...
  alignment       text,
  cr              numeric(4,2) NOT NULL,  -- 0.125, 0.25, 0.5, 1, 2, ...
  xp              int,
  image_url       text,

  -- Боевые характеристики
  ac              int NOT NULL,
  ac_type         text,                   -- 'natural armor', 'leather armor', ...
  hp              int NOT NULL,
  hp_formula      text,                   -- '4d8+4'
  speed           jsonb DEFAULT '{}',     -- { walk: 30, fly: 60, swim: 0 }

  -- Характеристики
  stats           jsonb NOT NULL,         -- { str, dex, con, int, wis, cha }
  saving_throws   jsonb DEFAULT '{}',
  skills          jsonb DEFAULT '{}',
  damage_resist   jsonb DEFAULT '[]',
  damage_immune   jsonb DEFAULT '[]',
  condition_immune jsonb DEFAULT '[]',
  senses          jsonb DEFAULT '{}',     -- { darkvision: 60, passive_perception: 13 }
  languages       jsonb DEFAULT '[]',

  -- Способности и действия
  traits          jsonb DEFAULT '[]',     -- [{ name, description }]
  actions         jsonb DEFAULT '[]',     -- [{ name, description, attack_bonus, damage }]
  bonus_actions   jsonb DEFAULT '[]',
  reactions       jsonb DEFAULT '[]',
  legendary       jsonb DEFAULT '[]',

  is_homebrew     bool DEFAULT false,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);
```

### RLS Политики
```sql
ALTER TABLE bestiary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_official" ON bestiary FOR SELECT USING (is_homebrew = false);
CREATE POLICY "creator_manages_homebrew" ON bestiary FOR ALL
  USING (is_homebrew = true AND created_by = auth.uid());
```

### API Эндпойнты

```
GET /api/bestiary
Query:   { search?, type?, size?, cr_min?, cr_max?, page?, limit? }
Returns: { creatures: BestiaryCreature[], total: number }

GET /api/bestiary/{id}
Returns: { creature: BestiaryCreature }
Errors:  404

POST /api/bestiary
Body:    { name, size, type, cr, ac, hp, stats, ... }
Returns: { creature: BestiaryCreature }
Errors:  401, 422

POST /api/sessions/{session_id}/tokens/from-bestiary
Body:    { creature_id: uuid, x: number, y: number }
Returns: { token: MapToken }
Errors:  401, 403
```

### UI — Бестиарий

- Левая панель: фильтры (тип, размер, CR диапазон), поиск
- Список существ: имя | CR | тип | размер
- Правая панель (или модал): полная карточка существа в стиле D&D stat block
- Кнопка "Добавить на карту" (только у мастера во время сессии)
- Кнопка "Создать homebrew существо" → форма

### Edge Cases
- CR хранится как numeric для корректной сортировки (0.125 < 0.25 < 0.5 < 1)
- Поиск — full-text search через PostgreSQL `to_tsvector`
- MVP: 150 существ из SRD 5.1 (Creative Commons)

---

## МОДУЛЬ 7 — LOOT (Книга предметов)

### User Stories
- Мастер и игроки просматривают предметы с фильтрами
- Мастер добавляет предмет в инвентарь игрока через лист персонажа
- Поиск по названию, фильтр по редкости и типу
- Создание кастомного предмета

### Таблицы БД

```sql
CREATE TABLE loot_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL,        -- weapon | armor | potion | ring | wondrous | tool | misc
  rarity      text NOT NULL,        -- common | uncommon | rare | very_rare | legendary | artifact
  requires_attunement bool DEFAULT false,
  weight      numeric(5,2) DEFAULT 0,
  cost_gp     int DEFAULT 0,
  description text NOT NULL,
  properties  jsonb DEFAULT '[]',   -- ['+1 к атаке', 'Requires attunement']
  image_url   text,
  is_homebrew bool DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);
```

### API Эндпойнты

```
GET /api/loot
Query:   { search?, type?, rarity?, page?, limit? }
Returns: { items: LootItem[], total: number }

GET /api/loot/{id}
Returns: { item: LootItem }

POST /api/loot
Body:    { name, type, rarity, description, properties?, weight?, cost_gp? }
Returns: { item: LootItem }
Errors:  401, 422

POST /api/characters/{id}/inventory
Body:    { item_id: uuid, quantity: number }
Returns: { inventory_item: InventoryItem }
Errors:  401, 403
```

### UI
- Галерея карточек с иконкой редкости (цвет: серый/зелёный/синий/фиолетовый/оранжевый/красный)
- Быстрый просмотр: название, тип, редкость, требование настройки, описание
- Кнопка "Добавить в инвентарь" → выбор персонажа из текущей сессии

---

## МОДУЛЬ 8 — SPELLS (Книга заклинаний)

### User Stories
- Поиск заклинаний по имени, классу, уровню, школе
- Просмотр полного описания заклинания
- Добавление заклинания в лист персонажа

### Таблицы БД

```sql
CREATE TABLE spells (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  level           int NOT NULL CHECK (level BETWEEN 0 AND 9),
  school          text NOT NULL, -- abjuration | conjuration | divination | enchantment | evocation | illusion | necromancy | transmutation
  casting_time    text NOT NULL, -- '1 action', '1 bonus action', '1 reaction', '1 minute'
  range           text NOT NULL, -- '60 feet', 'Self', 'Touch'
  components      jsonb NOT NULL, -- { v: true, s: true, m: 'a pinch of salt' }
  duration        text NOT NULL,  -- 'Instantaneous', 'Concentration, up to 1 minute'
  concentration   bool DEFAULT false,
  ritual          bool DEFAULT false,
  description     text NOT NULL,
  higher_levels   text,           -- описание upcast
  classes         jsonb NOT NULL, -- ['wizard', 'sorcerer']
  is_homebrew     bool DEFAULT false,
  created_by      uuid REFERENCES auth.users(id)
);
```

### API Эндпойнты

```
GET /api/spells
Query:   { search?, level?, school?, class?, page?, limit? }
Returns: { spells: Spell[], total: number }

GET /api/spells/{id}
Returns: { spell: Spell }

POST /api/spells
Body:    { name, level, school, casting_time, range, components, duration, description, classes }
Returns: { spell: Spell }
Errors:  401, 422

POST /api/characters/{id}/spells
Body:    { spell_id: uuid, prepared?: bool }
Returns: { character_spell: CharacterSpell }
Errors:  401, 403
```

### UI
- Список с фильтрами: уровень (0-9), школа, класс персонажа
- Карточка заклинания: название, уровень, школа, время накладывания, дальность, компоненты, концентрация, ритуал, описание
- Кнопка "Выучить" → добавляет в лист персонажа

### Edge Cases
- MVP: 200 заклинаний из SRD 5.1
- Кантрипы = уровень 0

---

## МОДУЛЬ 9 — AUTH (Авторизация)

```sql
-- Используем встроенный Supabase Auth
-- Дополнительная таблица профилей:

CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  username    text UNIQUE NOT NULL,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);
```

### Способы входа (MVP)
- Email + Password (Supabase Auth)
- Гостевой режим: анонимный auth Supabase → ограничен 1 сессией и 1 персонажем

### UI
- `/login` — форма входа / регистрации
- Middleware защищает все роуты кроме `/login` и `/join/{code}`
- Гость может перейти по ссылке `/join/{code}` без регистрации

---

## СТРУКТУРА ФАЙЛОВ ПРОЕКТА

```
/app
  /layout.tsx
  /page.tsx                    — лендинг / редирект на dashboard
  /login/page.tsx
  /dashboard/page.tsx          — список кампаний и персонажей
  /session/[code]/page.tsx     — основной экран сессии
  /session/[code]/map/page.tsx — fullscreen карта (отдельное окно)
  /character/[id]/page.tsx     — лист персонажа
  /bestiary/page.tsx
  /loot/page.tsx
  /spells/page.tsx

/components
  /session/
    SessionLobby.tsx
    PlayerList.tsx
  /battlemap/
    MapCanvas.tsx              — Konva Stage
    TokenLayer.tsx
    FogLayer.tsx
    MapToolbar.tsx
  /combat/
    CombatTracker.tsx
    ParticipantCard.tsx
    ConditionPicker.tsx
  /character/
    CharacterSheet.tsx
    StatsBlock.tsx
    InventoryList.tsx
    SpellSlots.tsx
  /music/
    MusicPlayer.tsx
    SceneGrid.tsx
  /bestiary/
    BestiaryList.tsx
    StatBlock.tsx
  /ui/                         — общие компоненты: Button, Card, Modal, HP Bar

/lib
  /supabase/
    client.ts
    server.ts
    types.ts                   — сгенерированные типы из схемы БД
  /realtime/
    channels.ts                — инициализация каналов
    events.ts                  — типы событий
  /stores/
    sessionStore.ts            — Zustand
    combatStore.ts
    mapStore.ts
    musicStore.ts
  /utils/
    dnd.ts                     — расчёт модификаторов, proficiency и т.д.
    audio.ts                   — Howler.js wrapper

/public
  /audio/                      — встроенная библиотека треков (CC0)
  /tokens/                     — дефолтные токены
  /icons/conditions/           — иконки состояний

/supabase
  /migrations/                 — SQL миграции
  /seed.sql                    — бестиарий, заклинания, предметы, музыкальные сцены
```

---

## ЯЗЫК ИНТЕРФЕЙСА

- **Весь UI — на русском языке**: кнопки, лейблы, подсказки, сообщения об ошибках
- Технические идентификаторы (slug, enum values в БД) — латиницей
- Названия характеристик персонажа: СИЛ / ЛОВ / ТЕЛ / ИНТ / МДР / ХАР (с английскими аббревиатурами STR/DEX/CON/INT/WIS/CHA в скобках)
- Состояния (conditions) — на русском: Ослеплён, Очарован, Оглушён, Истощение, Напуган, Схвачен, Недееспособен, Невидим, Парализован, Окаменевший, Отравлен, Лежачий, Сдержан, Оглушён, Без сознания
- Школы магии — на русском: Ограждение, Вызов, Прорицание, Очарование, Воплощение, Иллюзия, Некромантия, Преобразование
- Редкости предметов — на русском: Обычный, Необычный, Редкий, Очень редкий, Легендарный, Артефакт

---

## НЕФУНКЦИОНАЛЬНЫЕ ТРЕБОВАНИЯ

- Latency realtime событий: < 200ms при 5 игроках
- Размер CLAUDE.md: ≤ 120 строк
- Lighthouse Performance: ≥ 80 (мобиль не в MVP)
- Загрузка страницы сессии: < 3 секунды
- Видео-карта: лимит 50MB, форматы MP4/WebM/GIF
- Аудио: MP3/OGG, хранение в Supabase Storage, CDN
- Браузеры: Chrome 100+, Firefox 100+, Safari 15+ (MVP)
- Авторские права: только SRD 5.1 (Creative Commons) + CC0 аудио
