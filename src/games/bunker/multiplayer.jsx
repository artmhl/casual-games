import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";
import {
  saveRoomSession,
  loadRoomSession,
  clearRoomSession,
  cleanupStaleRooms,
} from "../../lib/roomSession";
import content from "./content.json";

const GAME_SLUG = "bunker";
const LOBBY_TTL_MS = 10 * 60 * 1000; // 10 хв на очікування в лобі
const HEARTBEAT_MS = 5 * 60 * 1000; // Оновлення updated_at кожні 5 хв

const CATASTROPHES = content.catastrophes;
const PROFESSIONS = content.professions;
const HEALTH = content.health;
const PHOBIAS = content.phobias;
const BACKPACK = content.backpack;

// ─── УТИЛІТИ ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRoles(players) {
  const professions = pickUnique(PROFESSIONS, players.length);
  const healths = pickUnique(HEALTH, players.length);
  const phobias = pickUnique(PHOBIAS, players.length);
  const backpacks = pickUnique(BACKPACK, players.length);

  return players.map((p, i) => ({
    name: p.name,
    profession: professions[i],
    health: healths[i],
    phobia: phobias[i],
    backpack: backpacks[i],
  }));
}

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

// ─── СИНХРОНІЗОВАНИЙ ТАЙМЕР ───────────────────────────────────────────────────

function Timer({ endsAt, totalSeconds, onEnd }) {
  const calcLeft = useCallback(() => {
    if (endsAt) {
      return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    }
    return totalSeconds;
  }, [endsAt, totalSeconds]);

  const [left, setLeft] = useState(calcLeft);
  const endedRef = useRef(false);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    endedRef.current = false;
    setLeft(calcLeft());

    const tick = () => {
      const remaining = endsAt
        ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
        : null;

      setLeft((prev) => {
        const next = remaining !== null ? remaining : Math.max(0, prev - 1);
        if (next <= 0 && !endedRef.current) {
          endedRef.current = true;
          onEndRef.current?.();
        }
        return next;
      });
    };

    const id = setInterval(tick, endsAt ? 500 : 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endsAt, calcLeft]);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");
  const pct = totalSeconds > 0 ? Math.min(100, (left / totalSeconds) * 100) : 0;
  const urgent = left <= 30;

  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div
        style={{
          fontSize: "3.5rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: urgent ? "#f87171" : "var(--accent2)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {mins}:{secs}
      </div>
      <div
        style={{
          marginTop: 12,
          height: 6,
          borderRadius: 999,
          background: "var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 999,
            background: urgent
              ? "linear-gradient(90deg,#f87171,#ef4444)"
              : "linear-gradient(90deg,var(--accent),var(--accent2))",
            transition: "width 0.5s linear, background 0.5s",
          }}
        />
      </div>
    </div>
  );
}

// ─── БАНЕР СТАТУСУ З'ЄДНАННЯ ─────────────────────────────────────────────────

function ConnectionBanner({ status, onRetry }) {
  if (status === "connected") return null;
  const isOffline = status === "offline";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        background: isOffline ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)",
        border: `1px solid ${isOffline ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)"}`,
        color: isOffline ? "#fca5a5" : "#fcd34d",
        fontSize: "0.85rem",
        fontWeight: 600,
      }}
    >
      <span>
        {isOffline
          ? "📡 Немає інтернету. Сесію збережено — чекаємо зв'язок..."
          : "🔄 Відновлення з'єднання з кімнатою..."}
      </span>
      <button
        onClick={onRetry}
        style={{
          background: "var(--bg2)",
          color: "var(--text)",
          border: "1px solid var(--bg3)",
          borderRadius: 8,
          padding: "4px 10px",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
        }}
      >
        Оновити
      </button>
    </div>
  );
}

// ─── ГОЛОВНА КОМПОНЕНТА ───────────────────────────────────────────────────────

