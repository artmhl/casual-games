# 🤖 Інструкція для ШІ — GameHub (Game Portal)

**Попередній контекст не потрібен. Цього файлу достатньо для створення будь-якої гри на платформі.**

---

## Стек і команди перевірки

- **Стек:** React 19, React Router 7, Vite 8, `@supabase/supabase-js` v2, `oxlint`.
- **Мова інтерфейсу:** українська.
- **Перевірка перед завершенням:**
  ```bash
  npm run lint   # має бути 0 помилок (і бажано 0 попереджень)
  npm run build  # має зібратись без помилок
  ```

---

## Структура проєкту

```text
src/
  games/
    registry.js          ← єдиний файл реєстрації ігор (додавати сюди)
    <slug>/
      index.jsx          ← гра (або екран вибору режиму для universal)
      local.jsx          ← (тільки для universal) локальний режим
      multiplayer.jsx    ← (тільки для universal) онлайн-режим
      content.json       ← (опціонально) великі масиви даних (10+ елементів)
  lib/
    supabase.js          ← готовий Supabase-клієнт (НЕ ЧІПАТИ)
  components/            ← ядро порталу: HomePage, GamePage, LoadingScreen, NotFound (НЕ ЧІПАТИ)
  index.css              ← глобальні стилі та CSS-змінні (НЕ ЧІПАТИ)
  App.jsx                ← авто-роутинг з registry.js (НЕ ЧІПАТИ)
```

**Головне правило:** працюй виключно у `src/games/<slug>/` та `src/games/registry.js`. Не змінюй файли в `src/components/`, `src/lib/`, `src/App.jsx`, `src/index.css` і не імпортуй код з інших ігор.

**Маршрути:** `/` — головна сторінка ([HomePage.jsx](src/components/HomePage.jsx)), `/games/<slug>` — сторінка гри ([GamePage.jsx](src/components/GamePage.jsx)).

**Оболонка гри (`GamePage`):**
- Контейнер `.page` має `max-width: 600px; padding: 0 16px` — проєктуй UI під мобільний екран у цих межах.
- У верхній шапці `.game-header` вже є:
  - зліва — кнопка `← Назад` (веде на `/`, свою не додавай);
  - по центру — `emoji` + `title` гри;
  - справа — слот `<div id="game-header-action" />` для вбудовування кнопки виходу/розпуску через `createPortal` у мультиплеєрних іграх.

---

## Типи ігор та реєстрація (`src/games/registry.js`)

| Тип | Пристрої | Стан | Обов'язкові системні теги у `tags` | Секція та бейдж на головній |
|---|---|---|---|---|
| **Локальна (Single-player)** | один (передача по колу) | React state | `"pass-and-play"` | `📱 На одному пристрої` · бейдж `ЛОКАЛЬНА` |
| **Мультиплеєр (Online)** | у кожного свій | Supabase Realtime | `"мультиплеєр"` | `🌐 Онлайн Мультиплеєр` · бейдж `МУЛЬТИПЛЕЄР` |
| **Універсальна (Universal)** | обидва режими | ізольовано в кожному файлі | `"мультиплеєр"`, `"pass-and-play"` | `🌐 Онлайн Мультиплеєр` · бейдж `ЛОКАЛЬНА МУЛЬТИПЛЕЄР` |

> Системні теги `"мультиплеєр"` та `"pass-and-play"` керують секцією й бейджем у `HomePage.jsx` і автоматично приховуються зі списку тегів-чіпів. Окрім них додавай 1–3 описові теги (наприклад: `"компанія"`, `"блеф"`, `"ролі"`, `"детектив"`).

### Приклад запису у `src/games/registry.js`

`lazy` вже імпортовано на початку `registry.js`.

```js
{
  slug: "my-game",                         // збігається з назвою папки src/games/my-game
  title: "Назва гри",                      // українською
  description: "Короткий опис в 1–2 речення.",
  emoji: "🎮",                              // один емодзі
  minPlayers: 3,                           // опціонально
  maxPlayers: 10,                          // опціонально
  tags: ["pass-and-play", "компанія", "блеф"], // системний тег + 1–3 описові
  component: lazy(() => import("./my-game/index.jsx")),
}
```

