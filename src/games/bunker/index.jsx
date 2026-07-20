// src/games/bunker/index.jsx
// Гра "Бункер" — Pass-and-Play для 3–5 гравців.
// Повністю автономна. Тільки React (useState, useEffect, useRef).

import { useState, useEffect, useRef } from "react";

// Завантаження даних

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

function generateRoles(playerNames) {
  const professions = pickUnique(PROFESSIONS, playerNames.length);
  const healths = pickUnique(HEALTH, playerNames.length);
  const phobias = pickUnique(PHOBIAS, playerNames.length);
  const backpacks = pickUnique(BACKPACK, playerNames.length);

  return playerNames.map((name, i) => ({
    name,
    profession: professions[i],
    health: healths[i],
    phobia: phobias[i],
    backpack: backpacks[i],
  }));
}

// ─── СХОВИЩЕ ─────────────────────────────────────────────────────────────────

const SS_KEY = "bunker_players_v1";

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

// ─── ЕКРАН НАЛАШТУВАННЯ ───────────────────────────────────────────────────────

function Setup({ onStart }) {
  const [players, setPlayers] = useState(() => loadPlayers());
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  function addPlayer() {
    const name = input.trim();
    if (!name || players.length >= 5) return;
    const updated = [...players, name];
    setPlayers(updated);
    savePlayers(updated);
    setInput("");
    inputRef.current?.focus();
  }

  function removePlayer(idx) {
    const updated = players.filter((_, i) => i !== idx);
    setPlayers(updated);
    savePlayers(updated);
  }

  function handleKey(e) {
    if (e.key === "Enter") addPlayer();
  }

  const canStart = players.length >= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Заголовок */}
      <div
        style={{
          textAlign: "center",
          background: "linear-gradient(135deg, rgba(124, 106, 247, 0.12), rgba(26, 26, 36, 0.8))",
          border: "1px solid rgba(124, 106, 247, 0.3)",
          borderRadius: "var(--radius)",
          padding: "32px 20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Декоративні елементи на фоні */}
        <div style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "100px",
          height: "100px",
          background: "var(--accent)",
          filter: "blur(60px)",
          opacity: 0.3,
          borderRadius: "50%",
        }} />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--bg3), var(--bg2))",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "2.5rem",
            marginBottom: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            transform: "rotate(-5deg)",
          }}
        >
          🏚️
        </div>

        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 800,
            letterSpacing: "0.2em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Симулятор виживання
        </div>

        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: 900,
            background: "linear-gradient(180deg, #ffffff 0%, var(--accent2) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 10px rgba(124, 106, 247, 0.2)",
            margin: 0,
          }}
        >
          БУНКЕР
        </h1>

        <div style={{
          display: "inline-block",
          marginTop: 12,
          padding: "4px 12px",
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 999,
        }}>
          <p style={{ color: "var(--text2)", fontSize: "0.85rem", fontWeight: 600 }}>
            3–5 гравців <span style={{ color: "var(--bg3)", margin: "0 4px" }}>|</span> Pass &amp; Play
          </p>
        </div>
      </div>

      {/* Список гравців */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--bg3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Гравці</span>
          <span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
            {players.length}/5
          </span>
        </div>

        {players.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--text2)",
              fontSize: "0.9rem",
            }}
          >
            Додай мінімум 3 гравців 👇
          </div>
        )}

        {players.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom:
                i < players.length - 1 ? "1px solid var(--bg3)" : "none",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1, fontWeight: 600 }}>{p}</span>
            <button
              onClick={() => removePlayer(i)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text2)",
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Поле вводу */}
      {players.length < 5 && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ім'я гравця ${players.length + 1}`}
            maxLength={20}
            style={{
              flex: 1,
              background: "var(--bg2)",
              border: "1px solid var(--bg3)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              fontSize: "1rem",
              padding: "14px 16px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={addPlayer}
            disabled={!input.trim()}
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius)",
              background: input.trim() ? "var(--accent)" : "var(--bg3)",
              border: "none",
              color: "#fff",
              fontSize: "1.6rem",
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s",
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Кнопка старт */}
      <button
        className="btn-primary"
        onClick={() => onStart(players)}
        disabled={!canStart}
        style={{ fontSize: "1.1rem", padding: "16px" }}
      >
        {canStart
          ? `🚀 Почати гру (${players.length} гравців)`
          : `Потрібно ще ${3 - players.length} гравець${3 - players.length > 1 ? "ів" : ""}`}
      </button>
    </div>
  );
}

// ─── ЕКРАН КАТАСТРОФИ ─────────────────────────────────────────────────────────

