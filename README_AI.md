# 🤖 Інструкція для ШІ — Game Portal

**Попередній контекст не потрібен. Цього файлу достатньо.**

---

## Структура проєкту

```
src/
  games/
    registry.js        ← єдиний файл реєстрації ігор
    <slug>/
      index.jsx        ← вся гра (логіка + UI)
      content.json     ← великі масиви даних (опціонально)
  lib/
    supabase.js        ← supabase клієнт (тільки для мультиплеєру)
  components/          ← НЕ ЧІПАТИ
  index.css            ← глобальні стилі + CSS-змінні
  App.jsx              ← роутинг, НЕ ЧІПАТИ
```

Маршрути: `/` — список ігор, `/games/<slug>` — гра.

---

## Два типи ігор

| | Single-player | Multiplayer |
|---|---|---|
| Пристрої | один | кілька |
| Стан | `useState` | Supabase Realtime |
| Залежності | тільки React | + `@supabase/supabase-js` |
| Складність | просто | складніше |

**Якщо гравці передають телефон по колу → single-player.**
**Якщо у кожного гравця свій пристрій → multiplayer.**

---

## SINGLE-PLAYER ГРА

### Файли які треба створити / змінити

```
src/games/<slug>/index.jsx     ← створити
src/games/<slug>/content.json  ← створити (якщо масиви 10+ елементів)
src/games/registry.js          ← додати запис
```

### registry.js — як додати запис

```js
{
  slug: "my-game",             // збігається з назвою папки
  title: "Назва гри",          // українською
  description: "Одне речення.", 
  emoji: "🎮",                  // один емодзі
  minPlayers: 3,               // видали якщо не важливо
  maxPlayers: 10,              // видали якщо не важливо
  tags: ["компанія", "блеф"],  // 1–3 теги
  component: lazy(() => import("./my-game/index.jsx")),
}
```

`lazy` вже імпортовано на початку `registry.js`.

### Шаблон index.jsx

```jsx
// src/games/<slug>/index.jsx
import { useState } from "react";
// Якщо є content.json:
// import content from "./content.json";

export default function MyGame() {
  const [phase, setPhase] = useState("setup"); // "setup" | "play" | "result"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {phase === "setup"  && <Setup  onStart={()   => setPhase("play")}    />}
      {phase === "play"   && <Play   onEnd={()     => setPhase("result")}  />}
      {phase === "result" && <Result onRestart={() => setPhase("setup")}   />}
    </div>
  );
}
```

### content.json — коли і як

Використовуй якщо масив має **10+ елементів** (локації, слова, питання, картки).

```json
{
  "locations": ["Аеропорт", "Ресторан", "..."],
  "questions": [{ "text": "Питання?", "answer": "Відповідь" }]
}
```

```jsx
import content from "./content.json";
const { locations, questions } = content;
```

### Правила single-player

1. Тільки React — `useState`, `useEffect`, нічого більше
2. Inline стилі або CSS-змінні — без окремих `.css` файлів для гри
3. Кнопка "Назад" вже є у `GamePage` — не додавай свою
4. Мобільна оптимізація — кнопки мін. 48px висоти
5. Повний цикл: setup → play → result/restart

---

## CSS (доступно в будь-якій грі)

| Змінна | Значення | Використання |
|---|---|---|
| `--bg` | `#0f0f13` | основний фон |
| `--bg2` | `#1a1a24` | картки, панелі |
| `--bg3` | `#23233a` | бордери, чіпи |
| `--accent` | `#7c6af7` | фіолетовий акцент |
| `--accent2` | `#a78bfa` | світліший акцент |
| `--text` | `#f0eeff` | основний текст |
| `--text2` | `#9b9ab8` | другорядний текст |
| `--radius` | `16px` | великий радіус |
| `--radius-sm` | `10px` | малий радіус |

Готові класи: `.btn-primary` (фіолетова, 100% ширина), `.btn-secondary` (темна з бордером, 100% ширина).

---

## MULTIPLAYER ГРА (Supabase Realtime)

Використовуй коли **кожен гравець на своєму пристрої**.
Портал хоститься на Vercel + GitHub. Supabase — окремий безкоштовний сервіс.

**Як працює:**
```
Хост → створює кімнату → отримує код "MAFK"
Гравці → вводять "MAFK" → бачать той самий стан (~100ms затримка)
Будь-хто оновлює стан → Supabase → всі отримують оновлення миттєво
```

### Файли які треба створити / змінити

```
src/games/<slug>/index.jsx     ← створити (імпортує supabase)
src/games/<slug>/content.json  ← створити (опціонально)
src/games/registry.js          ← додати запис (як завжди)
```

`src/lib/supabase.js` вже існує — не чіпати.

### Шаблон index.jsx для multiplayer

