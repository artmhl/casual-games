// src/games/who-am-i/index.jsx
import { useState, useEffect } from "react";

// ─── ЗБЕРЕЖЕННЯ ДАНИХ ─────────────────────────────────────────────────────────

const SS_KEY = "whoami_players_v1";
const SS_CATS_KEY = "whoami_cats_v1";

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
    return raw ? JSON.parse(raw) : ["animals", "professions", "objects"];
  } catch {
    return ["animals", "professions", "objects"];
  }
}

function saveCats(arr) {
  try {
    sessionStorage.setItem(SS_CATS_KEY, JSON.stringify(arr));
  } catch { }
}
// Завантаження даних

import { conditions as CONDITIONS, categories as CATEGORIES } from "./content.json";

// ─── ХЕЛПЕРИ ──────────────────────────────────────────────────────────────────

function getRandom(arr, exclude = null) {
  if (arr.length <= 1) return arr[0];
  let val = arr[Math.floor(Math.random() * arr.length)];
  let attempts = 0;
  while (val === exclude && attempts < 10) {
    val = arr[Math.floor(Math.random() * arr.length)];
    attempts++;
  }
  return val;
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

export default function WhoAmIGame() {
  const [phase, setPhase] = useState("setup");
  // phases: setup -> handoff -> forehead -> game -> debrief

  const [players, setPlayers] = useState(loadPlayers);
  const [selectedCats, setSelectedCats] = useState(loadCats);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [activeWord, setActiveWord] = useState(null);
  const [activeCategoryName, setActiveCategoryName] = useState("");
  const [activeCondition, setActiveCondition] = useState("");

  useEffect(() => savePlayers(players), [players]);
  useEffect(() => saveCats(selectedCats), [selectedCats]);

  function startRound() {
    // 1. Generate Word
    const pool = CATEGORIES.filter(c => selectedCats.includes(c.id));
    const randomCat = getRandom(pool);
    const randomWord = getRandom(randomCat.words, activeWord);

    // 2. Generate Condition
    const randomCondition = getRandom(CONDITIONS, activeCondition);

    setActiveCategoryName(randomCat.name);
    setActiveWord(randomWord);
    setActiveCondition(randomCondition);

    setPhase("handoff");
  }

  function nextPlayer() {
    const nextIdx = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIdx);

    const pool = CATEGORIES.filter(c => selectedCats.includes(c.id));
    const randomCat = getRandom(pool);
    const randomWord = getRandom(randomCat.words, activeWord);
    const randomCondition = getRandom(CONDITIONS, activeCondition);

    setActiveCategoryName(randomCat.name);
    setActiveWord(randomWord);
    setActiveCondition(randomCondition);

    setPhase("handoff");
  }

  function handleSetupComplete() {
    setCurrentPlayerIndex(0);
    startRound();
  }

  if (phase === "setup") return (
    <SetupScreen
      players={players} setPlayers={setPlayers}
      selectedCats={selectedCats} setSelectedCats={setSelectedCats}
      onStart={handleSetupComplete}
    />
  );
  if (phase === "handoff") return (
    <HandoffScreen
      name={players[currentPlayerIndex]}
      onReady={() => setPhase("forehead")}
    />
  );
  if (phase === "forehead") return (
    <ForeheadScreen
      name={players[currentPlayerIndex]}
      onReady={() => setPhase("game")}
    />
  );
  if (phase === "game") return (
    <GameScreen
      name={players[currentPlayerIndex]}
      word={activeWord}
      categoryName={activeCategoryName}
      condition={activeCondition}
      onFinish={() => setPhase("debrief")}
    />
  );
  if (phase === "debrief") return (
    <DebriefScreen
      name={players[currentPlayerIndex]}
      condition={activeCondition}
      word={activeWord}
      onNext={nextPlayer}
      onHome={() => setPhase("setup")}
    />
  );

  return null;
}

// ─── ЕКРАНИ ───────────────────────────────────────────────────────────────────

function SetupScreen({ players, setPlayers, selectedCats, setSelectedCats, onStart }) {
  const [nameInput, setNameInput] = useState("");

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

  const canStart = players.length >= 2 && selectedCats.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #2d001a 0%, #0f0f13 100%)",
        border: "1px solid #7a003f", borderRadius: "var(--radius)",
        padding: "24px 20px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>🪞</div>
        <h1 style={{
          fontSize: "2rem", fontWeight: 900,
          background: "linear-gradient(90deg, #ff4d4d, #ff9999)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 10, letterSpacing: "-0.02em",
        }}>ХТО Я</h1>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Вгадай слово в токсичному дзеркалі.
        </p>
      </div>

      {/* Гравці */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>👥 Гравці (мін. 2)</p>
          {players.length > 0 && <span style={{ fontSize: "0.7rem", color: "#ff4d4d" }}>💾 {players.length} зб.</span>}
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

      {/* Категорії */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>📁 Категорії слів</p>
          <span style={{ fontSize: "0.7rem", color: "var(--text2)" }}>Вибрано: {selectedCats.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedCats.includes(cat.id);
            return (
              <div key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                background: isSel ? "rgba(255, 77, 77, 0.15)" : "var(--bg3)",
                border: `1px solid ${isSel ? "#ff4d4d" : "transparent"}`,
                borderRadius: "var(--radius-sm)", padding: "12px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.2s"
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4,
                  border: `2px solid ${isSel ? "#ff4d4d" : "#4c4c6d"}`,
                  background: isSel ? "#ff4d4d" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  {isSel && <span style={{ color: "#fff", fontSize: "14px" }}>✓</span>}
                </div>
                <span style={{ fontSize: "1.4rem" }}>{cat.emoji}</span>
                <div>
                  <p style={{ fontSize: "0.95rem", fontWeight: 600, color: isSel ? "#fff" : "var(--text)" }}>{cat.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn-primary" onClick={onStart} disabled={!canStart} style={{
        background: canStart ? "linear-gradient(135deg, #ff4d4d, #cc0000)" : undefined,
        padding: "18px", fontSize: "1.1rem"
      }}>
        {canStart ? "ПОЧАТИ ГРУ →" : `Потрібно мін. 2 гравці`}
      </button>
    </div>
  );
}

function HandoffScreen({ name, onReady }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "65vh", gap: 24, textAlign: "center"
    }}>
      <div style={{ fontSize: "3.5rem", animation: "pulse 2s infinite" }}>📱</div>
      <div>
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Вгадує гравець:</p>
        <p style={{ fontSize: "2.5rem", fontWeight: 900, color: "#ff4d4d" }}>{name}</p>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--text2)", padding: "0 20px" }}>Передайте пристрій йому в руки, але щоб інші не бачили екран!</p>
      <button className="btn-primary" onClick={onReady} style={{ background: "#ff4d4d", maxWidth: 280 }}>
        Це я, готовий →
      </button>
    </div>
  );
}