function Catastrophe({ catastrophe, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#ef4444,#f97316)",
            fontSize: "2rem",
            marginBottom: 16,
            boxShadow: "0 0 40px rgba(239,68,68,0.4)",
          }}
        >
          {catastrophe.emoji}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f87171",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          ⚠ Катастрофа
        </div>
        <h2
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          {catastrophe.title}
        </h2>
      </div>

      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "var(--text)",
          }}
        >
          {catastrophe.desc}
        </p>
      </div>

      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 16,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>🏚️</div>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Єдина надія людства — бункер. Але місць обмаль. Хто достоїн вижити?
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={onNext}
        style={{ fontSize: "1.05rem" }}
      >
        Розподілити ролі →
      </button>
    </div>
  );
}

// ─── ЕКРАН КАРТКИ ГРАВЦЯ ─────────────────────────────────────────────────────

// step: "locked" → "revealed"
function RoleCard({ role, onDone }) {
  const [step, setStep] = useState("locked");

  const rows = [
    { icon: "💼", label: "Професія", value: role.profession },
    { icon: "🩺", label: "Здоров'я", value: role.health },
    { icon: "😱", label: "Особливість", value: role.phobia },
    { icon: "🎒", label: "У рюкзаку", value: role.backpack },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* КРОК 1: Вікно передачі — тільки гравець бачить (закрита картка) */}
      {step === "locked" && (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📱</div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--accent2)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Передайте телефон
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              {role.name}
            </h2>
            <p
              style={{
                color: "var(--text2)",
                fontSize: "0.9rem",
                marginTop: 8,
              }}
            >
              Тільки цей гравець повинен бачити екран
            </p>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius)",
              border: "2px dashed var(--bg3)",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
            <p style={{ color: "var(--text2)", fontSize: "0.95rem" }}>
              Картка закрита. Переконайся, що інші не дивляться.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setStep("revealed")}
            style={{ fontSize: "1.05rem" }}
          >
            Це я, показати роль 👁
          </button>
        </>
      )}
      {step === "revealed" && (
        <>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg,var(--accent),var(--accent2))",
                borderRadius: "50%",
                width: 56,
                height: 56,
                lineHeight: "56px",
                fontSize: "1.5rem",
                marginBottom: 10,
                boxShadow: "0 0 30px rgba(124,106,247,0.5)",
              }}
            >
              🎭
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {role.name}, це ти!
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 4 }}>
              Запам'ятай свою роль і сховай телефон
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {rows.map((r) => (
              <div
                key={r.label}
                style={{
                  background: "var(--bg2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--bg3)",
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 1 }}>
                  {r.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "var(--accent2)",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    {r.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.97rem", lineHeight: 1.4 }}>
                    {r.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-secondary"
            onClick={onDone}
            style={{ fontSize: "1.05rem" }}
          >
            Зрозумів, сховати роль 🙈
          </button>
        </>
      )}
    </div>
  );

}

// ─── ЕКРАН РОЗПОДІЛУ РОЛЕЙ ────────────────────────────────────────────────────

function RoleDistribution({ roles, onDone }) {
  const [idx, setIdx] = useState(0);

  function handleDone() {
    if (idx < roles.length - 1) {
      setIdx(idx + 1);
    } else {
      onDone();
    }
  }

  const progress = ((idx + 1) / roles.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Прогрес */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          <span>Отримання ролей</span>
          <span>
            {idx + 1} / {roles.length}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg,var(--accent),var(--accent2))",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <RoleCard key={idx} role={roles[idx]} onDone={handleDone} />
    </div>
  );
}

// ─── ЕКРАН ОБГОВОРЕННЯ ────────────────────────────────────────────────────────

function Discussion({ players, onVote }) {
  const DISCUSSION_SECS = 5 * 60;
  const [timerDone, setTimerDone] = useState(false);
  const bunkerSpots = players.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>💬</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>
          Обговорення
        </h2>
        <p style={{ color: "var(--text2)", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Обговоріть, хто найменш корисний для виживання у бункері
        </p>
      </div>

      {/* Лічильник місць */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(124,106,247,0.4)",
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: 6 }}>
          Місць у бункері
        </div>
        <div
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            color: "var(--accent2)",
            lineHeight: 1,
          }}
        >
          {bunkerSpots}
        </div>
        <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 6 }}>
          з {players.length} гравців — 1 буде вигнаний
        </div>
      </div>

      {/* Таймер */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 24,
        }}
      >
        <Timer seconds={DISCUSSION_SECS} onEnd={() => setTimerDone(true)} />
        {timerDone && (
          <p
            style={{
              textAlign: "center",
              marginTop: 12,
              color: "#f87171",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            ⏰ Час вийшов! Переходьте до голосування.
          </p>
        )}
      </div>

      {/* Підказки обговорення */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          🤔 Питання для обговорення
        </div>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            "Чия професія найкорисніша?",
            "У кого найгірший стан здоров'я?",
            "Чия особливість найнебезпечніша?",
            "Що є у рюкзаку, що може допомогти?",
          ].map((q) => (
            <li
              key={q}
              style={{
                fontSize: "0.9rem",
                color: "var(--text2)",
                paddingLeft: 12,
                borderLeft: "2px solid var(--bg3)",
                lineHeight: 1.4,
              }}
            >
              {q}
            </li>
          ))}
        </ul>
      </div>

      <button
        className="btn-primary"
        onClick={onVote}
        style={{ fontSize: "1.05rem" }}
      >
        🗳️ Перейти до голосування
      </button>
    </div>
  );
}