```jsx
// src/games/<slug>/index.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

function generateCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

const inputStyle = {
  padding: 12, borderRadius: "var(--radius-sm)",
  background: "var(--bg2)", border: "1px solid var(--bg3)",
  color: "var(--text)", fontSize: 16, width: "100%", boxSizing: "border-box",
};

export default function MyMultiplayerGame() {
  const [phase, setPhase]           = useState("join"); // "join"|"lobby"|"play"|"result"
  const [roomCode, setRoomCode]     = useState("");
  const [codeInput, setCodeInput]   = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost]         = useState(false);
  const [gameState, setGameState]   = useState(null);  // весь стан гри тут
  const [error, setError]           = useState("");

  // Підписка на зміни кімнати
  useEffect(() => {
    if (!roomCode) return;

    supabase
      .from("rooms")
      .select("state")
      .eq("code", roomCode)
      .single()
      .then(({ data }) => data && setGameState(data.state));

    const channel = supabase
      .channel(`room:${roomCode}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => setGameState(payload.new.state)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomCode]);

  // Оновити стан — викликай замість прямого setState для синхронізації
  async function updateRoom(newState) {
    await supabase
      .from("rooms")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("code", roomCode);
    // НЕ треба setGameState — прийде через підписку
  }

  // Хост: створити кімнату
  async function createRoom() {
    if (!playerName.trim()) return;
    const code = generateCode();
    const initialState = {
      phase: "lobby",
      host: playerName,
      players: [{ name: playerName }],
      // ... додай поля специфічні для своєї гри
    };
    const { error } = await supabase.from("rooms").insert({ code, state: initialState });
    if (error) return setError("Помилка створення кімнати");
    setRoomCode(code);
    setIsHost(true);
    setPhase("lobby");
  }

  // Гравець: приєднатись до кімнати
  async function joinRoom() {
    if (!playerName.trim() || !codeInput.trim()) return;
    const code = codeInput.toUpperCase().trim();
    const { data } = await supabase.from("rooms").select("state").eq("code", code).single();
    if (!data) return setError("Кімнату не знайдено");

    const newState = {
      ...data.state,
      players: [...data.state.players, { name: playerName }],
    };
    await supabase.from("rooms").update({ state: newState }).eq("code", code);
    setRoomCode(code);
    setPhase("lobby");
  }

  // ── Екран підключення ────────────────────────────────────────────────
  if (phase === "join") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input
        placeholder="Твоє ім'я"
        value={playerName}
        onChange={e => setPlayerName(e.target.value)}
        style={inputStyle}
      />
      <button className="btn-primary" onClick={createRoom} disabled={!playerName}>
        Створити кімнату
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Код кімнати"
          value={codeInput}
          onChange={e => setCodeInput(e.target.value)}
          style={{ ...inputStyle, textTransform: "uppercase" }}
        />
        <button className="btn-secondary" onClick={joinRoom} style={{ width: "auto", padding: "0 16px" }}>
          Увійти
        </button>
      </div>
      {error && <p style={{ color: "#e74c3c", margin: 0 }}>{error}</p>}
    </div>
  );

  // ── Лобі ─────────────────────────────────────────────────────────────
  if (phase === "lobby") return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: 20, textAlign: "center" }}>
        <p style={{ color: "var(--text2)", margin: "0 0 4px", fontSize: 14 }}>Код кімнати — повідом іншим</p>
        <p style={{ color: "var(--accent2)", fontSize: 44, fontWeight: 700, margin: 0, letterSpacing: 8 }}>
          {roomCode}
        </p>
      </div>
      <p style={{ color: "var(--text2)", margin: 0 }}>
        Гравці ({gameState?.players?.length ?? 0}): {gameState?.players?.map(p => p.name).join(", ")}
      </p>
      {isHost && (
        <button className="btn-primary" onClick={() => updateRoom({ ...gameState, phase: "play" })}>
          Почати гру
        </button>
      )}
      {!isHost && <p style={{ color: "var(--text2)", textAlign: "center" }}>Очікуємо хоста...</p>}
    </div>
  );

  // ── Фази play та result — реалізуй під свою гру ──────────────────────
  // Важливо: хост керує переходами через updateRoom()
  // Гравці лише надсилають свої дії через updateRoom()
  // Стан приходить всім через підписку автоматично

  return null;
}
```

### Ключові принципи multiplayer

- **`gameState`** — єдине джерело правди. Завжди читай з нього, не дублюй у локальному state.
- **`updateRoom(newState)`** — єдиний спосіб змінити стан. НЕ викликай `setGameState` вручну після нього.
- **Хост керує фазами** — тільки хост викликає переходи `lobby → play → result`.
- **Гравці надсилають дії** — наприклад `updateRoom({ ...gameState, votes: { ...gameState.votes, [playerName]: target } })`.
- **Cleanup** — завжди `return () => supabase.removeChannel(channel)` в useEffect.

### Реєстрація multiplayer-гри (registry.js)

Абсолютно так само як single-player, додай тег `"мультиплеєр"`:

```js
{
  slug: "mafia",
  title: "Мафія",
  description: "Онлайн-гра на кілька пристроїв.",
  emoji: "🎭",
  minPlayers: 5,
  maxPlayers: 12,
  tags: ["мультиплеєр", "компанія"],
  component: lazy(() => import("./mafia/index.jsx")),
}
```

### Supabase — налаштування (один раз, вже зроблено власником)

Таблиця `rooms` вже створена. Якщо ні — виконати у SQL Editor:

```sql
-- Таблиця кімнат (одна на весь портал, для всіх ігор)
create table rooms (
  code        text primary key,
  game        text not null,
  state       jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Публічний доступ без авторизації
alter table rooms enable row level security;
create policy "public read"   on rooms for select using (true);
create policy "public write"  on rooms for insert with check (true);
create policy "public update" on rooms for update using (true);

-- Увімкнути Realtime
alter publication supabase_realtime add table rooms;
```

Змінні середовища (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) налаштовані у `.env` і Vercel Dashboard.