function ForeheadScreen({ name, onReady }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "65vh", gap: 24, textAlign: "center"
    }}>
      <div style={{ fontSize: "4rem" }}>🤦‍♂️</div>
      <div>
        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginBottom: 10 }}>Приклади телефон до чола!</p>
        <p style={{ fontSize: "1rem", color: "var(--text2)", lineHeight: 1.5, padding: "0 20px" }}>
          Екраном до друзів! Ти не повинен бачити, що там написано.
        </p>
      </div>

      <div style={{ padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius)", marginTop: 20 }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: 10 }}>Друзі, коли ви будете бачити екран і готові, натисніть кнопку нижче!</p>
        <button className="btn-primary" onClick={onReady} style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
          Ми бачимо екран, ГОТОВО!
        </button>
      </div>
    </div>
  );
}

function GameScreen({ name, word, categoryName, condition, onFinish }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", textTransform: "uppercase" }}>Вгадує:</p>
        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ff4d4d" }}>{name}</p>
      </div>

      {/* Слово */}
      <div style={{
        background: "rgba(96,165,250,0.1)",
        border: "2px solid #3b82f6",
        borderRadius: "var(--radius)", padding: "30px 20px", textAlign: "center"
      }}>
        <p style={{ fontSize: "0.85rem", color: "#60a5fa", textTransform: "uppercase", fontWeight: 800, marginBottom: 8 }}>КАТЕГОРІЯ: {categoryName}</p>
        <p style={{ fontSize: "2.8rem", fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{word}</p>
      </div>

      {/* Умова */}
      <div style={{
        background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(185,28,28,0.1))",
        border: "2px solid #ef4444",
        borderRadius: "var(--radius)", padding: "24px 20px", textAlign: "center",
        boxShadow: "0 10px 25px -5px rgba(239,68,68,0.3)"
      }}>
        <p style={{ fontSize: "0.75rem", color: "#fca5a5", textTransform: "uppercase", fontWeight: 800, marginBottom: 12 }}>⚠️ ТОКСИЧНА УМОВА (ДЛЯ КОМПАНІЇ) ⚠️</p>
        <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>{condition}</p>
      </div>

      <div style={card({ textAlign: "center", background: "transparent", border: "none" })}>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.5 }}>
          Кандидат ставить питання. Ви маєте відповідати "Так" або "Ні", суворо дотримуючись умови вище!
        </p>
      </div>

      <button className="btn-primary" onClick={onFinish} style={{ marginTop: 10, padding: "20px", fontSize: "1.1rem", background: "var(--bg3)", color: "var(--text)" }}>
        Завершити раунд (Вгадав / Здався)
      </button>
    </div>
  );
}

function DebriefScreen({ name, condition, word, onNext, onHome }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 900, marginBottom: 10 }}>Раунд завершено!</h2>
      </div>

      {!revealed ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "1.2rem", color: "var(--text)", marginBottom: 30, lineHeight: 1.5 }}>
            <strong style={{ color: "#ff4d4d" }}>{name}</strong>, як думаєш, яку саме умову чи емоцію зараз відігравали твої друзі?
          </p>
          <button className="btn-primary" onClick={() => setRevealed(true)} style={{ background: "#ff4d4d", padding: 18 }}>
            Показати справжню умову 👁️
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.5s ease-out" }}>
          <div style={card({ textAlign: "center" })}>
            <p style={lbl()}>Ти мав вгадати слово:</p>
            <p style={{ fontSize: "2rem", fontWeight: 900, color: "#fff" }}>{word}</p>
          </div>

          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
            borderRadius: "var(--radius)", padding: "20px", textAlign: "center"
          }}>
            <p style={lbl("#ef4444")}>Друзі відігравали:</p>
            <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>{condition}</p>
          </div>

          <button className="btn-primary" onClick={onNext} style={{ marginTop: 20, padding: 18 }}>
            Наступний гравець ➔
          </button>
          <button className="btn-secondary" onClick={onHome} style={{ padding: 14 }}>
            Повернутися в меню
          </button>
        </div>
      )}
    </div>
  );
}