export default function BunkerMultiplayer() {
  const [savedSession] = useState(() => loadRoomSession(GAME_SLUG));
  const [roomCode, setRoomCode] = useState(() => savedSession?.roomCode || "");
  const [codeInput, setCodeInput] = useState("");
  const [playerName, setPlayerName] = useState(() => savedSession?.playerName || "");
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [connStatus, setConnStatus] = useState(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "connected"
  );
  const [reconnectTick, setReconnectTick] = useState(0);

  const hiddenAtRef = useRef(null);
  const connStatusRef = useRef(connStatus);
  useEffect(() => {
    connStatusRef.current = connStatus;
  }, [connStatus]);

  // Хост завжди визначається з gameState — стабільно після будь-якого перезавантаження
  const isHost = Boolean(gameState && gameState.host === playerName);

  const resetToJoin = useCallback((message = "") => {
    clearRoomSession(GAME_SLUG);
    setRoomCode("");
    setGameState(null);
    setConnStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "connected");
    setError(message);
  }, []);

  // Синхронізація актуального стану кімнати з БД
  const syncRoom = useCallback(async () => {
    if (!roomCode) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConnStatus("offline");
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("rooms")
        .select("state")
        .eq("code", roomCode)
        .eq("game", GAME_SLUG)
        .single();

      if (fetchError) {
        // PGRST116 — рядка фізично немає в БД (кімнату видалено).
        // Інші помилки (мережа/таймаут) НЕ скидають сесію — просто чекаємо відновлення.
        if (fetchError.code === "PGRST116") {
          resetToJoin("Кімнату закрито або час очікування вийшов.");
        } else {
          setConnStatus("reconnecting");
        }
        return;
      }

      if (!data?.state || data.state.phase === "deleted") {
        resetToJoin("Ведучий покинув гру, кімнату закрито.");
        return;
      }

      const stillInRoom = data.state.players?.some((p) => p.name === playerName);
      if (!stillInRoom) {
        resetToJoin("Тебе немає у списку гравців цієї кімнати.");
        return;
      }

      setGameState(data.state);
      setConnStatus("connected");
    } catch {
      setConnStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
    }
  }, [roomCode, playerName, resetToJoin]);

  const forceReconnect = useCallback(() => {
    setConnStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
    syncRoom();
    setReconnectTick((t) => t + 1);
  }, [syncRoom]);

  // Зберігаємо сесію (localStorage + cookie fallback), поки гравець у кімнаті
  useEffect(() => {
    if (roomCode && playerName) {
      saveRoomSession(GAME_SLUG, { roomCode, playerName });
    }
  }, [roomCode, playerName]);

  // ── 1. Підписка на Realtime з автоперепідключенням ─────────────────────────
  useEffect(() => {
    if (!roomCode) return;

    let isActive = true;
    let retryTimer = null;

    syncRoom();

    const channel = supabase
      .channel(`bunker:${roomCode}:${reconnectTick}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          if (!isActive) return;

          if (
            payload.eventType === "DELETE" ||
            (payload.eventType === "UPDATE" && payload.new?.state?.phase === "deleted")
          ) {
            resetToJoin("Ведучий покинув гру, кімнату закрито.");
            return;
          }

          if (payload.eventType === "UPDATE" && payload.new?.state) {
            const nextState = payload.new.state;
            const stillInRoom = nextState.players?.some((p) => p.name === playerName);
            if (!stillInRoom) {
              resetToJoin("Тебе видалено з кімнати.");
              return;
            }
            setGameState(nextState);
            setConnStatus("connected");
          }
        }
      )
      .subscribe((status) => {
        if (!isActive) return;
        if (status === "SUBSCRIBED") {
          setConnStatus("connected");
          // Довантажуємо стан на випадок, якщо події прийшли під час перепідключення
          syncRoom();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setConnStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
          if (typeof navigator === "undefined" || navigator.onLine) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              if (isActive) setReconnectTick((t) => t + 1);
            }, 3000);
          }
        }
      });

    return () => {
      isActive = false;
      clearTimeout(retryTimer);
      supabase.removeChannel(channel);
    };
  }, [roomCode, playerName, reconnectTick, syncRoom, resetToJoin]);

  // ── 2. Стабільність на смартфонах (згортання, блокування екрану, зміна мережі) ──
  useEffect(() => {
    if (!roomCode) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      // Користувач повернувся на вкладку / розблокував смартфон
      const awayMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      syncRoom();
      // Якщо телефон був заблокований >15с або зв'язок просів — перевідкриваємо WebSocket
      if (awayMs > 15000 || connStatusRef.current !== "connected") {
        setReconnectTick((t) => t + 1);
      }
    };

    const handleOnline = () => {
      setConnStatus("reconnecting");
      syncRoom();
      setReconnectTick((t) => t + 1);
    };

    const handleOffline = () => {
      setConnStatus("offline");
    };

    const handlePageShow = (event) => {
      // Відновлення з bfcache на iOS Safari
      if (event.persisted) {
        syncRoom();
        setReconnectTick((t) => t + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [roomCode, syncRoom]);

  // ── 3. Резервне опитування, поки WebSocket перепідключається ───────────────
  useEffect(() => {
    if (!roomCode || connStatus === "connected") return;

    const pollId = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        syncRoom();
      }
    }, 5000);

    return () => clearInterval(pollId);
  }, [roomCode, connStatus, syncRoom]);

  // ── 4. Автовидалення неактивного лобі за серверним часом (хост) ────────────
  useEffect(() => {
    if (!isHost || !roomCode || gameState?.phase !== "lobby") return;

    const expiresAt = gameState.lobbyExpiresAt || Date.now() + LOBBY_TTL_MS;
    const remainingMs = Math.max(0, expiresAt - Date.now());

    const timerId = setTimeout(() => {
      supabase.from("rooms").delete().eq("code", roomCode).then(() => {
        resetToJoin("Час очікування в лобі вийшов (10 хв). Кімнату видалено.");
      });
    }, remainingMs);

    return () => clearTimeout(timerId);
  }, [isHost, roomCode, gameState?.phase, gameState?.lobbyExpiresAt, resetToJoin]);

  // ── 5. Heartbeat хоста (щоб довгі активні ігри не вважалися покинутими) ────
  useEffect(() => {
    if (!isHost || !roomCode) return;

    const id = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        supabase
          .from("rooms")
          .update({ updated_at: new Date().toISOString() })
          .eq("code", roomCode)
          .then(() => {});
      }
    }, HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [isHost, roomCode]);

  // ── 6. Автозавершення гри, якщо залишається ≤ 1 гравця (і не в лобі) ───────
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
      resetToJoin("Всі гравці вийшли. Гра завершена.");
    }
  }, [roomCode, gameState, isHost, resetToJoin]);

  async function updateRoom(newState) {
    if (!roomCode) return false;
    try {
      const { error: updateErr } = await supabase
        .from("rooms")
        .update({ state: newState, updated_at: new Date().toISOString() })
        .eq("code", roomCode);
      if (updateErr) {
        setConnStatus("reconnecting");
        return false;
      }
      return true;
    } catch {
      setConnStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting");
      return false;
    }
  }

  // ─── ЛОГІКА КІМНАТИ ────────────────────────────────────────────────────────

  async function createRoom() {
    const name = playerName.trim();
    if (!name) return;
    setError("");

    // Неблокуюче прибирання старих покинутих кімнат Бункера (> 2 год без активності)
    cleanupStaleRooms(supabase, GAME_SLUG);

    const code = generateCode();
    const initialState = {
      phase: "lobby",
      host: name,
      players: [{ name }],
      catastrophe: null,
      roles: [],
      votes: {},
      readyPlayers: [],
      discussionTime: 5,
      discussionEndsAt: null,
      lobbyExpiresAt: Date.now() + LOBBY_TTL_MS,
    };

    try {
      const { error: insertError } = await supabase
        .from("rooms")
        .insert({ code, game: GAME_SLUG, state: initialState });
      if (insertError) return setError("Помилка створення кімнати. Спробуй ще раз.");

      saveRoomSession(GAME_SLUG, { roomCode: code, playerName: name });
      setPlayerName(name);
      setRoomCode(code);
      setGameState(initialState);
      setConnStatus("connected");
    } catch {
      setError("Немає з'єднання з сервером.");
    }
  }

  async function joinRoom() {
    const name = playerName.trim();
    const code = codeInput.toUpperCase().trim();
    if (!name || !code) return;
    setError("");

    try {
      const { data, error: selectErr } = await supabase
        .from("rooms")
        .select("state")
        .eq("code", code)
        .eq("game", GAME_SLUG)
        .single();

      if (selectErr || !data?.state || data.state.phase === "deleted") {
        return setError("Кімнату не знайдено");
      }

      if (data.state.phase !== "lobby") {
        return setError("Гра вже почалася");
      }
      if (data.state.players.some((p) => p.name === name)) {
        return setError("Гравець з таким ім'ям вже є");
      }
      if (data.state.players.length >= 5) {
        return setError("У кімнаті вже 5 гравців (максимум)");
      }

      const newState = {
        ...data.state,
        players: [...data.state.players, { name }],
      };
      const { error: updateErr } = await supabase
        .from("rooms")
        .update({ state: newState, updated_at: new Date().toISOString() })
        .eq("code", code);

      if (updateErr) {
        return setError("Не вдалося приєднатись. Спробуй ще раз.");
      }

      saveRoomSession(GAME_SLUG, { roomCode: code, playerName: name });
      setPlayerName(name);
      setRoomCode(code);
      setGameState(newState);
      setConnStatus("connected");
    } catch {
      setError("Немає з'єднання з сервером.");
    }
  }

  async function leaveRoom() {
    if (!roomCode) return;
    const codeToLeave = roomCode;
    const stateSnapshot = gameState;
    const hostLeaving = isHost;

    // Одразу чистимо локальну сесію, щоб не перепідключитись випадково
    resetToJoin();

    try {
      if (hostLeaving) {
        await supabase.from("rooms").update({ state: { phase: "deleted" } }).eq("code", codeToLeave);
        await supabase.from("rooms").delete().eq("code", codeToLeave);
      } else if (stateSnapshot?.players) {
        const newPlayers = stateSnapshot.players.filter((p) => p.name !== playerName);
        const newReady = (stateSnapshot.readyPlayers || []).filter((p) => p !== playerName);
        const newRoles = (stateSnapshot.roles || []).filter((r) => r.name !== playerName);
        const newVotes = { ...(stateSnapshot.votes || {}) };
        delete newVotes[playerName];

        const newState = {
          ...stateSnapshot,
          players: newPlayers,
          readyPlayers: newReady,
          roles: newRoles,
          votes: newVotes,
        };
        await supabase
          .from("rooms")
          .update({ state: newState, updated_at: new Date().toISOString() })
          .eq("code", codeToLeave);
      }
    } catch {
      // Якщо мережа зникла під час виходу — локальну сесію вже очищено
    }
  }

  // ─── ДІЇ ХОСТА ─────────────────────────────────────────────────────────────

  function handleStart() {
    if (!gameState || gameState.players.length < 3) return;
    const cat = pickRandom(CATASTROPHES);
    const roleList = generateRoles(gameState.players);
    updateRoom({
      ...gameState,
      phase: "catastrophe",
      catastrophe: cat,
      roles: roleList,
      votes: {},
      readyPlayers: [],
      discussionEndsAt: null,
    });
  }

  function nextPhase(newPhase) {
    if (!gameState) return;
    const patch = { ...gameState, phase: newPhase };
    if (newPhase === "discussion") {
      patch.discussionEndsAt = Date.now() + (gameState.discussionTime || 5) * 60 * 1000;
    }
    updateRoom(patch);
  }

  function handleRestart() {
    if (!gameState) return;
    updateRoom({
      ...gameState,
      phase: "lobby",
      catastrophe: null,
      roles: [],
      votes: {},
      readyPlayers: [],
      discussionEndsAt: null,
      lobbyExpiresAt: Date.now() + LOBBY_TTL_MS,
    });
  }

  // ─── ДІЇ ГРАВЦЯ ────────────────────────────────────────────────────────────

  function toggleReady() {
    if (!gameState) return;
    const readyList = gameState.readyPlayers || [];
    const isReady = readyList.includes(playerName);
    const newReady = isReady
      ? readyList.filter((p) => p !== playerName)
      : [...readyList, playerName];
    updateRoom({ ...gameState, readyPlayers: newReady });
  }

  function handleVote(targetName) {
    if (!gameState) return;
    const newVotes = { ...(gameState.votes || {}), [playerName]: targetName };
    updateRoom({ ...gameState, votes: newVotes });
  }

  // ─── РЕНДЕР: ЕКРАН ВХОДУ ───────────────────────────────────────────────────

  if (!roomCode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏚️</div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: 0, color: "var(--accent2)" }}>
            БУНКЕР ОНЛАЙН
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.95rem" }}>
            3–5 гравців, гра на різних пристроях
          </p>
        </div>

        <div style={{ background: "var(--bg2)", padding: 20, borderRadius: "var(--radius)" }}>
          <input
            placeholder="Твоє ім'я"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={inputStyle}
          />
          <button
            className="btn-primary"
            onClick={createRoom}
            disabled={!playerName.trim()}
            style={{ marginTop: 12 }}
          >
            Створити кімнату
          </button>
        </div>

        <div style={{ background: "var(--bg2)", padding: 20, borderRadius: "var(--radius)" }}>
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
            style={{ marginTop: 12 }}
          >
            Приєднатись
          </button>
        </div>
        {error && <p style={{ color: "#ef4444", textAlign: "center", fontWeight: 600 }}>{error}</p>}
      </div>
    );
  }

  // ─── РЕНДЕР: ВІДНОВЛЕННЯ / ЗАВАНТАЖЕННЯ КІМНАТИ ───────────────────────────

  if (!gameState) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center", padding: "36px 0" }}>
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />
        <div style={{ fontSize: "2.5rem" }}>⏳</div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1.05rem" }}>
          Відновлення сесії...
        </p>
        <p style={{ margin: 0, color: "var(--text2)", fontSize: "0.9rem" }}>
          Кімната {roomCode} · {playerName}
        </p>
        <button
          className="btn-secondary"
          onClick={() => resetToJoin()}
          style={{ marginTop: 8 }}
        >
          Вийти на екран підключення
        </button>
      </div>
    );
  }

  const currentPhase = gameState.phase;

  // ─── ФАЗА: ЛОБІ ─────────────────────────────────────────────────────────────
  if (currentPhase === "lobby") {
    const canStart = gameState.players.length >= 3 && gameState.players.length <= 5;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: 20, textAlign: "center" }}>
          <p style={{ color: "var(--text2)", margin: "0 0 4px", fontSize: 14 }}>Код кімнати — повідом іншим</p>
          <p style={{ color: "var(--accent2)", fontSize: 44, fontWeight: 700, margin: 0, letterSpacing: 8 }}>
            {roomCode}
          </p>
        </div>

        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bg3)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>Гравці</span>
            <span style={{ color: "var(--text2)" }}>{gameState.players.length}/5</span>
          </div>
          {gameState.players.map((p, i) => (
            <div key={p.name} style={{ padding: "12px 16px", borderBottom: i < gameState.players.length - 1 ? "1px solid var(--bg3)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700 }}>
                {i + 1}
              </span>
              <span style={{ fontWeight: 600 }}>{p.name} {p.name === gameState.host && "(Хост)"}</span>
            </div>
          ))}
        </div>

        {isHost && (
          <div style={{ background: "var(--bg2)", padding: "16px", borderRadius: "var(--radius)", textAlign: "center" }}>
            <p style={{ color: "var(--text2)", marginBottom: 8, fontSize: "0.9rem" }}>
              Час на обговорення (хв)
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {[5, 7, 10].map((t) => {
                const isActive = (gameState.discussionTime || 5) === t;
                return (
                  <button
                    key={t}
                    onClick={() => updateRoom({ ...gameState, discussionTime: t })}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "var(--radius-sm)",
                      background: isActive ? "var(--accent)" : "var(--bg3)",
                      border: "none",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "0.2s",
                      fontFamily: "inherit",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {isHost ? (
            <button className="btn-primary" onClick={handleStart} disabled={!canStart}>
              {canStart ? "Почати гру" : "Очікування гравців (мін 3)..."}
            </button>
          ) : (
            <p style={{ color: "var(--text2)", textAlign: "center", margin: "8px 0" }}>Очікуємо хоста...</p>
          )}
        </div>
      </div>
    );
  }

  // ─── ФАЗА: КАТАСТРОФА ────────────────────────────────────────────────────────
  if (currentPhase === "catastrophe" && gameState.catastrophe) {
    const cat = gameState.catastrophe;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#ef4444,#f97316)", fontSize: "2rem", marginBottom: 16, boxShadow: "0 0 40px rgba(239,68,68,0.4)" }}>
            {cat.emoji}
          </div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "#f87171", textTransform: "uppercase", marginBottom: 8 }}>
            ⚠ Катастрофа
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            {cat.title}
          </h2>
        </div>
        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid rgba(239,68,68,0.3)", padding: 20 }}>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.65, color: "var(--text)" }}>
            {cat.desc}
          </p>
        </div>
        {isHost ? (
          <button className="btn-primary" onClick={() => nextPhase("roles")}>Розподілити ролі →</button>
        ) : (
          <p style={{ textAlign: "center", color: "var(--text2)" }}>Хост скоро розпочне роздачу ролей...</p>
        )}
      </div>
    );
  }

  // ─── ФАЗА: РОЛІ ──────────────────────────────────────────────────────────────
  if (currentPhase === "roles") {
    const myRole = gameState.roles?.find((r) => r.name === playerName);
    const readyList = gameState.readyPlayers || [];
    const isReady = readyList.includes(playerName);
    const allReady = readyList.length === gameState.players.length;

    const rows = myRole
      ? [
          { icon: "💼", label: "Професія", value: myRole.profession },
          { icon: "🩺", label: "Здоров'я", value: myRole.health },
          { icon: "😱", label: "Особливість", value: myRole.phobia },
          { icon: "🎒", label: "У рюкзаку", value: myRole.backpack },
        ]
      : [];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "linear-gradient(135deg,var(--accent),var(--accent2))", borderRadius: "50%", width: 56, height: 56, lineHeight: "56px", fontSize: "1.5rem", marginBottom: 10 }}>🎭</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Твоя роль</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--bg3)", padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent2)", textTransform: "uppercase", marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontWeight: 600, fontSize: "0.97rem", lineHeight: 1.4 }}>{r.value}</div>
              </div>
            </div>
          ))}
        </div>

        <button className={isReady ? "btn-secondary" : "btn-primary"} onClick={toggleReady}>
          {isReady ? "Очікуємо інших... (Відмінити)" : "Я готовий"}
        </button>

        <div style={{ textAlign: "center", color: "var(--text2)", fontSize: "0.9rem" }}>
          Готові: {readyList.length} / {gameState.players.length}
        </div>

        {isHost && (
          <button className="btn-primary" disabled={!allReady} onClick={() => nextPhase("discussion")}>
            Перейти до обговорення →
          </button>
        )}
      </div>
    );
  }

  // ─── ФАЗА: ОБГОВОРЕННЯ ───────────────────────────────────────────────────────
  if (currentPhase === "discussion") {
    const bunkerSpots = gameState.players.length - 1;
    const timeMins = gameState.discussionTime || 5;
    const myRole = gameState.roles?.find((r) => r.name === playerName);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>💬</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>Обговорення</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Обговоріть, хто найменш корисний
          </p>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid rgba(124,106,247,0.4)", padding: "16px 10px", textAlign: "center" }}>
            <div style={{ color: "var(--text2)", fontSize: "0.75rem", marginBottom: 4 }}>Місць у бункері</div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent2)", lineHeight: 1 }}>{bunkerSpots}</div>
            <div style={{ color: "var(--text2)", fontSize: "0.75rem", marginTop: 4 }}>з {gameState.players.length}</div>
          </div>

          <div style={{ flex: 2, background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--bg3)", padding: "16px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Timer endsAt={gameState.discussionEndsAt} totalSeconds={timeMins * 60} />
          </div>
        </div>

        {myRole && (
          <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--bg3)", padding: 16 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "var(--text2)", textAlign: "center" }}>Ваша роль для довідки</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "💼", label: "Проф.", value: myRole.profession },
                { icon: "🩺", label: "Здор.", value: myRole.health },
                { icon: "😱", label: "Фобія", value: myRole.phobia },
                { icon: "🎒", label: "Рюкз.", value: myRole.backpack },
              ].map((r) => (
                <div key={r.label} style={{ background: "var(--bg3)", borderRadius: "var(--radius-sm)", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent2)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: "1rem" }}>{r.icon}</span> {r.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.8rem", lineHeight: 1.2 }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isHost ? (
          <button className="btn-primary" onClick={() => nextPhase("voting")}>Перейти до голосування →</button>
        ) : (
          <p style={{ textAlign: "center", color: "var(--text2)", fontSize: "0.9rem" }}>Тільки хост може завершити обговорення</p>
        )}
      </div>
    );
  }

  // ─── ФАЗА: ГОЛОСУВАННЯ ───────────────────────────────────────────────────────
  if (currentPhase === "voting") {
    const votes = gameState.votes || {};
    const myVote = votes[playerName];
    const others = gameState.players.map((p) => p.name).filter((n) => n !== playerName);
    const votesCount = Object.keys(votes).length;
    const allVoted = votesCount === gameState.players.length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 6 }}>
            Обери кого вигнати
          </h2>
          <p style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
            Твій вибір таємний до завершення.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {others.map((p) => {
            const selected = myVote === p;
            return (
              <button
                key={p}
                onClick={() => handleVote(p)}
                style={{
                  background: selected ? "linear-gradient(135deg,#ef4444,#f97316)" : "var(--bg2)",
                  border: selected ? "none" : "1px solid var(--bg3)",
                  borderRadius: "var(--radius)",
                  padding: "16px 20px",
                  color: selected ? "#fff" : "var(--text)",
                  fontSize: "1.05rem",
                  fontWeight: selected ? 700 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: "1.4rem" }}>{selected ? "💀" : "👤"}</span>
                <span>{p}</span>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: "center", color: "var(--text2)", fontSize: "0.9rem" }}>
          Проголосувало: {votesCount} / {gameState.players.length}
        </div>

        {isHost && (
          <button className="btn-primary" disabled={!allVoted} onClick={() => nextPhase("results")}>
            Завершити голосування ✓
          </button>
        )}
      </div>
    );
  }

  // ─── ФАЗА: РЕЗУЛЬТАТИ ────────────────────────────────────────────────────────
  if (currentPhase === "results") {
    const playersNames = gameState.players.map((p) => p.name);
    const tally = {};
    playersNames.forEach((p) => (tally[p] = 0));
    Object.values(gameState.votes || {}).forEach((voted) => {
      if (tally[voted] !== undefined) tally[voted]++;
    });

    const maxVotes = Math.max(...Object.values(tally));
    const candidates = playersNames.filter((p) => tally[p] === maxVotes);
    const ejected = candidates[0];
    const ejectedRole = gameState.roles?.find((r) => r.name === ejected);
    const sorted = [...playersNames].sort((a, b) => tally[b] - tally[a]);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <LeaveButtonPortal isHost={isHost} leaveRoom={leaveRoom} />
        <ConnectionBanner status={connStatus} onRetry={forceReconnect} />

        <div style={{ textAlign: "center", background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.15))", borderRadius: "var(--radius)", border: "1px solid rgba(239,68,68,0.3)", padding: "28px 20px" }}>
          <div style={{ fontSize: "3rem", marginBottom: 10 }}>☠️</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", color: "#f87171", textTransform: "uppercase", marginBottom: 8 }}>
            Рішення прийнято
          </div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.2 }}>
            {ejected} вигнаний<br />з бункера!
          </h2>
          {candidates.length > 1 && (
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 8 }}>
              ⚖️ Нічия — вигнано {ejected}
            </p>
          )}
        </div>

        {ejectedRole && (
          <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--bg3)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bg3)", fontWeight: 700, fontSize: "0.9rem", color: "#f87171" }}>
              🃏 Картка вигнаного
            </div>
            {[
              { icon: "💼", label: "Професія", value: ejectedRole.profession },
              { icon: "🩺", label: "Здоров'я", value: ejectedRole.health },
              { icon: "😱", label: "Особливість", value: ejectedRole.phobia },
              { icon: "🎒", label: "У рюкзаку", value: ejectedRole.backpack },
            ].map((r, i, arr) => (
              <div key={r.label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--bg3)" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "var(--text2)", textTransform: "uppercase", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", border: "1px solid var(--bg3)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bg3)", fontWeight: 700, fontSize: "0.9rem" }}>
            🗳️ Результати голосування
          </div>
          {sorted.map((p, i) => {
            const v = tally[p];
            const pct = playersNames.length > 0 ? (v / playersNames.length) * 100 : 0;
            const isEjected = p === ejected;
            return (
              <div key={p} style={{ padding: "12px 16px", borderBottom: i < sorted.length - 1 ? "1px solid var(--bg3)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 700, flex: 1, color: isEjected ? "#f87171" : "var(--text)" }}>
                  {isEjected ? "☠️ " : ""}{p}
                </span>
                <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--bg3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: isEjected ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,var(--accent),var(--accent2))" }} />
                  </div>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: isEjected ? "#f87171" : "var(--text2)", minWidth: 24, textAlign: "right" }}>
                    {v}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {isHost && (
          <button className="btn-primary" onClick={handleRestart}>🔄 Грати ще раз</button>
        )}
      </div>
    );
  }

  return null;
}

function LeaveButtonPortal({ isHost, leaveRoom }) {
  const headerActionEl = document.getElementById("game-header-action");
  if (!headerActionEl) return null;
  return createPortal(
    <button
      className="back-btn"
      onClick={() => {
        if (window.confirm(isHost ? "Ви дійсно хочете розпустити кімнату?" : "Ви дійсно хочете вийти з кімнати?")) {
          leaveRoom();
        }
      }}
      style={{ color: "#ef4444" }}
    >
      {isHost ? "🗑 Розпустити" : "🚪 Вийти"}
    </button>,
    headerActionEl
  );
}