---

## CSS-змінні та готові класи (доступно в будь-якій грі)

Окремих `.css`-файлів для ігор не створюй — використовуй inline-стилі, CSS-змінні та готові класи з `src/index.css`.

| Змінна | Значення | Використання |
|---|---|---|
| `--bg` | `#0f0f13` | основний фон |
| `--bg2` | `#1a1a24` | картки, панелі, інпути |
| `--bg3` | `#23233a` | бордери, чіпи, розділювачі |
| `--accent` | `#7c6af7` | фіолетовий акцент |
| `--accent2` | `#a78bfa` | світліший фіолетовий акцент |
| `--text` | `#f0eeff` | основний текст |
| `--text2` | `#9b9ab8` | другорядний текст |
| `--radius` | `16px` | великий радіус (картки, кнопки) |
| `--radius-sm` | `10px` | малий радіус (інпути, бейджі) |
| `--font` | `'Inter', system-ui, ...` | основний шрифт (на кнопках ставь `fontFamily: "inherit"`) |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | нижній безпечний відступ на iOS |

**Готові класи:**
- `.btn-primary` — фіолетова кнопка на всю ширину (`width: 100%`).
- `.btn-secondary` — темна кнопка з бордером на всю ширину (`width: 100%`).
- `.back-btn` — компактна кнопка в стилі `← Назад` у шапці (використовуй її для порталу кнопки виходу/розпуску в `#game-header-action`).

---

## 1. ЛОКАЛЬНА ГРА (Single-player / Pass-and-Play)

### Файли

```text
src/games/<slug>/index.jsx     ← створити
src/games/<slug>/content.json  ← створити, якщо масиви мають 10+ елементів
src/games/registry.js          ← додати запис із тегом "pass-and-play"
```

### Шаблон `index.jsx`

```jsx
// src/games/<slug>/index.jsx
import { useState } from "react";
// import content from "./content.json";

export default function MyGame() {
  const [phase, setPhase] = useState("setup"); // "setup" | "play" | "result"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {phase === "setup"  && <Setup  onStart={()   => setPhase("play")}   />}
      {phase === "play"   && <Play   onEnd={()     => setPhase("result")} />}
      {phase === "result" && <Result onRestart={() => setPhase("setup")}  />}
    </div>
  );
}
```

### `content.json` — коли і як

Винось у `content.json` будь-які масиви з **10+ елементів** (локації, слова, ролі, питання, картки), щоб не роздувати `index.jsx`:

```json
{
  "locations": ["Аеропорт", "Ресторан"],
  "questions": [{ "text": "Питання?", "answer": "Відповідь" }]
}
```

```jsx
import content from "./content.json";
const { locations, questions } = content;
```

### Правила для локальних ігор

1. Тільки вбудовані React API (`react`, `react-dom`) — жодних сторонніх пакетів.
2. Без окремих `.css` файлів — лише inline-стилі, CSS-змінні та класи платформи.
3. Кнопка `← Назад` вже є в `GamePage` — не дублюй її.
4. Мобільна зручність — висота інтерактивних кнопок мін. `48px`, `fontSize: 16` для `<input>` (щоб iOS Safari не зумив екран).
5. Повний ігровий цикл: `setup` → `play` → `result` → `restart` (з проміжним екраном передачі телефону, якщо ролі таємні).

---

## 2. МУЛЬТИПЛЕЄРНА ГРА (Supabase Realtime)

Використовуй, коли **кожен гравець грає на власному пристрої**.
Портал хоститься на Vercel, бекенд-синхронізація працює через спільну таблицю `rooms` у Supabase.

