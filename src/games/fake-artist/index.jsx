// src/games/fake-artist/index.jsx
// Гра "Фальшивий художник" — повністю автономна.
// sessionStorage для збереження імен гравців (як в інших іграх порталу).

import { useState, useEffect, useRef, useCallback } from "react";

// ─── ЗБЕРЕЖЕННЯ ДАНИХ ────────────────────────────

const SS_KEY = "fake_artist_players_v1";

function loadNames() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNames(names) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(names));
  } catch { }
}

//Завантаження данних

import content from "./content.json";

const DICTIONARY = content.dictionary;
// ─── Кольори гравців ─────────────────────────────────────────────────────────
const PLAYER_COLORS = [
  { name: "Червоний", hex: "#E53935" },
  { name: "Синій", hex: "#1E88E5" },
  { name: "Зелений", hex: "#43A047" },
  { name: "Помаранчевий", hex: "#FB8C00" },
  { name: "Фіолетовий", hex: "#8E24AA" },
  { name: "Рожевий", hex: "#E91E8C" },
  { name: "Блакитний", hex: "#00ACC1" },
  { name: "Коричневий", hex: "#6D4C41" },
];

// ─── Хелпери ─────────────────────────────────────────────────────────────────
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function buildInitialState() {
  const entry = rnd(DICTIONARY);
  const word = rnd(entry.words);
  return { category: entry.category, word };
}

// ─── Функція перемалювання canvas (спільна) ──────────────────────────────────
function redrawCanvas(canvas, allPaths) {
  if (!canvas) return;
  const dpr = canvas._dpr || 1;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#ffffff";
  // Малюємо у логічних CSS-пікселях (canvas.width/dpr — логічна ширина)
  const lw = canvas.width / dpr;
  const lh = canvas.height / dpr;
  ctx.fillRect(0, 0, lw, lh);
  allPaths.forEach((path) => {
    if (!path.points || path.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.stroke();
  });
  ctx.restore();
}

// ─── Налаштування HiDPI canvas ────────────────────────────────────────────────
// Множить внутрішню роздільну здатність на devicePixelRatio, CSS-розмір не чіпає.
// Повертає dpr, щоб можна було враховувати при малюванні.
function setupHiDPICanvas(canvas, cssWidth, cssHeight) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas._dpr = dpr; // зберігаємо для redrawCanvas
  return dpr;
}

