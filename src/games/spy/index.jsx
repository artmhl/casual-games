// src/games/spy/index.jsx
// Гра "Шпигун" — гравці вибирають категорії, отримують слово, а шпигун намагається його відгадати.
// Повністю автономна. sessionStorage для збереження налаштувань.

import { useState, useEffect, useRef } from "react";

// ─── ЗБЕРЕЖЕННЯ ДАНИХ ─────────────────────────────────────────────────────────

const SS_KEY = "spy_players_v2";
const SS_CATS_KEY = "spy_cats_v2";
const SS_MODE_KEY = "spy_mode_v2";

function loadPlayers() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlayers(arr) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(arr));
  } catch { }
}

function loadCats() {
  try {
    const raw = sessionStorage.getItem(SS_CATS_KEY);
    return raw ? JSON.parse(raw) : ["city", "professions", "food"];
  } catch {
    return ["city", "professions", "food"];
  }
}

function saveCats(arr) {
  try {
    sessionStorage.setItem(SS_CATS_KEY, JSON.stringify(arr));
  } catch { }
}

function loadMode() {
  try {
    return parseInt(sessionStorage.getItem(SS_MODE_KEY)) || 1;
  } catch {
    return 1;
  }
}

function saveMode(mode) {
  try {
    sessionStorage.setItem(SS_MODE_KEY, mode.toString());
  } catch { }
}

// ─── ЗАВАНТАЖЕННЯ ДАНИХ ────────────────────────────────────────────────────────

import { categories as CATEGORIES, gadgets as GADGETS, spy_gadgets as SPY_GADGETS } from "./content.json";

// ─── ДЕТАЛЬНІ ІНСТРУКЦІЇ РЕЖИМІВ ──────────────────────────────────────────────

const MODE_INSTRUCTIONS = {
  1: {
    icon: "🕵️", title: "Класичний Шпигун", color: "#7c6af7",
    sections: [
      { heading: "Суть гри", text: "Один гравець — Шпигун. Інші отримують однакове Слово з обраних категорій. Шпигун слова не знає." },
      { heading: "Хід гри", text: "Гравці по черзі задають питання один одному, щоб зрозуміти хто в темі. Шпигун слухає і намагається вгадати про що мова." },
      { heading: "Мета звичайних гравців", text: "Знайти Шпигуна через спостереження." },
      { heading: "Мета Шпигуна", text: "Вгадати слово АБО не бути розкритим до кінця таймера." },
    ],
  },
  2: {
    icon: "🔧", title: "Прокачаний Агент", color: "#06b6d4",
    sections: [
      { heading: "Суть гри", text: "Як Класичний Шпигун, але кожен гравець отримує унікальний Гаджет або Завдання." },
      { heading: "Гаджети звичайних гравців", text: "Виконуй своє завдання протягом гри непомітно." },
      { heading: "Гаджет Шпигуна", text: "Шпигун отримує спеціальний гаджет для маніпуляцій." },
    ],
  },
  3: {
    icon: "👥", title: "Два Шпигуни", color: "#ef4444",
    sections: [
      { heading: "Суть гри", text: "Двоє Шпигунів проти решти. Вони НЕ знають одне одного." },
      { heading: "Хід гри", text: "Все як у класиці, але Шпигунам ще складніше, бо вони можуть підозрювати один одного." },
    ],
  },
  4: {
    icon: "🤝", title: "Шпигун і Зрадник", color: "#f59e0b",
    sections: [
      { heading: "Суть гри", text: "Один Шпигун і один Зрадник. Зрадник знає Слово і знає хто Шпигун." },
      { heading: "Мета Зрадника", text: "Допомагати Шпигуну відгадати Слово, але так, щоб не розкрити себе. Якщо Зрадника розкриють — команда Шпигуна програє." },
    ],
  },
};

// ─── ХЕЛПЕРИ ──────────────────────────────────────────────────────────────────

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ":" + s.toString().padStart(2, "0");
}