**Принцип роботи:**
```text
Хост    → створює кімнату (insert у rooms) → отримує 4-символьний код "MAFK"
Гравці  → вводять "MAFK" → підписуються на Realtime-зміни рядка (~100ms затримка)
Дія     → updateRoom(newState) → Supabase розсилає новий state усім гравцям
Вихід   → хост видаляє рядок (DELETE) → усім прилітає подія і повертає їх на екран входу
```

### Файли

```text
src/games/<slug>/index.jsx     ← створити (імпортує supabase з "../../lib/supabase")
src/games/<slug>/content.json  ← опціонально
src/games/registry.js          ← додати запис із тегом "мультиплеєр"
```

### Еталонний шаблон `index.jsx` для multiplayer

Цей шаблон вже враховує всі вимоги платформи: єдиний стиль кнопки виходу через портал, захист від змішування кімнат різних ігор (`game: GAME_SLUG`), коректне очищення кімнати в БД, автовидалення неактивного лобі, захист від зависання коли всі гравці вийшли, та сумісність із React `StrictMode` і `oxlint`.

```jsx
// src/games/<slug>/index.jsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";

const GAME_SLUG = "my-game"; // ОБОВ'ЯЗКОВО збігається зі slug у registry.js
const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;
const LOBBY_TTL_MS = 5 * 60 * 1000; // 5 хв автовидалення покинутого лобі

function generateCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

const inputStyle = {
  padding: 12,
  borderRadius: "var(--radius-sm)",
  background: "var(--bg2)",
  border: "1px solid var(--bg3)",
  color: "var(--text)",
  fontSize: 16,
  width: "100%",
  boxSizing: "border-box",
};

export default function MyMultiplayerGame() {
  const [roomCode, setRoomCode]     = useState("");
  const [codeInput, setCodeInput]   = useState("");
  const [playerName, setPlayerName] = useState("");
  const [gameState, setGameState]   = useState(null); // єдине джерело правди (включно з phase)
  const [error, setError]           = useState("");

  // Визначаємо хоста прямо з gameState — без розсинхронізації
  const isHost = Boolean(gameState && gameState.host === playerName);

  const resetLocalRoom = useCallback((message = "") => {
    setRoomCode("");
    setGameState(null);
    setError(message);
  }, []);

  // ── 1. Підписка на кімнату (UPDATE + DELETE) ─────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    supabase
      .from("rooms")
      .select("state")
      .eq("code", roomCode)
      .eq("game", GAME_SLUG)
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data?.state) {
          resetLocalRoom("Кімнату не знайдено або її вже закрито.");
          return;
        }
        setGameState(data.state);
      });

    const channel = supabase
      .channel(`${GAME_SLUG}:${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          if (
            payload.eventType === "DELETE" ||
            (payload.eventType === "UPDATE" && payload.new?.state?.phase === "deleted")
          ) {
            resetLocalRoom("Хост розпустив кімнату.");
          } else if (payload.eventType === "UPDATE" && payload.new?.state) {
            setGameState(payload.new.state);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, resetLocalRoom]);

  // ── 2. Очищення кімнати при закритті вкладки хостом (desktop) ────────
  useEffect(() => {
    if (!isHost || !roomCode) return;

    const handleBeforeUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rooms?code=eq.${roomCode}`;
      fetch(url, {
        method: "DELETE",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHost, roomCode]);

  // ── 3. Автовидалення неактивного лобі через 5 хв (хост) ──────────────
  useEffect(() => {
    if (!isHost || !roomCode || gameState?.phase !== "lobby") return;

    const timerId = setTimeout(() => {
      supabase.from("rooms").delete().eq("code", roomCode).then(() => {
        resetLocalRoom("Час очікування в лобі вийшов (5 хв). Кімнату видалено.");
      });
    }, LOBBY_TTL_MS);

    return () => clearTimeout(timerId);
  }, [isHost, roomCode, gameState?.phase, resetLocalRoom]);

  // ── 4. Автозавершення гри, якщо всі гравці вийшли і лишився 1 ────────
  useEffect(() => {
    if (!roomCode || !gameState || gameState.phase === "lobby") return;
    if (Array.isArray(gameState.players) && gameState.players.length <= 1) {
      if (isHost) {
        supabase
          .from("rooms")
          .update({ state: { phase: "deleted" } })
          .eq("code", roomCode)
          .then(() => supabase.from("rooms").delete().eq("code", roomCode));
      }
      resetLocalRoom("Всі гравці вийшли. Гру завершено.");
    }
  }, [roomCode, gameState, isHost, resetLocalRoom]);

  // ── Оновлення стану в БД ─────────────────────────────────────────────
  async function updateRoom(newState) {
    if (!roomCode) return;
    await supabase
      .from("rooms")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("code", roomCode);
    // НЕ викликай setGameState — актуальний стан прийде через Realtime
  }

  // ── Хост: створити кімнату ───────────────────────────────────────────
  async function createRoom() {
    const name = playerName.trim();
    if (!name) return;
    setError("");
    const code = generateCode();
    const initialState = {
      phase: "lobby",
      host: name,
      players: [{ name }],
      // ... додай поля своєї гри
    };
    const { error: insertError } = await supabase
      .from("rooms")
      .insert({ code, game: GAME_SLUG, state: initialState });
    if (insertError) return setError("Помилка створення кімнати. Спробуй ще раз.");
    setPlayerName(name);
    setRoomCode(code);
  }

  // ── Гравець: приєднатись до кімнати ──────────────────────────────────
  async function joinRoom() {
    const name = playerName.trim();
    const code = codeInput.trim().toUpperCase();
    if (!name || !code) return;
    setError("");

    const { data } = await supabase
      .from("rooms")
      .select("state")
      .eq("code", code)
      .eq("game", GAME_SLUG)
      .single();

    if (!data?.state) return setError("Кімнату не знайдено.");
    if (data.state.phase !== "lobby") return setError("Гра вже почалася.");
    if (data.state.players.some((p) => p.name === name)) {
      return setError(`Ім'я "${name}" вже зайняте.`);
    }
    if (data.state.players.length >= MAX_PLAYERS) {
      return setError(`Кімната заповнена (макс. ${MAX_PLAYERS}).`);
    }

    const newState = {
      ...data.state,
      players: [...data.state.players, { name }],
    };
    const { error: updateError } = await supabase
      .from("rooms")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("code", code);
    if (updateError) return setError("Не вдалося приєднатись до кімнати.");

    setPlayerName(name);
    setRoomCode(code);
  }

  // ── Вихід / розпуск кімнати ──────────────────────────────────────────
  async function leaveRoom() {
    if (!roomCode) return;
    if (isHost) {
      await supabase.from("rooms").update({ state: { phase: "deleted" } }).eq("code", roomCode);
      await supabase.from("rooms").delete().eq("code", roomCode);
    } else if (gameState?.players) {
      const remaining = gameState.players.filter((p) => p.name !== playerName);
      // Тут також очисти голоси / ролі / статуси гравця, що виходить
      await updateRoom({ ...gameState, players: remaining });
    }
    resetLocalRoom();
  }

  // ── Екран підключення ────────────────────────────────────────────────
  if (!roomCode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="Твоє ім'я"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={inputStyle}
        />
        <button className="btn-primary" onClick={createRoom} disabled={!playerName.trim()}>
          Створити кімнату
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Код кімнати"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            style={{ ...inputStyle, textTransform: "uppercase" }}
          />
          <button
            className="btn-secondary"
            onClick={joinRoom}
            disabled={!playerName.trim() || !codeInput.trim()}
            style={{ width: "auto", padding: "0 16px", whiteSpace: "nowrap" }}
          >
            Увійти
          </button>
        </div>
        {error && <p style={{ color: "#ef4444", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  // ── Екран завантаження стану кімнати ─────────────────────────────────
  if (!gameState) {
    return (
      <p style={{ color: "var(--text2)", textAlign: "center", padding: "40px 0" }}>
        Підключення до кімнати {roomCode}...
      </p>
    );
  }

  // ── Портал кнопки виходу у правій частині шапки GamePage ─────────────
  const headerActionSlot = document.getElementById("game-header-action");
  const leavePortal = headerActionSlot
    ? createPortal(
        <button
          className="back-btn"
          onClick={() => {
            const msg = isHost
              ? "Ви дійсно хочете розпустити кімнату?"
              : "Ви дійсно хочете вийти з кімнати?";
            if (window.confirm(msg)) leaveRoom();
          }}
          style={{ color: "#ef4444" }}
        >
          {isHost ? "🗑 Розпустити" : "🚪 Вийти"}
        </button>,
        headerActionSlot
      )
    : null;

  const phase = gameState.phase;

  return (
    <>
      {/* Рендериться один раз — кнопка автоматично присутня у всіх фазах */}
      {leavePortal}

      {phase === "lobby" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: 20, textAlign: "center" }}>
            <p style={{ color: "var(--text2)", margin: "0 0 4px", fontSize: 14 }}>
              Код кімнати — повідом іншим
            </p>
            <p style={{ color: "var(--accent2)", fontSize: 44, fontWeight: 700, margin: 0, letterSpacing: 8 }}>
              {roomCode}
            </p>
          </div>
          <p style={{ color: "var(--text2)", margin: 0 }}>
            Гравці ({gameState.players.length}/{MAX_PLAYERS}):{" "}
            {gameState.players.map((p) => p.name).join(", ")}
          </p>
          {isHost ? (
            <button
              className="btn-primary"
              disabled={gameState.players.length < MIN_PLAYERS}
              onClick={() => updateRoom({ ...gameState, phase: "play" })}
            >
              Почати гру {gameState.players.length < MIN_PLAYERS ? `(мін. ${MIN_PLAYERS})` : ""}
            </button>
          ) : (
            <p style={{ color: "var(--text2)", textAlign: "center" }}>Очікуємо хоста...</p>
          )}
        </div>
      )}

      {/* Фази "play", "result" тощо — реалізуй під свою гру */}
      {phase === "play" && <div>Ігровий процес</div>}
      {phase === "result" && <div>Результати</div>}
    </>
  );
}
```

### Ключові принципи multiplayer

- **Обов'язково передавай `game: GAME_SLUG`** у `.insert({ code, game: GAME_SLUG, state })` (колонка `game` у БД має обмеження `NOT NULL`) та фільтруй `.eq("game", GAME_SLUG)` у `joinRoom()`, щоб коди інших ігор не конфліктували.
- **`gameState` — єдине джерело правди.** Фаза гри (`gameState.phase`) і статус хоста (`gameState.host === playerName`) читаються з `gameState`, без дублювання у локальному state.
- **`updateRoom(newState)`** — єдиний спосіб оновлювати стан гри; не викликай `setGameState` вручну після нього.
- **Кнопка виходу в шапці (`#game-header-action`):** завжди рендериться через `createPortal` із класом `.back-btn` та `style={{ color: "#ef4444" }}` і текстом `"🗑 Розпустити"` (хост) / `"🚪 Вийти"` (гравець). Не прикріпляй кнопки виходу `position: fixed` поверх екрану.
- **Життєвий цикл кімнати (щоб не засмічувати БД):**
  1. У `leaveRoom()` хост спочатку оновлює `phase: "deleted"`, потім виконує фізичний `DELETE`.
  2. У `beforeunload` хост відправляє `DELETE` через `fetch(..., { keepalive: true })`.
  3. Підписка слухає `event: "*"` (і `UPDATE` з `phase === "deleted"`, і `DELETE`), скидаючи клієнта на екран входу з повідомленням через `setError` (без `alert()`).
  4. Лобі має 5-хвилинний таймаут автовидалення (тільки на стороні хоста).
  5. Якщо в активній грі виходять гравці і залишається ≤ 1 — гра коректно завершується, а кімната видаляється.