// ─── ЕКРАН ГОЛОСУВАННЯ ────────────────────────────────────────────────────────

function Voting({ players, onDone }) {
  const [voterIdx, setVoterIdx] = useState(0);
  const [votes, setVotes] = useState({});
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const voter = players[voterIdx];
  const others = players.filter((p) => p !== voter);

  function handleVote() {
    if (!chosen) return;
    const newVotes = { ...votes, [voter]: chosen };
    setVotes(newVotes);

    if (voterIdx < players.length - 1) {
      setVoterIdx(voterIdx + 1);
      setChosen(null);
      setConfirmed(false);
    } else {
      onDone(newVotes);
    }
  }

  const progress = (voterIdx / players.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Прогрес */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          <span>Таємне голосування</span>
          <span>
            {voterIdx + 1} / {players.length}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg,#f97316,#ef4444)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Заглушка передачі */}
      {!confirmed && (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🗳️</div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#f97316",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Передайте телефон
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              {voter}
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginTop: 8 }}>
              Голосуй таємно. Інші не повинні бачити твій вибір.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius)",
              border: "2px dashed var(--bg3)",
              padding: 28,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔒</div>
            <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
              Переконайся, що ніхто не дивиться, і натисни кнопку нижче.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setConfirmed(true)}
            style={{ fontSize: "1.05rem" }}
          >
            Це я, готовий голосувати 🗳️
          </button>
        </>
      )}

      {/* Вибір */}
      {confirmed && (
        <>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 6 }}>
              {voter}, обери кого вигнати
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
              Тільки твій голос. Ніхто не побачить.
            </p>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {others.map((p) => {
              const selected = chosen === p;
              return (
                <button
                  key={p}
                  onClick={() => setChosen(p)}
                  style={{
                    background: selected
                      ? "linear-gradient(135deg,#ef4444,#f97316)"
                      : "var(--bg2)",
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
                    transition: "all 0.2s",
                    transform: selected ? "scale(1.01)" : "scale(1)",
                    boxShadow: selected
                      ? "0 4px 20px rgba(239,68,68,0.35)"
                      : "none",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>
                    {selected ? "💀" : "👤"}
                  </span>
                  <span>{p}</span>
                  {selected && (
                    <span style={{ marginLeft: "auto", fontSize: "0.8rem" }}>
                      ВИГНАТИ
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="btn-primary"
            onClick={handleVote}
            disabled={!chosen}
            style={{ fontSize: "1.05rem", marginTop: 4 }}
          >
            {voterIdx < players.length - 1
              ? "Підтвердити голос →"
              : "Завершити голосування ✓"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── ЕКРАН РЕЗУЛЬТАТІВ ────────────────────────────────────────────────────────

function Results({ votes, players, roles, onRestart }) {
  // Підрахунок голосів
  const tally = {};
  players.forEach((p) => (tally[p] = 0));
  Object.values(votes).forEach((voted) => {
    if (tally[voted] !== undefined) tally[voted]++;
  });

  // Максимальна кількість голосів
  const maxVotes = Math.max(...Object.values(tally));

  // Кандидати на вигнання (ті, хто набрав максимум)
  const candidates = players.filter((p) => tally[p] === maxVotes);

  // Якщо нічия — випадковий з лідерів
  const ejected =
    candidates.length === 1
      ? candidates[0]
      : candidates[Math.floor(Math.random() * candidates.length)];

  const ejectedRole = roles.find((r) => r.name === ejected);
  const survivors = players.filter((p) => p !== ejected);

  const sorted = [...players].sort((a, b) => tally[b] - tally[a]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Заголовок */}
      <div
        style={{
          textAlign: "center",
          background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.15))",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: "28px 20px",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>☠️</div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f87171",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Рішення прийнято
        </div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.2 }}>
          {ejected} вигнаний
          <br />з бункера!
        </h2>
        {candidates.length > 1 && (
          <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 8 }}>
            ⚖️ Нічия — Вигнаний з бункера випадково
          </p>
        )}
      </div>

      {/* Картка вигнаного */}
      {ejectedRole && (
        <div
          style={{
            background: "var(--bg2)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--bg3)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#f87171",
            }}
          >
            🃏 Картка вигнаного
          </div>
          {[
            { icon: "💼", label: "Професія", value: ejectedRole.profession },
            { icon: "🩺", label: "Здоров'я", value: ejectedRole.health },
            { icon: "😱", label: "Особливість", value: ejectedRole.phobia },
            { icon: "🎒", label: "У рюкзаку", value: ejectedRole.backpack },
          ].map((r, i, arr) => (
            <div
              key={r.label}
              style={{
                padding: "12px 16px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--bg3)" : "none",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{r.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {r.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Результати голосування */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--bg3)",
            fontWeight: 700,
            fontSize: "0.9rem",
          }}
        >
          🗳️ Результати голосування
        </div>
        {sorted.map((p, i) => {
          const v = tally[p];
          const pct = players.length > 0 ? (v / players.length) * 100 : 0;
          const isEjected = p === ejected;
          return (
            <div
              key={p}
              style={{
                padding: "12px 16px",
                borderBottom:
                  i < sorted.length - 1 ? "1px solid var(--bg3)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  flex: 1,
                  color: isEjected ? "#f87171" : "var(--text)",
                }}
              >
                {isEjected ? "☠️ " : ""}{p}
              </span>
              <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
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
                      background: isEjected
                        ? "linear-gradient(90deg,#ef4444,#f97316)"
                        : "linear-gradient(90deg,var(--accent),var(--accent2))",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: isEjected ? "#f87171" : "var(--text2)",
                    minWidth: 24,
                    textAlign: "right",
                  }}
                >
                  {v}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ті, хто в бункері */}
      <div
        style={{
          background: "linear-gradient(135deg,rgba(124,106,247,0.12),rgba(167,139,250,0.08))",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(124,106,247,0.3)",
          padding: "20px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🏚️</div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          У бункері виживають
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {survivors.map((p) => (
            <span
              key={p}
              style={{
                background: "var(--bg3)",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--accent2)",
              }}
            >
              ✓ {p}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onRestart}
        style={{ fontSize: "1.05rem" }}
      >
        🔄 Грати ще раз
      </button>
    </div>
  );
}

// ─── ГОЛОВНИЙ КОМПОНЕНТ ───────────────────────────────────────────────────────

export default function BunkerGame() {
  const [phase, setPhase] = useState("setup");
  // "setup" | "catastrophe" | "roles" | "discussion" | "voting" | "results"

  const [players, setPlayers] = useState([]);
  const [catastrophe, setCatastrophe] = useState(null);
  const [roles, setRoles] = useState([]);
  const [votes, setVotes] = useState({});

  function handleStart(playerNames) {
    const cat = pickRandom(CATASTROPHES);
    const roleList = generateRoles(playerNames);
    setPlayers(playerNames);
    setCatastrophe(cat);
    setRoles(roleList);
    setVotes({});
    setPhase("catastrophe");
  }

  function handleRestart() {
    setPhase("setup");
    setPlayers([]);
    setCatastrophe(null);
    setRoles([]);
    setVotes({});
  }

  function handleVotingDone(finalVotes) {
    setVotes(finalVotes);
    setPhase("results");
  }

  return (
    <>
      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Індикатор фази */}
        {phase !== "setup" && (
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            {["catastrophe", "roles", "discussion", "voting", "results"].map(
              (p) => {
                const phases = ["catastrophe", "roles", "discussion", "voting", "results"];
                const currentIdx = phases.indexOf(phase);
                const pIdx = phases.indexOf(p);
                const done = pIdx < currentIdx;
                const active = pIdx === currentIdx;
                return (
                  <div
                    key={p}
                    style={{
                      height: 4,
                      flex: 1,
                      maxWidth: 48,
                      borderRadius: 999,
                      background: active
                        ? "var(--accent)"
                        : done
                          ? "var(--accent2)"
                          : "var(--bg3)",
                      transition: "background 0.3s",
                      opacity: done ? 0.5 : 1,
                    }}
                  />
                );
              }
            )}
          </div>
        )}

        {phase === "setup" && <Setup onStart={handleStart} />}

        {phase === "catastrophe" && catastrophe && (
          <Catastrophe
            catastrophe={catastrophe}
            onNext={() => setPhase("roles")}
          />
        )}

        {phase === "roles" && (
          <RoleDistribution
            roles={roles}
            onDone={() => setPhase("discussion")}
          />
        )}

        {phase === "discussion" && (
          <Discussion players={players} onVote={() => setPhase("voting")} />
        )}

        {phase === "voting" && (
          <Voting players={players} onDone={handleVotingDone} />
        )}

        {phase === "results" && (
          <Results
            votes={votes}
            players={players}
            roles={roles}
            onRestart={handleRestart}
          />
        )}
      </div>
    </>
  );
}