const card = (extra = {}) => ({
  background: "var(--bg2)",
  border: "1px solid var(--bg3)",
  borderRadius: "var(--radius)",
  padding: "16px",
  ...extra,
});

const lbl = (color = "var(--text2)") => ({
  fontSize: "0.7rem",
  fontWeight: 700,
  color,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 10,
});

// ─── ГОЛОВНИЙ КОМПОНЕНТ ───────────────────────────────────────────────────────

export default function SpyGame() {
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState(loadPlayers);
  const [selectedCats, setSelectedCats] = useState(loadCats);
  const [mode, setMode] = useState(loadMode);
  const [timerMinutes, setTimerMinutes] = useState(5);

  const [activeWord, setActiveWord] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [playerRoles, setPlayerRoles] = useState([]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => saveCats(selectedCats), [selectedCats]);
  useEffect(() => saveMode(mode), [mode]);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            setTimerActive(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // Генеруємо ролі для гравців
  function startGame() {
    // 1. Вибираємо випадкову категорію і слово
    const pool = CATEGORIES.filter(c => selectedCats.includes(c.id));
    const randomCat = getRandom(pool);
    const randomWord = getRandom(randomCat.words);

    setActiveCategory(randomCat);
    setActiveWord(randomWord);

    // 2. Розподіляємо ролі
    let rolesArray = [];
    const pCount = players.length;

    if (mode === 1) { // 1 шпигун
      rolesArray = ["spy", ...Array(pCount - 1).fill("civilian")];
    } else if (mode === 2) { // 1 шпигун + гаджети
      rolesArray = ["spy", ...Array(pCount - 1).fill("civilian")];
    } else if (mode === 3) { // 2 шпигуни
      rolesArray = ["spy", "spy", ...Array(pCount - 2).fill("civilian")];
    } else if (mode === 4) { // Шпигун + Зрадник
      rolesArray = ["spy", "traitor", ...Array(pCount - 2).fill("civilian")];
    }

    rolesArray = shuffle(rolesArray);

    // Додаємо гаджети для режиму 2
    const finalRoles = rolesArray.map((r, idx) => {
      let gadget = null;
      if (mode === 2) {
        if (r === "spy") gadget = getRandom(SPY_GADGETS);
        else gadget = getRandom(GADGETS);
      }
      return {
        name: players[idx],
        type: r, // "spy", "civilian", "traitor"
        gadget
      };
    });

    setPlayerRoles(finalRoles);
    setCurrentPlayerIndex(0);
    setPhase("handoff");
  }

  function startTimerPhase() {
    setTimerSeconds(timerMinutes * 60);
    setTimerActive(true);
    setPhase("timer");
  }

  function stopTimer() {
    clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase("vote");
  }

  if (phase === "setup") return (
    <SetupScreen
      players={players} setPlayers={setPlayers}
      selectedCats={selectedCats} setSelectedCats={setSelectedCats}
      mode={mode} setMode={setMode}
      timerMinutes={timerMinutes} setTimerMinutes={setTimerMinutes}
      onStart={startGame}
    />
  );
  if (phase === "handoff") return (
    <HandoffScreen
      name={players[currentPlayerIndex]}
      onReady={() => setPhase("show_role")}
    />
  );
  if (phase === "show_role") {
    const isLast = currentPlayerIndex === players.length - 1;
    return (
      <RoleScreen
        playerData={playerRoles[currentPlayerIndex]}
        word={activeWord} categoryName={activeCategory.name} mode={mode}
        onNext={() => {
          if (isLast) setPhase("ready_to_start");
          else {
            setCurrentPlayerIndex(c => c + 1);
            setPhase("handoff");
          }
        }}
      />
    );
  }
  if (phase === "ready_to_start") return (
    <div style={{ textAlign: "center", paddingTop: 40, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ fontSize: "4rem" }}>⏱️</div>
      <h2 style={{ fontSize: "1.8rem" }}>Всі дізнались ролі!</h2>
      <p style={{ color: "var(--text2)" }}>Поверніть телефон у центр столу.</p>
      <button className="btn-primary" onClick={startTimerPhase} style={{ marginTop: 20, padding: 20, fontSize: "1.2rem", background: "linear-gradient(135deg, #7c3aed, #dc2626)" }}>
        🚀 СТАРТ ТАЙМЕРА
      </button>
    </div>
  );
  if (phase === "timer") return (
    <TimerScreen
      timerSeconds={timerSeconds} total={timerMinutes * 60}
      onStop={stopTimer} categories={CATEGORIES.filter(c => selectedCats.includes(c.id))}
    />
  );
  if (phase === "vote") return (
    <VoteScreen onResult={() => setPhase("result")} />
  );
  if (phase === "result") return (
    <ResultScreen
      playerRoles={playerRoles} word={activeWord} categoryName={activeCategory.name} mode={mode}
      onRestart={() => setPhase("setup")}
    />
  );

  return null;
}

// ─── SETUP ────────────────────────────────────────────────────────────────────

function SetupScreen({ players, setPlayers, selectedCats, setSelectedCats, mode, setMode, timerMinutes, setTimerMinutes, onStart }) {
  const [nameInput, setNameInput] = useState("");
  const [showModeInfo, setShowModeInfo] = useState(false);

  function addPlayer() {
    const name = nameInput.trim();
    if (!name || players.includes(name)) return;
    setPlayers([...players, name]);
    setNameInput("");
  }
  function removePlayer(name) {
    setPlayers(players.filter(p => p !== name));
  }
  function toggleCat(id) {
    if (selectedCats.includes(id)) {
      if (selectedCats.length > 1) setSelectedCats(selectedCats.filter(c => c !== id));
    } else {
      setSelectedCats([...selectedCats, id]);
    }
  }

  const minPlayersReq = mode === 3 || mode === 4 ? 4 : 3;
  const canStart = players.length >= minPlayersReq && selectedCats.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1c0533 0%, #0f0f13 100%)",
        border: "1px solid #4c1d82", borderRadius: "var(--radius)",
        padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>🕵️</div>
        <h1 style={{
          fontSize: "2rem", fontWeight: 900,
          background: "linear-gradient(90deg, #60a5fa, #c084fc)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 10, letterSpacing: "-0.02em",
        }}>ШПИГУН</h1>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Вгадай слово. Знайди зрадника. Не видай себе.
        </p>
      </div>

      {/* Гравці */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>👥 Гравці (мін. {minPlayersReq})</p>
          {players.length > 0 && <span style={{ fontSize: "0.7rem", color: "#60a5fa" }}>💾 {players.length} зб.</span>}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text" value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="Ім'я гравця..."
            maxLength={15}
            style={{
              flex: 1, background: "var(--bg3)",
              border: "1px solid #3d3d5c", borderRadius: "var(--radius-sm)",
              padding: "12px", color: "var(--text)", fontSize: "1rem", outline: "none"
            }}
          />
          <button onClick={addPlayer} disabled={!nameInput.trim()} style={{
            background: "var(--accent)", border: "none",
            borderRadius: "var(--radius-sm)", padding: "0 20px",
            color: "#fff", fontSize: "1.4rem", cursor: "pointer",
          }}>+</button>
        </div>
        {players.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {players.map((p) => (
              <div key={p} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--bg3)", borderRadius: 999, padding: "6px 12px",
              }}>
                <span style={{ fontSize: "0.85rem" }}>{p}</span>
                <button onClick={() => removePlayer(p)} style={{
                  background: "none", border: "none", color: "var(--text2)", cursor: "pointer"
                }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Режим */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>⚙️ Режим гри</p>
          <button onClick={() => setShowModeInfo(!showModeInfo)} style={{
            background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700
          }}>
            {showModeInfo ? "Сховати опис" : "Правила режимів?"}
          </button>
        </div>

        {showModeInfo && (
          <div style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: "1.5rem" }}>{MODE_INSTRUCTIONS[mode].icon}</span>
              <h3 style={{ color: MODE_INSTRUCTIONS[mode].color, margin: 0 }}>{MODE_INSTRUCTIONS[mode].title}</h3>
            </div>
            {MODE_INSTRUCTIONS[mode].sections.map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong style={{ color: "var(--text)", fontSize: "0.85rem", display: "block", marginBottom: 2 }}>{s.heading}:</strong>
                <span style={{ color: "var(--text2)", fontSize: "0.85rem", lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { id: 1, name: "Класика", icon: "🕵️" },
            { id: 2, name: "Агент+", icon: "🔧" },
            { id: 3, name: "Два шпигуни", icon: "👥" },
            { id: 4, name: "Зрадник", icon: "🤝" },
          ].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              background: mode === m.id ? "#3b82f6" : "var(--bg3)",
              border: `1px solid ${mode === m.id ? "#60a5fa" : "transparent"}`,
              borderRadius: "var(--radius-sm)", padding: "10px",
              color: mode === m.id ? "#fff" : "var(--text2)",
              fontSize: "0.85rem", cursor: "pointer", fontWeight: mode === m.id ? 700 : 400,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <span>{m.icon}</span> {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Категорії */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>📁 Категорії слів</p>
          <span style={{ fontSize: "0.7rem", color: "var(--text2)" }}>Вибрано: {selectedCats.length}</span>
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginBottom: 12 }}>
          Гравці отримають конкретне слово з однієї з обраних категорій.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedCats.includes(cat.id);
            return (
              <div key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                background: isSel ? "rgba(96,165,250,0.15)" : "var(--bg3)",
                border: `1px solid ${isSel ? "#3b82f6" : "transparent"}`,
                borderRadius: "var(--radius-sm)", padding: "12px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.2s"
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `2px solid ${isSel ? "#3b82f6" : "#4c4c6d"}`,
                  background: isSel ? "#3b82f6" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  {isSel && <span style={{ color: "#fff", fontSize: "14px" }}>✓</span>}
                </div>
                <span style={{ fontSize: "1.4rem" }}>{cat.emoji}</span>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: isSel ? "#fff" : "var(--text)", marginBottom: 2 }}>{cat.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{cat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Час */}
      <div style={card()}>
        <p style={lbl()}>⏱️ Час на обговорення</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[3, 5, 7, 10].map((m) => (
            <button key={m} onClick={() => setTimerMinutes(m)} style={{
              flex: 1, background: timerMinutes === m ? "#3b82f6" : "var(--bg3)",
              border: `1px solid ${timerMinutes === m ? "#60a5fa" : "transparent"}`,
              borderRadius: "var(--radius-sm)", padding: "12px 0",
              color: timerMinutes === m ? "#fff" : "var(--text2)",
              fontSize: "0.9rem", cursor: "pointer", fontWeight: timerMinutes === m ? 700 : 400,
            }}>{m} хв</button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={onStart} disabled={!canStart} style={{
        background: canStart ? "linear-gradient(135deg, #3b82f6, #8b5cf6)" : undefined,
        padding: "18px", fontSize: "1.1rem"
      }}>
        {canStart ? "В РОЗВІДКУ →" : `Потрібно мін. ${minPlayersReq} гравці`}
      </button>
    </div>
  );
}

// ─── HANDOFF ──────────────────────────────────────────────────────────────────

function HandoffScreen({ name, onReady }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "65vh", gap: 24, textAlign: "center"
    }}>
      <div style={{ fontSize: "3.5rem", animation: "pulse 2s infinite" }}>📱</div>
      <div>
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Передайте пристрій гравцю</p>
        <p style={{ fontSize: "2.5rem", fontWeight: 900, color: "#60a5fa" }}>{name}</p>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--text2)" }}>Інші не повинні підглядати!</p>
      <button className="btn-primary" onClick={onReady} style={{ background: "#3b82f6", maxWidth: 280 }}>
        Це я, показати роль →
      </button>
    </div>
  );
}

// ─── ПОКАЗ РОЛІ ───────────────────────────────────────────────────────────────

function RoleScreen({ playerData, word, categoryName, mode, onNext }) {
  const isSpy = playerData.type === "spy";
  const isTraitor = playerData.type === "traitor";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)" }}>Гравець</p>
        <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>{playerData.name}</p>
      </div>

      <div style={{
        background: isSpy ? "rgba(239,68,68,0.1)" : isTraitor ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
        border: `2px solid ${isSpy ? "#ef4444" : isTraitor ? "#f59e0b" : "#10b981"}`,
        borderRadius: "var(--radius)", padding: "24px", textAlign: "center"
      }}>
        {isSpy ? (
          <>
            <div style={{ fontSize: "4rem", marginBottom: 10 }}>🕵️</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ef4444", marginBottom: 10 }}>ТИ — ШПИГУН</h2>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "8px", border: "1px solid #4a4a4a", marginBottom: 20 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text2)", textTransform: "uppercase" }}>Категорія слова</p>
              <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444" }}>{categoryName}</p>
            </div>
            <p style={{ color: "var(--text2)", lineHeight: 1.5 }}>Твоя мета — зрозуміти про яке слово говорять інші гравці, і не видати себе.</p>
          </>
        ) : isTraitor ? (
          <>
            <div style={{ fontSize: "4rem", marginBottom: 10 }}>🤝</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f59e0b", marginBottom: 10 }}>ТИ — ЗРАДНИК</h2>
            <p style={{ color: "var(--text2)", lineHeight: 1.5, marginBottom: 20 }}>Ти допомагаєш Шпигуну, але ніхто не має здогадатись!</p>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "8px", border: "1px solid #4a4a4a" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text2)", textTransform: "uppercase" }}>Слово</p>
              <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f0eeff" }}>{word}</p>
              <p style={{ fontSize: "0.85rem", color: "#60a5fa", marginTop: 4 }}>Категорія: {categoryName}</p>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3.5rem", marginBottom: 10 }}>✅</div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981", marginBottom: 20 }}>Ти — Мирний Гравець</h2>
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "16px", borderRadius: "8px", border: "1px solid #4a4a4a" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text2)", textTransform: "uppercase" }}>Загадане слово</p>
              <p style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f0eeff" }}>{word}</p>
              <p style={{ fontSize: "0.9rem", color: "#60a5fa", marginTop: 4 }}>Категорія: {categoryName}</p>
            </div>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 20 }}>Задавай навідні питання, щоб знайти того, хто не знає цього слова.</p>
          </>
        )}
      </div>

      {playerData.gadget && (
        <div style={{
          background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.1))",
          border: "1px solid #06b6d4", borderRadius: "var(--radius)", padding: "16px"
        }}>
          <p style={{ fontSize: "0.75rem", color: "#22d3ee", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>Спецзавдання / Гаджет</p>
          <p style={{ fontSize: "0.95rem", color: "#f0eeff", lineHeight: 1.5 }}>{playerData.gadget}</p>
        </div>
      )}

      <button className="btn-secondary" onClick={onNext} style={{ marginTop: 10, padding: "18px", fontSize: "1.1rem" }}>
        Запам'ятав → Сховати
      </button>
    </div>
  );
}