- **Мобільні браузери:** на iOS/Android згортання браузера зазвичай не викликає `beforeunload`. Для ігор із голосуванням/чергами корисно додавати хосту кнопку виключення (кік) завислого гравця.
- **Cleanup під `StrictMode`:** завжди повертай `() => { supabase.removeChannel(channel); }` у `useEffect`.

### Реєстрація multiplayer-гри (`src/games/registry.js`)

```js
{
  slug: "mafia",
  title: "Мафія",
  description: "Мультиплеєрна гра на дедукцію. Кожен грає на своєму пристрої.",
  emoji: "🎭",
  minPlayers: 5,
  maxPlayers: 12,
  tags: ["мультиплеєр", "компанія", "блеф"],
  component: lazy(() => import("./mafia/index.jsx")),
}
```

---

## 3. УНІВЕРСАЛЬНА ГРА (Local + Multiplayer)

Якщо гра підтримує обидва режими, розділяй їх на окремі файли зі спільним `content.json`:

```text
src/games/<slug>/index.jsx        ← екран вибору режиму
src/games/<slug>/local.jsx        ← single-player логіка
src/games/<slug>/multiplayer.jsx  ← multiplayer логіка
src/games/<slug>/content.json     ← спільні дані для обох режимів
src/games/registry.js             ← запис з ОБИДВОМА тегами: ["мультиплеєр", "pass-and-play", ...]
```