// ─── Стилі ──────────────────────────────────────────────────────────────────
const S = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: "100%",
    boxSizing: "border-box",
  },
  card: {
    background: "var(--bg2)",
    borderRadius: "var(--radius)",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    border: "1px solid var(--bg3)",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: "var(--text)",
    textAlign: "center",
    margin: 0,
  },
  subtitle: {
    fontSize: 15,
    color: "var(--text2)",
    textAlign: "center",
    margin: 0,
  },
  label: {
    fontSize: 13,
    color: "var(--text2)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    display: "block",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "var(--radius-sm)",
    border: "2px solid var(--bg3)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  playerChip: () => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "var(--bg3)",
    borderRadius: "var(--radius-sm)",
    fontSize: 15,
    color: "var(--text)",
    fontWeight: 600,
  }),
  colorDot: (hex, size = 18) => ({
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: "50%",
    background: hex,
    flexShrink: 0,
    border: "2px solid rgba(255,255,255,0.2)",
    display: "inline-block",
  }),
  colorSquare: (hex, size = 24) => ({
    width: size,
    height: size,
    borderRadius: 5,
    background: hex,
    display: "inline-block",
    border: "2px solid rgba(255,255,255,0.2)",
    verticalAlign: "middle",
  }),
  roleCard: (color) => ({
    background: `${color}22`,
    border: `2px solid ${color}66`,
    borderRadius: "var(--radius)",
    padding: "20px 18px",
    textAlign: "center",
  }),
  bigText: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text)",
    margin: 0,
  },
  fakeTag: {
    display: "inline-block",
    background: "#E5393544",
    border: "1.5px solid #E53935aa",
    color: "#ff6b6b",
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timer: {
    fontSize: 52,
    fontWeight: 900,
    textAlign: "center",
    color: "var(--accent)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: 2,
  },
  timerWarning: {
    fontSize: 52,
    fontWeight: 900,
    textAlign: "center",
    color: "#E53935",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: 2,
    animation: "pulse 0.6s ease-in-out infinite alternate",
  },
  voteBtn: (selected, color) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: "var(--radius-sm)",
    border: selected ? `2px solid ${color}` : "2px solid var(--bg3)",
    background: selected ? `${color}22` : "var(--bg3)",
    color: "var(--text)",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s",
    textAlign: "left",
  }),
  resultReveal: {
    textAlign: "center",
    padding: "28px 20px",
    borderRadius: "var(--radius)",
    background: "linear-gradient(135deg, #7c6af733 0%, #a78bfa22 100%)",
    border: "2px solid var(--accent)",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ГОЛОВНИЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════
export default function FakeArtist() {
  const [screen, setScreen] = useState("setup");

  // Гравці: [{id, name, color: {name, hex}}]
  const [players, setPlayers] = useState([]);

  // Рунд
  const [gameWord, setGameWord] = useState(null);
  const [fakeIndex, setFakeIndex] = useState(null);

  // Перебір ролей
  const [rolePassIndex, setRolePassIndex] = useState(0);
  const [revealShown, setRevealShown] = useState(false);

  // Малювання — зберігаємо масив шляхів
  const [paths, setPaths] = useState([]);
  const [drawPhase, setDrawPhase] = useState({ playerIdx: 0, round: 1 });

  // Голосування
  const [votePassIndex, setVotePassIndex] = useState(0);
  const [votePassShown, setVotePassShown] = useState(true);
  const [votes, setVotes] = useState({});
  const [currentVote, setCurrentVote] = useState(null);

  // ─── Старт гри ──────────────────────────────────────────────────────────────
  const startGame = useCallback((playerList) => {
    // Зберігаємо імена в sessionStorage перед початком гри
    saveNames(playerList.map((p) => p.name));
    const { category, word } = buildInitialState();
    const fake = Math.floor(Math.random() * playerList.length);
    setPlayers(playerList);
    setGameWord({ category, word });
    setFakeIndex(fake);
    setRolePassIndex(0);
    setRevealShown(false);
    setPaths([]);
    setDrawPhase({ playerIdx: 0, round: 1 });
    setVotePassIndex(0);
    setVotePassShown(true);
    setVotes({});
    setCurrentVote(null);
    setScreen("role_pass");
  }, []);

  // ─── Перебір ролей ───────────────────────────────────────────────────────────
  const handleRolePassNext = () => {
    setRevealShown(false);
    setScreen("role_reveal");
  };

  const handleRoleHide = () => {
    const next = rolePassIndex + 1;
    if (next >= players.length) {
      setDrawPhase({ playerIdx: 0, round: 1 });
      setScreen("drawing");
    } else {
      setRolePassIndex(next);
      setRevealShown(false);
      setScreen("role_pass");
    }
  };

  // ─── Малювання ───────────────────────────────────────────────────────────────
  const handleDrawingDone = () => {
    const { playerIdx, round } = drawPhase;
    const nextIdx = playerIdx + 1;
    if (nextIdx >= players.length) {
      if (round === 1) {
        setDrawPhase({ playerIdx: 0, round: 2 });
      } else {
        setScreen("discussion");
      }
    } else {
      setDrawPhase({ playerIdx: nextIdx, round });
    }
  };

  const handleUndoMyLine = () => {
    const playerId = players[drawPhase.playerIdx].id;
    setPaths((prev) => {
      const lastIdx = [...prev].reverse().findIndex((p) => p.playerId === playerId);
      if (lastIdx === -1) return prev;
      const realIdx = prev.length - 1 - lastIdx;
      return prev.filter((_, i) => i !== realIdx);
    });
  };

  // ─── Голосування ─────────────────────────────────────────────────────────────
  const handleVotePassNext = () => setVotePassShown(false);

  const handleVoteSubmit = () => {
    if (!currentVote) return;
    const voterId = players[votePassIndex].id;
    setVotes((prev) => ({ ...prev, [voterId]: currentVote }));
    setCurrentVote(null);
    const next = votePassIndex + 1;
    if (next >= players.length) {
      setScreen("results");
    } else {
      setVotePassIndex(next);
      setVotePassShown(true);
    }
  };

  // ─── Рестарт ─────────────────────────────────────────────────────────────────
  const handleRestart = () => {
    // Імена вже збережені в sessionStorage через useEffect в SetupScreen
    setPlayers([]);
    setScreen("setup");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={S.root}>
      <style>{`
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.7); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes floatBrush { 0%,100% { transform: translateY(0px) rotate(-8deg); } 50% { transform: translateY(-8px) rotate(-8deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .fa-screen { animation: fadeIn 0.3s ease; }
        .fa-hero-brush { animation: floatBrush 2.8s ease-in-out infinite; display:inline-block; }
      `}</style>

      {screen === "setup" && (
        <SetupScreen onStart={startGame} />
      )}
      {screen === "role_pass" && (
        <RolePassScreen
          player={players[rolePassIndex]}
          onNext={handleRolePassNext}
        />
      )}
      {screen === "role_reveal" && (
        <RoleRevealScreen
          player={players[rolePassIndex]}
          gameWord={gameWord}
          isFake={rolePassIndex === fakeIndex}
          onHide={handleRoleHide}
          revealShown={revealShown}
          setRevealShown={setRevealShown}
        />
      )}
      {screen === "drawing" && (
        <DrawingScreen
          players={players}
          drawPhase={drawPhase}
          paths={paths}
          setPaths={setPaths}
          onDone={handleDrawingDone}
          onUndo={handleUndoMyLine}
        />
      )}
      {screen === "discussion" && (
        <DiscussionScreen
          paths={paths}
          players={players}
          onNext={() => {
            setVotePassIndex(0);
            setVotePassShown(true);
            setScreen("voting");
          }}
        />
      )}
      {screen === "voting" && (
        <VotingScreen
          players={players}
          votePassIndex={votePassIndex}
          votePassShown={votePassShown}
          currentVote={currentVote}
          setCurrentVote={setCurrentVote}
          onPassNext={handleVotePassNext}
          onVoteSubmit={handleVoteSubmit}
        />
      )}
      {screen === "results" && (
        <ResultsScreen
          players={players}
          fakeIndex={fakeIndex}
          votes={votes}
          gameWord={gameWord}
          paths={paths}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function SetupScreen({ onStart }) {
  // Лінива ініціалізація: зчитується один раз із sessionStorage, як у грі «Шпигун»
  const [players, setPlayers] = useState(() => {
    const names = loadNames();
    return names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    }));
  });
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef(null);

  // Автозбереження: при будь-якій зміні списку гравців — зберігаємо імена
  useEffect(() => {
    saveNames(players.map((p) => p.name));
  }, [players]);

  const addPlayer = () => {
    const name = inputVal.trim();
    if (!name || players.length >= 8) return;
    const colorInfo = PLAYER_COLORS[players.length % PLAYER_COLORS.length];
    setPlayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, color: colorInfo },
    ]);
    setInputVal("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removePlayer = (id) => setPlayers((prev) => {
    const next = prev.filter((p) => p.id !== id);
    return next.map((p, i) => ({ ...p, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }));
  });
  const handleKey = (e) => { if (e.key === "Enter") addPlayer(); };
  const canStart = players.length >= 3;

  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Hero card ─────────────────────────────────────── */}
      <div style={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        position: "relative",
        padding: "32px 24px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        background: "linear-gradient(135deg, #1a0a2e 0%, #2d1054 40%, #1a0a2e 100%)",
        border: "1.5px solid #7c6af755",
        boxShadow: "0 8px 40px #7c6af722",
      }}>
        {/* Decorative paint strokes in background */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {[
            { color: "#E53935", left: "5%", top: "10%", w: 60, h: 8, rot: -15 },
            { color: "#1E88E5", left: "70%", top: "18%", w: 50, h: 7, rot: 20 },
            { color: "#43A047", left: "15%", top: "72%", w: 70, h: 8, rot: -8 },
            { color: "#FB8C00", left: "60%", top: "68%", w: 45, h: 7, rot: 12 },
            { color: "#E91E8C", left: "80%", top: "45%", w: 35, h: 6, rot: -25 },
            { color: "#00ACC1", left: "2%", top: "48%", w: 40, h: 6, rot: 18 },
          ].map((s, i) => (
            <div key={i} style={{
              position: "absolute",
              left: s.left, top: s.top,
              width: s.w, height: s.h,
              borderRadius: 999,
              background: `${s.color}55`,
              transform: `rotate(${s.rot}deg)`,
            }} />
          ))}
        </div>

        {/* Floating emoji */}
        <div className="fa-hero-brush" style={{ fontSize: 64, filter: "drop-shadow(0 4px 16px #7c6af788)" }}>
          🎨
        </div>

        <h1 style={{
          fontSize: 30,
          fontWeight: 900,
          margin: 0,
          textAlign: "center",
          background: "linear-gradient(90deg, #a78bfa, #f472b6, #fb923c, #a78bfa)",
          backgroundSize: "300% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "shimmer 4s linear infinite",
        }}>
          Фальшивий художник
        </h1>

        <p style={{
          fontSize: 14,
          color: "#c4b5fdaa",
          textAlign: "center",
          margin: 0,
          lineHeight: 1.5,
        }}>
          Один гравець не знає слова.<br />Хто ховається серед художників?
        </p>

        {/* Color palette decoration */}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {PLAYER_COLORS.map((c) => (
            <div key={c.hex} style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: c.hex,
              boxShadow: `0 0 8px ${c.hex}99`,
            }} />
          ))}
        </div>
      </div>

      {/* ── Add players card ──────────────────────────────── */}
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>👥</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>Гравці</span>
          <span style={{
            marginLeft: "auto",
            fontSize: 13,
            color: players.length >= 3 ? "#66bb6a" : "var(--text2)",
            fontWeight: 600,
          }}>
            {players.length}/8
          </span>
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ім'я гравця..."
            style={{ ...S.input, flex: 1 }}
            maxLength={20}
          />
          <button
            className="btn-primary"
            onClick={addPlayer}
            disabled={!inputVal.trim() || players.length >= 8}
            style={{
              width: "auto",
              padding: "0 22px",
              fontSize: 26,
              borderRadius: "var(--radius-sm)",
              flexShrink: 0,
              opacity: (!inputVal.trim() || players.length >= 8) ? 0.45 : 1,
              transition: "opacity 0.2s",
            }}
          >
            +
          </button>
        </div>

        {/* Player list */}
        {players.length === 0 ? (
          <p style={{ ...S.subtitle, fontSize: 14, padding: "8px 0" }}>
            Додай мінімум 3 гравців, щоб почати 👆
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p) => (
              <div key={p.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderRadius: "var(--radius-sm)",
                background: `${p.color.hex}14`,
                border: `1.5px solid ${p.color.hex}44`,
                transition: "all 0.2s",
              }}>
                <span style={S.colorDot(p.color.hex, 18)} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--text2)", marginRight: 6 }}>{p.color.name}</span>
                <button
                  onClick={() => removePlayer(p.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text2)",
                    cursor: "pointer",
                    fontSize: 18,
                    padding: "0 2px",
                    lineHeight: 1,
                    opacity: 0.7,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {players.length >= 8 && (
          <p style={{ ...S.subtitle, fontSize: 13, color: "#fb8c00" }}>
            ⚠️ Максимум 8 гравців досягнуто
          </p>
        )}
      </div>

      {canStart && (
        <button
          className="btn-primary"
          onClick={() => onStart(players)}
          style={{
            fontSize: 18,
            padding: "18px",
            borderRadius: "var(--radius)",
            letterSpacing: 0.5,
          }}
        >
          🎨 Почати гру ({players.length} гравців)
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE PASS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function RolePassScreen({ player, onNext }) {
  if (!player) return null;
  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
      <div style={{ ...S.card, width: "100%", alignItems: "center", gap: 20 }}>
        <div style={{ fontSize: 56 }}>📱</div>
        <h2 style={{ ...S.title, fontSize: 22 }}>Передайте телефон</h2>

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          padding: "20px 24px",
          borderRadius: "var(--radius)",
          background: `${player.color.hex}18`,
          border: `2px solid ${player.color.hex}55`,
          width: "100%",
          boxSizing: "border-box",
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: player.color.hex,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 900,
            color: "#fff",
          }}>
            {player.name[0].toUpperCase()}
          </div>
          <p style={{ ...S.bigText, fontSize: 24 }}>{player.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text2)", fontSize: 14 }}>
            <span>Колір:</span>
            <span style={S.colorSquare(player.color.hex, 20)} />
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{player.color.name}</span>
          </div>
        </div>

        <p style={{ ...S.subtitle, fontSize: 14 }}>
          Переконайся, що ніхто інший не бачить екран
        </p>

        <button
          className="btn-primary"
          onClick={onNext}
          style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)", width: "100%" }}
        >
          Це я 👋
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE REVEAL SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function RoleRevealScreen({ player, gameWord, isFake, onHide, revealShown, setRevealShown }) {
  if (!player || !gameWord) return null;

  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: player.color.hex, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>Роль для:</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{player.name}</div>
          </div>
        </div>

        {!revealShown ? (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 40 }}>🙈</div>
            <p style={S.subtitle}>Натисни, щоб побачити свою роль</p>
            <button
              className="btn-primary"
              onClick={() => setRevealShown(true)}
              style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)" }}
            >
              Показати роль
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "popIn 0.35s ease" }}>
            {isFake ? (
              <div style={{ ...S.roleCard(player.color.hex), gap: 12, display: "flex", flexDirection: "column" }}>
                <span style={S.fakeTag}>🎭 ТИ — ФАЛЬШИВИЙ ХУДОЖНИК!</span>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Категорія:</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{gameWord.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Слово:</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#ff6b6b", letterSpacing: 4 }}>???</div>
                </div>
                <p style={{ fontSize: 14, color: "#ffb347", fontWeight: 600, textAlign: "center", margin: 0 }}>
                  Вдавай, що все знаєш! Малюй впевнено 🎨
                </p>
              </div>
            ) : (
              <div style={{ ...S.roleCard(player.color.hex), gap: 12, display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>🎨 Ти — звичайний художник</span>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Категорія:</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{gameWord.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>Слово:</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "var(--accent2)" }}>{gameWord.word}</div>
                </div>
                <p style={{ fontSize: 14, color: "var(--text2)", textAlign: "center", margin: 0 }}>
                  Малюй так, щоб усі здогадались, але не підказуй зайвого!
                </p>
              </div>
            )}

            <button
              className="btn-secondary"
              onClick={onHide}
              style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)" }}
            >
              Сховати 🙈
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAWING BOARD  — FIX: canvas size stored in ref, never reset on paths change
// ═══════════════════════════════════════════════════════════════════════════════
function DrawingScreen({ players, drawPhase, paths, setPaths, onDone, onUndo }) {
  const canvasRef = useRef(null);
  // We keep drawing state in refs to avoid stale closures
  const isDrawing = useRef(false);
  const currentPath = useRef(null);
  // Track canvas size in a ref so resize handler doesn't go stale
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  const currentPlayer = players[drawPhase.playerIdx];
  const currentColorRef = useRef(currentPlayer?.color?.hex || "#000");
  const currentPlayerRef = useRef(currentPlayer);

  // Keep refs up-to-date on every render
  currentColorRef.current = currentPlayer?.color?.hex || "#000";
  currentPlayerRef.current = currentPlayer;

  // ─── Set canvas size once on mount, update on resize ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;

    const setSize = () => {
      const cssW = container.clientWidth;
      const cssH = Math.min(cssW * 0.72, 380);
      // HiDPI: внутрішній буфер × devicePixelRatio, CSS-розмір незмінний
      setupHiDPICanvas(canvas, cssW, cssH);
      canvasSizeRef.current = { w: cssW, h: cssH };
      redrawCanvas(canvas, paths);
    };

    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Redraw whenever paths array changes (undo / new stroke committed) ───
  useEffect(() => {
    redrawCanvas(canvasRef.current, paths);
  }, [paths]);

  // ─── Get pointer position in logical CSS pixels ───────────────────────────
  // Важливо: повертаємо ЛОГІЧНІ пікселі (не фізичні).
  // redrawCanvas / live-draw самі застосовують setTransform(dpr,...),
  // тому координати не потребують множення на dpr.
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  }, []);

  // ─── Start stroke ─────────────────────────────────────────────────────────
  const startDraw = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);
    isDrawing.current = true;
    currentPath.current = {
      id: crypto.randomUUID(),
      playerId: currentPlayerRef.current.id,
      color: currentColorRef.current,
      points: [pos],
    };
  }, [getPos]);

  // ─── Continue stroke — draw live segment directly on canvas ───────────────
  const draw = useCallback((e) => {
    if (!isDrawing.current || !currentPath.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPath.current.points.push(pos);

    const canvas = canvasRef.current;
    const dpr = canvas._dpr || 1;
    const ctx = canvas.getContext("2d");
    const pts = currentPath.current.points;
    if (pts.length >= 2) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = currentColorRef.current;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }
  }, [getPos]);

  // ─── End stroke — commit to state (triggers redraw via useEffect) ─────────
  const endDraw = useCallback((e) => {
    if (!isDrawing.current) return;
    // For touchend e.touches is empty, so no preventDefault needed on coords
    e.preventDefault?.();
    isDrawing.current = false;
    if (currentPath.current && currentPath.current.points.length >= 2) {
      const finishedPath = { ...currentPath.current };
      setPaths((prev) => [...prev, finishedPath]);
    }
    currentPath.current = null;
  }, [setPaths]);

  const currentColor = currentPlayer?.color?.hex || "#000";
  const hasMyPaths = paths.some((p) => p.playerId === currentPlayer?.id);

  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Player indicator */}
      <div style={{
        ...S.card,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
      }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: currentColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>Зараз малює:</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>{currentPlayer?.name}</div>
        </div>
        <div style={{
          padding: "6px 12px",
          background: "var(--accent)",
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
        }}>
          Раунд {drawPhase.round}
        </div>
      </div>

      {/* Canvas wrapper */}
      <div style={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: `3px solid ${currentColor}`,
        background: "#ffffff",
        boxShadow: `0 0 20px ${currentColor}44`,
        transition: "border-color 0.3s, box-shadow 0.3s",
        touchAction: "none",
        userSelect: "none",
      }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          onTouchCancel={endDraw}
        />
      </div>

      {/* Player progress dots */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
        {players.map((p, i) => {
          const isCurrent = i === drawPhase.playerIdx;
          const isDone = drawPhase.round === 2
            ? i < drawPhase.playerIdx
            : drawPhase.round === 1 && i < drawPhase.playerIdx;
          return (
            <div
              key={p.id}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: p.color.hex,
                border: isCurrent ? "3px solid #fff" : "2px solid transparent",
                opacity: isDone ? 0.35 : 1,
                transition: "all 0.2s",
                boxShadow: isCurrent ? `0 0 10px ${p.color.hex}88` : "none",
              }}
              title={p.name}
            />
          );
        })}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="btn-secondary"
          onClick={onUndo}
          disabled={!hasMyPaths}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
            opacity: hasMyPaths ? 1 : 0.4,
          }}
        >
          ↩ Очистити мою лінію
        </button>
        <button
          className="btn-primary"
          onClick={onDone}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "var(--radius-sm)",
            fontSize: 14,
          }}
        >
          Завершити хід ✓
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCUSSION SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function DiscussionScreen({ paths, players, onNext }) {
  const [timeLeft, setTimeLeft] = useState(180);
  const canvasRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // Size + draw canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const cssW = container.clientWidth;
    const cssH = Math.min(cssW * 0.72, 340);
    setupHiDPICanvas(canvas, cssW, cssH);
    redrawCanvas(canvas, paths);
  }, [paths]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");
  const isWarning = timeLeft <= 30;

  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={S.card}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 4 }}>🗣️</div>
          <h2 style={{ ...S.title, fontSize: 20 }}>Хто намалював цю дичину?</h2>
          <p style={{ ...S.subtitle, marginTop: 4 }}>Обговоріть та знайдіть фальшивого художника!</p>
        </div>
        <div style={isWarning ? S.timerWarning : S.timer}>{mins}:{secs}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {players.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text2)" }}>
              <span style={S.colorDot(p.color.hex, 14)} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "2px solid var(--bg3)",
        background: "#ffffff",
      }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
      </div>

      <button
        className="btn-primary"
        onClick={onNext}
        style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)" }}
      >
        Перейти до голосування 🗳️
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOTING SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function VotingScreen({ players, votePassIndex, votePassShown, currentVote, setCurrentVote, onPassNext, onVoteSubmit }) {
  const voter = players[votePassIndex];
  if (!voter) return null;

  if (votePassShown) {
    return (
      <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...S.card, alignItems: "center" }}>
          <div style={{ fontSize: 48 }}>🗳️</div>
          <h2 style={{ ...S.title, fontSize: 22 }}>Час голосування</h2>
          <p style={S.subtitle}>Передайте телефон</p>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "20px",
            borderRadius: "var(--radius)",
            background: `${voter.color.hex}18`,
            border: `2px solid ${voter.color.hex}55`,
            width: "100%",
            boxSizing: "border-box",
          }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: voter.color.hex }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{voter.name}</div>
          </div>
          <p style={{ ...S.subtitle, fontSize: 13 }}>Нікому не показуй свій вибір!</p>
          <button
            className="btn-primary"
            onClick={onPassNext}
            style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)", width: "100%" }}
          >
            Це я 👋
          </button>
        </div>
      </div>
    );
  }

  const candidatesExcludeSelf = players.filter((p) => p.id !== voter.id);

  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: voter.color.hex, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>Голосує:</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{voter.name}</div>
          </div>
        </div>
        <p style={{ ...S.subtitle, margin: 0 }}>Хто, на твою думку, фальшивий художник?</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {candidatesExcludeSelf.map((p) => (
          <button
            key={p.id}
            onClick={() => setCurrentVote(p.id)}
            style={S.voteBtn(currentVote === p.id, p.color.hex)}
          >
            <span style={S.colorDot(p.color.hex, 22)} />
            {p.name}
            {currentVote === p.id && <span style={{ marginLeft: "auto", fontSize: 18 }}>✓</span>}
          </button>
        ))}
      </div>

      <button
        className="btn-primary"
        onClick={onVoteSubmit}
        disabled={!currentVote}
        style={{
          fontSize: 17,
          padding: "16px",
          borderRadius: "var(--radius)",
          opacity: currentVote ? 1 : 0.5,
        }}
      >
        Підтвердити вибір 🗳️
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS SCREEN  — 3-step reveal: votes → fake guess chance → word reveal
// ═══════════════════════════════════════════════════════════════════════════════
function ResultsScreen({ players, fakeIndex, votes, gameWord, paths, onRestart }) {
  // step 0: suspense / "reveal fake"
  // step 1: fake artist revealed + voting results, fake can try to guess (word hidden)
  // step 2: word revealed
  const [step, setStep] = useState(0);
  const canvasRef = useRef(null);
  const fakePlayer = players[fakeIndex];

  // ─── Vote counts ──────────────────────────────────────────────────────────
  const voteCounts = {};
  players.forEach((p) => { voteCounts[p.id] = 0; });
  Object.values(votes).forEach((votedId) => {
    if (votedId in voteCounts) voteCounts[votedId]++;
  });

  const maxVotes = Math.max(...Object.values(voteCounts));
  // mostVotedIds — усі гравці, що поділяють першість
  const mostVotedIds = Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVotes);

  // Сценарій А: фальшивий спіймано — якщо він у списку лідерів (чи є нічия, чи ні)
  // Сценарій Б: фальшивий не спіймано — найбільше голосів отримав хтось із чесних
  const wasCorrectlyCaught = mostVotedIds.includes(fakePlayer.id);

  // Гравці, які проголосували правильно (за фальшивого)
  const correctVoterIds = Object.entries(votes)
    .filter(([, votedId]) => votedId === fakePlayer.id)
    .map(([voterId]) => voterId);
  const correctVoters = players.filter((p) => correctVoterIds.includes(p.id));

  // ─── Canvas for step 2 ────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || paths.length === 0) return;
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      const cssW = container.clientWidth;
      const cssH = Math.min(cssW * 0.72, 300);
      setupHiDPICanvas(canvas, cssW, cssH);
      redrawCanvas(canvas, paths);
    });
  }, [step, paths]);

  // ─── Correct voters label ─────────────────────────────────────────────────
  const correctVotersLabel = (() => {
    if (correctVoters.length === 0) return null;
    const names = correctVoters.map((p) => `"${p.name}"`).join(", ");
    const verb = correctVoters.length === 1 ? "правильно виявляє" : "правильно виявили";
    const prefix = correctVoters.length === 1 ? `✅ Художник ${names}` : `✅ Художники ${names}`;
    return `${prefix} ${verb} фальшивого!`;
  })();

  // ════════ STEP 0 — suspense ═══════════════════════════════════════════════
  if (step === 0) {
    return (
      <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...S.card, alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 64 }}>🎭</div>
          <h2 style={S.title}>Хто ж це був?</h2>
          <p style={S.subtitle}>Голосування завершено. Готові до розкриття?</p>
          <button
            className="btn-primary"
            onClick={() => setStep(1)}
            style={{ fontSize: 18, padding: "18px", borderRadius: "var(--radius)", width: "100%" }}
          >
            Розкрити! 🔍
          </button>
        </div>
      </div>
    );
  }

  // ════════ STEP 1A — Сценарій А: фальшивого спіймано → останній шанс ════════
  // ════════ STEP 1B — Сценарій Б: фальшивий виграє одразу → одразу слово ═════
  if (step === 1) {
    return (
      <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "popIn 0.45s ease" }}>

        {/* Fake artist reveal banner */}
        <div style={S.resultReveal}>
          <p style={{ fontSize: 15, color: "var(--text2)", marginBottom: 10 }}>Фальшивим художником був...</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: fakePlayer.color.hex, border: "3px solid #fff", flexShrink: 0 }} />
            <div style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>{fakePlayer.name}!</div>
          </div>

          {wasCorrectlyCaught ? (
            // Сценарій А — спіймали
            <div style={{
              padding: "12px 14px",
              background: "#43a04722",
              border: "1.5px solid #43a04766",
              borderRadius: 10,
              fontSize: 14,
              color: "#66bb6a",
              fontWeight: 600,
              lineHeight: 1.5,
            }}>
              {correctVotersLabel}
            </div>
          ) : (
            // Сценарій Б — не спіймали
            <div style={{
              padding: "12px 14px",
              background: "#E5393522",
              border: "1.5px solid #E5393566",
              borderRadius: 10,
              fontSize: 14,
              color: "#ef5350",
              fontWeight: 600,
            }}>
              💀 Художники помилилися! {fakePlayer.name} перемагає без вгадування!
            </div>
          )}
        </div>

        {/* Voting results */}
        <div style={S.card}>
          <h3 style={{ ...S.title, fontSize: 17, textAlign: "left" }}>📊 Результати голосування</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players
              .slice()
              .sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
              .map((p) => {
                const count = voteCounts[p.id] || 0;
                const isFakePlayer = p.id === fakePlayer.id;
                const isTopVoted = mostVotedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: isFakePlayer ? `${p.color.hex}22` : "var(--bg3)",
                      border: isFakePlayer ? `1.5px solid ${p.color.hex}66` : "1.5px solid transparent",
                    }}
                  >
                    <span style={S.colorDot(p.color.hex, 18)} />
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{p.name}</span>
                    {isFakePlayer && <span style={{ fontSize: 12, color: "#ff6b6b" }}>🎭 Фальшивий</span>}
                    {isTopVoted && !isFakePlayer && <span style={{ fontSize: 12, color: "#fb8c00" }}>👆 Засуджений</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: count > 0 ? "var(--accent2)" : "var(--text2)" }}>
                      {count} голос{count === 1 ? "" : "ів"}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {wasCorrectlyCaught ? (
          // ── Сценарій А: останній шанс ────────────────────────────────────
          <>
            <div style={{
              padding: "16px",
              borderRadius: "var(--radius)",
              background: "#7c6af720",
              border: "2px dashed #7c6af788",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ fontSize: 28 }}>🎯</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                Останній шанс для {fakePlayer.name}!
              </div>
              <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5 }}>
                Якщо зможеш вголос назвати правильне слово — перемагаєш!<br />
                Слово ще приховане. Роби спробу зараз!
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)" }}
            >
              Показати справжнє слово 🔓
            </button>
          </>
        ) : (
          // ── Сценарій Б: тріумф фальшивого — одразу показуємо слово ──────
          <button
            className="btn-primary"
            onClick={() => setStep(2)}
            style={{
              fontSize: 17, padding: "16px", borderRadius: "var(--radius)",
              background: "linear-gradient(135deg, #E53935, #b71c1c)",
            }}
          >
            🏆 Показати слово і тріумф!
          </button>
        )}
      </div>
    );
  }

  // ════════ STEP 2 — word revealed + canvas ═════════════════════════════════
  return (
    <div className="fa-screen" style={{ display: "flex", flexDirection: "column", gap: 14, animation: "popIn 0.4s ease" }}>

      {/* Word reveal */}
      <div style={S.resultReveal}>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>Справжнє слово було:</p>
        <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent2)", marginBottom: 4 }}>
          {gameWord.word}
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>({gameWord.category})</div>

        <div style={{ marginTop: 14 }}>
          {wasCorrectlyCaught ? (
            // Сценарій А: спіймали, але міг вгадати
            <div style={{
              padding: "10px 14px",
              background: "#43a04722",
              border: "1.5px solid #43a04766",
              borderRadius: 10,
              fontSize: 14,
              color: "#66bb6a",
              fontWeight: 600,
              lineHeight: 1.5,
            }}>
              {correctVotersLabel}
              <br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>
                Якщо <strong>{fakePlayer.name}</strong> назвав/ла слово <strong>"{gameWord.word}"</strong> вголос — перемагає! 🎭<br />
                Якщо ні — перемагають художники!
              </span>
            </div>
          ) : (
            // Сценарій Б: фальшивий переміг ще на голосуванні
            <div style={{
              padding: "10px 14px",
              background: "#E5393522",
              border: "1.5px solid #E5393566",
              borderRadius: 10,
              fontSize: 14,
              color: "#ef5350",
              fontWeight: 600,
              lineHeight: 1.5,
            }}>
              💀 Художники засудили невинного!<br />
              <span style={{ fontWeight: 400, fontSize: 13 }}>
                <strong>{fakePlayer.name}</strong> переміг без вгадування слова — ідеальний обман! 🎭
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Canvas masterpiece */}
      {paths.length > 0 && (
        <div style={S.card}>
          <h3 style={{ ...S.title, fontSize: 17, textAlign: "left" }}>🖼️ Спільний шедевр</h3>
          <div style={{
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            border: "2px solid var(--bg3)",
            background: "#ffffff",
          }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
          </div>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onRestart}
        style={{ fontSize: 17, padding: "16px", borderRadius: "var(--radius)" }}
      >
        🎨 Грати ще раз!
      </button>
    </div>
  );
}