// ─── ТАЙМЕР ───────────────────────────────────────────────────────────────────

function TimerScreen({ timerSeconds, total, onStop, categories }) {
  const pct = total > 0 ? timerSeconds / total : 0;
  const isUrgent = timerSeconds < 60 && timerSeconds > 0;
  const isDone = timerSeconds === 0;
  const tColor = isDone ? "#ef4444" : isUrgent ? "#f59e0b" : "#60a5fa";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        background: "var(--bg2)", border: `1px solid ${tColor}55`,
        borderRadius: "var(--radius)", padding: "24px 20px", textAlign: "center",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: 5, width: `${pct * 100}%`,
          background: tColor, transition: "width 1s linear"
        }} />
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          {isDone ? "ЧАС ВИЙШОВ" : "До кінця розмови"}
        </p>
        <p style={{
          fontSize: "4.5rem", fontWeight: 900, color: tColor, lineHeight: 1,
          fontVariantNumeric: "tabular-nums"
        }}>{formatTime(timerSeconds)}</p>
      </div>



      <button className="btn-secondary" onClick={onStop} style={{ borderColor: "#ef4444", color: "#ef4444", padding: 16 }}>
        {isDone ? "Перейти до голосування →" : "🛑 Зупинити достроково"}
      </button>
    </div>
  );
}