### Як перевести існуючу гру в універсальну

1. Перейменуй поточний `index.jsx` у `local.jsx` (або `multiplayer.jsx`), не переписуючи існуючу логіку з нуля.
2. Створи відсутній режим (`multiplayer.jsx` або `local.jsx`), перевикористовуючи `content.json`.
3. Створи новий `index.jsx` з екраном вибору режиму (приклад див. у `src/games/bunker/index.jsx`).
4. У `src/games/registry.js` переконайся, що в `tags` є обидва системні теги: `"мультиплеєр"` і `"pass-and-play"`.

### Шаблон `index.jsx` (екран вибору режиму)

```jsx
import { useState } from "react";
import LocalGame from "./local";
import MultiplayerGame from "./multiplayer";

export default function UniversalGame() {
  const [mode, setMode] = useState(null); // null | "local" | "multiplayer"

  if (mode === "local") return <LocalGame />;
  if (mode === "multiplayer") return <MultiplayerGame />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ textAlign: "center" }}>Оберіть режим гри</h2>
      <button className="btn-primary" onClick={() => setMode("local")}>
        📱 Грати локально (на одному пристрої)
      </button>
      <button className="btn-secondary" onClick={() => setMode("multiplayer")}>
        🌐 Грати онлайн (на різних пристроях)
      </button>
    </div>
  );
}
```

