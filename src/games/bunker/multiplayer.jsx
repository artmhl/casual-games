import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import content from "./content.json";

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

// ─── КОМПОНЕНТ ТАЙМЕРА ────────────────────────────────────────────────────────

function Timer({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current);
          onEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, []);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");
  const pct = (left / seconds) * 100;
  const urgent = left <= 30;

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "3.5rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: urgent ? "#f87171" : "var(--accent2)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          animation: urgent ? "timerPulse 0.8s ease-in-out infinite" : "none",
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
            transition: "width 1s linear, background 0.5s",
          }}
        />
      </div>
    </div>
  );
}

// ─── ГОЛОВНА КОМПОНЕНТА ───────────────────────────────────────────────────────

export default function BunkerMultiplayer() {
  const [phase, setPhase] = useState("join");
  const [roomCode, setRoomCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");

  // Підписка
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          if (payload.new?.state?.phase === "deleted") {
            setError("Ведучий покинув гру, кімнату закрито.");
            setPhase("join");
            setRoomCode("");
            setGameState(null);
            setIsHost(false);
          } else {
            setGameState(payload.new.state);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        () => {
          setError("Ведучий покинув гру, кімнату закрито.");
          setPhase("join");
          setRoomCode("");
          setGameState(null);
          setIsHost(false);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [roomCode]);

  // Автовидалення кімнати якщо не запущена за 5 хвилин
  useEffect(() => {
    if (isHost && phase === "lobby" && roomCode) {
      const timerId = setTimeout(() => {
        // Перевіряємо через 5 хвилин чи все ще в лобі
        if (gameState?.phase === "lobby") {
          supabase.from("rooms").delete().eq("code", roomCode).then(() => {
            setError("Час очікування вийшов (5 хв). Кімнату видалено.");
            setPhase("join");
            setRoomCode("");
            setIsHost(false);
            setGameState(null);
          });
        }
      }, 5 * 60 * 1000);
      return () => clearTimeout(timerId);
    }
  }, [isHost, phase, roomCode, gameState?.phase]);

  // Очищення кімнати при закритті вкладки (тільки для хоста)
  useEffect(() => {
    if (!isHost || !roomCode) return;
    const handleBeforeUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rooms?code=eq.${roomCode}`;
      fetch(url, {
        method: "DELETE",
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        keepalive: true
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHost, roomCode]);

  // Завершення гри, якщо залишається один ведучий (і не в лобі)
  useEffect(() => {
    if (gameState && gameState.phase !== "lobby") {
      if (gameState.players.length <= 1) {
        setError("Всі гравці вийшли. Гра завершена.");
        if (isHost) {
          supabase.from("rooms").update({ state: { phase: "deleted" } }).eq("code", roomCode).then(() => {
            supabase.from("rooms").delete().eq("code", roomCode);
          });
        }
        setPhase("join");
        setRoomCode("");
        setGameState(null);
        setIsHost(false);
      }
    }
  }, [gameState?.players?.length, gameState?.phase, isHost, roomCode]);

  async function updateRoom(newState) {
    if (!roomCode) return;
    await supabase
      .from("rooms")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("code", roomCode);
  }

  // ─── ЛОГІКА КІМНАТИ ────────────────────────────────────────────────────────

  async function createRoom() {
    if (!playerName.trim()) return;
    const code = generateCode();
    const initialState = {
      phase: "lobby",
      host: playerName,
      players: [{ name: playerName }],
      catastrophe: null,
      roles: [],
      votes: {},
      readyPlayers: [],
      discussionTime: 5,
    };
    const { error } = await supabase.from("rooms").insert({ code, game: "bunker", state: initialState });
    if (error) return setError("Помилка створення кімнати");
    setRoomCode(code);
    setIsHost(true);
    setPhase("lobby");
    setError("");
  }

  async function joinRoom() {
    if (!playerName.trim() || !codeInput.trim()) return;
    const code = codeInput.toUpperCase().trim();
    const { data } = await supabase.from("rooms").select("state").eq("code", code).single();
    if (!data) return setError("Кімнату не знайдено");

    if (data.state.players.find((p) => p.name === playerName)) {
        return setError("Гравець з таким ім'ям вже є");
    }
    if (data.state.players.length >= 5) {
        return setError("У кімнаті вже 5 гравців (максимум)");
    }
    if (data.state.phase !== "lobby") {
        return setError("Гра вже почалася");
    }

    const newState = {
      ...data.state,
      players: [...data.state.players, { name: playerName }],
    };
    await supabase.from("rooms").update({ state: newState }).eq("code", code);
    setRoomCode(code);
    setPhase("lobby");
    setError("");
  }

  async function leaveRoom() {
    if (!roomCode) return;
    
    if (isHost) {
      await supabase.from("rooms").update({ state: { phase: "deleted" } }).eq("code", roomCode);
      await supabase.from("rooms").delete().eq("code", roomCode);
    } else {
      if (gameState) {
        const newPlayers = gameState.players.filter(p => p.name !== playerName);
        const newReady = gameState.readyPlayers.filter(p => p !== playerName);
        const newRoles = gameState.roles.filter(r => r.name !== playerName);
        const newVotes = { ...gameState.votes };
        delete newVotes[playerName];
        
        const newState = { ...gameState, players: newPlayers, readyPlayers: newReady, roles: newRoles, votes: newVotes };
        await updateRoom(newState);
      }
    }
    setPhase("join");
    setRoomCode("");
    setGameState(null);
    setIsHost(false);
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
    });
  }

  function nextPhase(newPhase) {
    updateRoom({ ...gameState, phase: newPhase });
  }

  function handleRestart() {
    updateRoom({
      ...gameState,
      phase: "lobby",
      catastrophe: null,
      roles: [], // очищаємо ролі, гравці залишаються
      votes: {},
      readyPlayers: [],
    });
  }

  // ─── ДІЇ ГРАВЦЯ ────────────────────────────────────────────────────────────

  function toggleReady() {
    const isReady = gameState.readyPlayers.includes(playerName);
    let newReady;
    if (isReady) {
        newReady = gameState.readyPlayers.filter(p => p !== playerName);
    } else {
        newReady = [...gameState.readyPlayers, playerName];
    }
    updateRoom({ ...gameState, readyPlayers: newReady });
  }

  function handleVote(targetName) {
    const newVotes = { ...gameState.votes, [playerName]: targetName };
    updateRoom({ ...gameState, votes: newVotes });
  }

  // ─── РЕНДЕР ────────────────────────────────────────────────────────────────

  if (phase === "join") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏚️</div>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 900, margin: 0, color: "var(--accent2)" }}>
            БУНКЕР ОНЛАЙН
          </h1>
          <p style={{ color: "var(--text2)", fontSize: "0.95rem" }}>
            3-5 гравців, гра на різних пристроях
          </p>
        </div>

        <div style={{ background: "var(--bg2)", padding: 20, borderRadius: "var(--radius)" }}>
            <input
              placeholder="Твоє ім'я"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={inputStyle}
            />
            <button className="btn-primary" onClick={createRoom} disabled={!playerName} style={{ marginTop: 12 }}>
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
            <button className="btn-secondary" onClick={joinRoom} disabled={!playerName || !codeInput} style={{ marginTop: 12 }}>
              Приєднатись
            </button>
        </div>
        {error && <p style={{ color: "#ef4444", textAlign: "center", fontWeight: 600 }}>{error}</p>}
      </div>
    );
  }

  // Якщо ми підключені, але gameState ще не прийшов
  if (!gameState) return <div style={{ textAlign: "center", padding: 40 }}>Завантаження...</div>;

  const currentPhase = gameState.phase;

  // ─── ФАЗА: ЛОБІ ─────────────────────────────────────────────────────────────
  if (currentPhase === "lobby") {
    const canStart = gameState.players.length >= 3 && gameState.players.length <= 5;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              {[5, 7, 10].map(t => {
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
                      transition: "0.2s"
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <button 
            className="btn-secondary"
            onClick={leaveRoom} 
            style={{ color: "rgba(252,92,92,0.8)", borderColor: "rgba(252,92,92,0.25)", marginTop: 8 }}
          >
            {isHost ? "🗑 Розпустити кімнату" : "← Вийти з кімнати"}
          </button>

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
  if (currentPhase === "catastrophe") {
    const cat = gameState.catastrophe;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        {/* Фіксована кнопка виходу під час гри */}
        <button
          onClick={leaveRoom}
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            background: "rgba(252, 92, 92, 0.1)",
            border: "1px solid rgba(252, 92, 92, 0.25)",
            color: "rgba(252, 92, 92, 0.9)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            zIndex: 100,
            backdropFilter: "blur(4px)"
          }}
        >
          {isHost ? "🗑 Розпустити" : "← Вийти"}
        </button>

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
    const myRole = gameState.roles.find(r => r.name === playerName);
    const isReady = gameState.readyPlayers.includes(playerName);
    const allReady = gameState.readyPlayers.length === gameState.players.length;

    const rows = [
      { icon: "💼", label: "Професія", value: myRole.profession },
      { icon: "🩺", label: "Здоров'я", value: myRole.health },
      { icon: "😱", label: "Особливість", value: myRole.phobia },
      { icon: "🎒", label: "У рюкзаку", value: myRole.backpack },
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <button onClick={leaveRoom} style={{ position: "fixed", top: 16, right: 16, background: "rgba(252, 92, 92, 0.1)", border: "1px solid rgba(252, 92, 92, 0.25)", color: "rgba(252, 92, 92, 0.9)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", zIndex: 100, backdropFilter: "blur(4px)" }}>
          {isHost ? "🗑 Розпустити" : "← Вийти"}
        </button>

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
            Готові: {gameState.readyPlayers.length} / {gameState.players.length}
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
    const myRole = gameState.roles.find(r => r.name === playerName);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
        <button onClick={leaveRoom} style={{ position: "fixed", top: 16, right: 16, background: "rgba(252, 92, 92, 0.1)", border: "1px solid rgba(252, 92, 92, 0.25)", color: "rgba(252, 92, 92, 0.9)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", zIndex: 100, backdropFilter: "blur(4px)" }}>
          {isHost ? "🗑 Розпустити" : "← Вийти"}
        </button>

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
            <Timer seconds={timeMins * 60} />
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
    const myVote = gameState.votes[playerName];
    const others = gameState.players.map(p => p.name).filter(n => n !== playerName);
    const votesCount = Object.keys(gameState.votes).length;
    const allVoted = votesCount === gameState.players.length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
        <button onClick={leaveRoom} style={{ position: "fixed", top: 16, right: 16, background: "rgba(252, 92, 92, 0.1)", border: "1px solid rgba(252, 92, 92, 0.25)", color: "rgba(252, 92, 92, 0.9)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", zIndex: 100, backdropFilter: "blur(4px)" }}>
          {isHost ? "🗑 Розпустити" : "← Вийти"}
        </button>

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
                        }}
                    >
                        <span style={{ fontSize: "1.4rem" }}>{selected ? "💀" : "👤"}</span>
                        <span>{p}</span>
                    </button>
                )
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
    const playersNames = gameState.players.map(p => p.name);
    const tally = {};
    playersNames.forEach((p) => (tally[p] = 0));
    Object.values(gameState.votes).forEach((voted) => {
      if (tally[voted] !== undefined) tally[voted]++;
    });

    const maxVotes = Math.max(...Object.values(tally));
    const candidates = playersNames.filter((p) => tally[p] === maxVotes);
    
    // Щоб зберегти консистентність беремо першого
    const ejected = candidates[0];

    const ejectedRole = gameState.roles.find((r) => r.name === ejected);
    const survivors = playersNames.filter((p) => p !== ejected);
    const sorted = [...playersNames].sort((a, b) => tally[b] - tally[a]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "relative" }}>
          <button onClick={leaveRoom} style={{ position: "fixed", top: 16, right: 16, background: "rgba(252, 92, 92, 0.1)", border: "1px solid rgba(252, 92, 92, 0.25)", color: "rgba(252, 92, 92, 0.9)", borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", zIndex: 100, backdropFilter: "blur(4px)" }}>
            {isHost ? "🗑 Розпустити" : "← Вийти"}
          </button>

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