// ─── ГОЛОСУВАННЯ ──────────────────────────────────────────────────────────────

function VoteScreen({ onResult }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 10px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ fontSize: "4rem" }}>⚖️</div>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Голосування</h2>
      <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
        Обговоріть та проголосуйте одночасно (на рахунок 3 покажіть пальцем).<br /><br />
        Кого звинувачує більшість? Якщо це Шпигун — він має останній шанс вгадати Слово.
      </p>
      <button className="btn-primary" onClick={onResult} style={{ marginTop: 20, background: "linear-gradient(135deg, #f59e0b, #ef4444)", padding: 18 }}>
        Розкрити карти →
      </button>
    </div>
  );
}

// ─── РЕЗУЛЬТАТИ ───────────────────────────────────────────────────────────────

function ResultScreen({ playerRoles, word, categoryName, mode, onRestart }) {
  const spies = playerRoles.filter(p => p.type === "spy");
  const traitors = playerRoles.filter(p => p.type === "traitor");
  const civs = playerRoles.filter(p => p.type === "civilian");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 10 }}>РЕЗУЛЬТАТИ</h2>
      </div>

      <div style={{
        background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
        borderRadius: "var(--radius)", padding: "16px"
      }}>
        <p style={{ ...lbl("#ef4444"), marginBottom: 6 }}>Шпигуни 🕵️</p>
        <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fca5a5" }}>
          {spies.map(s => s.name).join(", ")}
        </p>
      </div>

      {traitors.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b",
          borderRadius: "var(--radius)", padding: "16px"
        }}>
          <p style={{ ...lbl("#f59e0b"), marginBottom: 6 }}>Зрадник 🤝</p>
          <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fcd34d" }}>
            {traitors.map(t => t.name).join(", ")}
          </p>
        </div>
      )}

      <div style={{
        background: "rgba(16,185,129,0.1)", border: "1px solid #10b981",
        borderRadius: "var(--radius)", padding: "16px"
      }}>
        <p style={{ ...lbl("#10b981"), marginBottom: 6 }}>Мирні (знали слово) ✅</p>
        <p style={{ fontSize: "1rem", color: "#a7f3d0" }}>
          {civs.map(c => c.name).join(", ")}
        </p>
      </div>

      <div style={card()}>
        <p style={lbl()}>Загадане слово було:</p>
        <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", marginBottom: 4 }}>{word}</p>
        <p style={{ fontSize: "0.85rem", color: "#60a5fa" }}>{categoryName}</p>
      </div>

      {mode === 2 && (
        <div style={card()}>
          <p style={lbl()}>🔧 Розсекречені Гаджети</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {playerRoles.map(p => p.gadget ? (
              <div key={p.name} style={{ background: "var(--bg3)", padding: 12, borderRadius: 8 }}>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text)" }}>{p.name} {p.type === "spy" ? "🕵️" : "✅"}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: 4 }}>{p.gadget}</p>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      <button className="btn-primary" onClick={onRestart} style={{ padding: 18, marginTop: 10 }}>
        Зіграти ще раз 🔄
      </button>
    </div>
  );
}