---

## Налаштування Supabase (довідково, вже виконано власником)

Одна таблиця `rooms` обслуговує всі мультиплеєрні ігри порталу:

```sql
create table rooms (
  code        text primary key,
  game        text not null,
  state       jsonb not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table rooms enable row level security;
create policy "public read"   on rooms for select using (true);
create policy "public write"  on rooms for insert with check (true);
create policy "public update" on rooms for update using (true);
create policy "public delete" on rooms for delete using (true);

alter publication supabase_realtime add table rooms;
```

Змінні середовища (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) налаштовані в `.env` (локально) та у Vercel Dashboard.

---

## Чекліст перед завершенням задачі

- [ ] Не змінено жодного файлу поза `src/games/` (крім явного запиту користувача).
- [ ] Гру зареєстровано у `src/games/registry.js` із правильними системними тегами (`"pass-and-play"` та/або `"мультиплеєр"`).
- [ ] Весь інтерфейс українською, адаптований під вузький мобільний екран (`max-width: 600px`, кнопки ≥ `48px`, інпути `fontSize: 16`).
- [ ] Для мультиплеєра: передається `game: GAME_SLUG`, кнопка виходу вбудована через портал у `#game-header-action` з класом `.back-btn`, реалізовано `DELETE` при виході/закритті вкладки хоста та обробку `DELETE`/`phase === "deleted"`.
- [ ] Виконано `npm run lint` (0 помилок) та `npm run build` (успішна збірка).
