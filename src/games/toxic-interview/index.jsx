// src/games/toxic-interview/index.jsx
// Гра "Токсичне Інтерв'ю" — pass-and-play: реєстрація → ролі → передача → таймер → дебрифінг
// Повністю автономна. Тільки React + sessionStorage для збереження імен.

import { useState, useEffect, useRef } from "react";

// ─── ЗБЕРЕЖЕННЯ ІМЕН ──────────────────────────────────────────────────────────

const SS_KEY = "toxic_interview_players";

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

// Завантаження данних

import content from "./content.json";

const CANDIDATE_FLAWS = content.candidateFlaws;
const VACANCY_CARDS = content.vacancyCards;
const STARTER_QUESTIONS = content.starterQuestions;

// ─── САРКАСТИЧНІ ВЕРДИКТИ ─────────────────────────────────────────────────────

const SARCASM = [
  (name) => `Ідеальний збіг! ${name} — саме та людина, яку шукають на цій посаді. Корпорація в захваті. Пацієнти — ні.`,
  (name) => `Якщо б кадровий відділ знав правду, вони б закрили компанію превентивно. Але тепер пізно.`,
  (name) => `Технічно, ${name} пройшов(ла) співбесіду. Технічно. Решта — справа юристів і страхової.`,
  (name) => `Це або найкращий кандидат, або людина яка знищить компанію зсередини. Різниця мінімальна.`,
  (name) => `З таким бекграундом — і на таку вакансію? Або геній, або катастрофа. Дізнаємось на першому тижні.`,
  (name) => `HR-відділ офіційно капітулює. ${name} взятий(а). Воля Всесвіту така. Адвокати безсилі.`,
  (name) => `Ми вважаємо, що це призначення — дар Богів. Або ознака кінця часів. Скоріш за все — і те, і інше.`,
  (name) => `${name} показав(ла) нам рівень некомпетентності, що вселяє справжнє захоплення. Наймаємо. Деваль нас.`,
  (name) => `Ця людина або геніально замаскований злочинець, або просто... особлива. HR-відділ обирає не знати різниці.`,
  (name) => `За результатами співбесіди, ${name} є найбільш унікальним(ою) кандидатом за останні роки. Ми просимо їх ніколи більше не приходити. Але беремо.`,
  (name) => `Після цієї співбесіди HR-відділ тихо написав заяву на звільнення. Вакансія відтепер зайнята — і тими, і іншими.`,
  (name) => `Корпорація раді оголосити що ${name} прийнятий(а). Страховий поліс підписано. Евакуаційний план оновлено.`,
];

// ─── ХЕЛПЕРИ ──────────────────────────────────────────────────────────────────

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ":" + s.toString().padStart(2, "0");
}

// Мікро-стилі
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

export default function ToxicInterview() {
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState(loadPlayers);
  const [candidate, setCandidate] = useState(() => {
    const saved = loadPlayers();
    return saved[0] || "";
  });
  const [interviewMinutes, setInterviewMinutes] = useState(4);
  const [flaw, setFlaw] = useState(null);
  const [vacancy, setVacancy] = useState(null);
  const [starterQ, setStarterQ] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerTotal, setTimerTotal] = useState(0);
  const timerRef = useRef(null);

  // Синхронізуємо список гравців з sessionStorage
  useEffect(() => {
    savePlayers(players);
  }, [players]);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => {
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

  function startGame() {
    setFlaw(getRandom(CANDIDATE_FLAWS));
    setVacancy(getRandom(VACANCY_CARDS));
    setStarterQ(getRandom(STARTER_QUESTIONS));
    setPhase("handoff_candidate");
  }

  function startInterview() {
    const secs = interviewMinutes * 60;
    setTimerSeconds(secs);
    setTimerTotal(secs);
    setTimerActive(true);
    setPhase("interview");
  }

  function stopInterview() {
    clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase("debrief");
  }

  const hrNames = players.filter((p) => p !== candidate);

  if (phase === "setup") return (
    <SetupScreen
      players={players} setPlayers={setPlayers}
      candidate={candidate} setCandidate={setCandidate}
      interviewMinutes={interviewMinutes} setInterviewMinutes={setInterviewMinutes}
      onStart={startGame}
    />
  );
  if (phase === "handoff_candidate") return (
    <HandoffScreen
      emoji="🎯" accent="#a855f7"
      bigText="ПЕРЕДАЙТЕ ТЕЛЕФОН" subText="КАНДИДАТУ"
      name={candidate}
      actionText="Готовий / Готова →"
      onAction={() => setPhase("candidate_read")}
      hint="Решта гравців — відвернись або заплюй очі. Серйозно."
    />
  );
  if (phase === "candidate_read") return <CandidateScreen flaw={flaw} onDone={() => setPhase("handoff_hr")} />;
  if (phase === "handoff_hr") return (
    <HandoffScreen
      emoji="💼" accent="#06b6d4"
      bigText="ПЕРЕДАЙТЕ ТЕЛЕФОН" subText="HR-ВІДДІЛУ"
      name={hrNames.join(", ")}
      actionText="Готові →"
      onAction={() => setPhase("hr_read")}
      hint={`${candidate} — не підглядай! Або підглядай — але потім не скаржся.`}
    />
  );
  if (phase === "hr_read") return <HRScreen vacancy={vacancy} onStart={startInterview} />;
  if (phase === "interview") return (
    <InterviewScreen
      candidate={candidate} hrNames={hrNames}
      timerSeconds={timerSeconds} timerTotal={timerTotal}
      interviewMinutes={interviewMinutes}
      starterQ={starterQ} onStop={stopInterview}
    />
  );
  if (phase === "debrief") return <DebriefScreen candidate={candidate} hrNames={hrNames} onReveal={() => setPhase("reveal")} />;
  if (phase === "reveal") return (
    <RevealScreen
      flaw={flaw} vacancy={vacancy} candidate={candidate}
      onRestart={() => { setPhase("setup"); setFlaw(null); setVacancy(null); }}
    />
  );
  return null;
}

// ─── SETUP ────────────────────────────────────────────────────────────────────

function SetupScreen({ players, setPlayers, candidate, setCandidate, interviewMinutes, setInterviewMinutes, onStart }) {
  const [nameInput, setNameInput] = useState("");

  function addPlayer() {
    const name = nameInput.trim();
    if (!name || players.includes(name)) return;
    const next = [...players, name];
    setPlayers(next);
    setNameInput("");
    if (!candidate) setCandidate(name);
  }

  function removePlayer(name) {
    const next = players.filter((p) => p !== name);
    setPlayers(next);
    if (candidate === name) setCandidate(next[0] || "");
  }

  const canStart = players.length >= 3 && candidate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #1c0533 0%, #0f0f13 100%)",
        border: "1px solid #4c1d82", borderRadius: "var(--radius)",
        padding: "28px 20px 24px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ fontSize: "2.8rem", marginBottom: 10 }}>☠️💼</div>
        <h1 style={{
          fontSize: "1.7rem", fontWeight: 900,
          background: "linear-gradient(90deg, #f59e0b, #ef4444, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text", marginBottom: 10, letterSpacing: "-0.02em",
        }}>ТОКСИЧНЕ ІНТЕРВ'Ю</h1>
        <p style={{ color: "var(--text2)", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Вітаю, смертники. Ви прийшли влаштовуватись на роботу.<br />
          Корпорація задоволена. Хтось із вас навіть виживе.
        </p>
      </div>

      {/* Правила */}
      <div style={card()}>
        <p style={lbl("#f59e0b")}>📋 Суть гри</p>
        {[
          ["🎭", "Кандидат", "має таємну ваду — намагається приховати"],
          ["💼", "HR-ці", "знають вакансію — допитують без жалю"],
          ["🕵️", "Після гри", "всі вгадують роль одне одного"],
          ["😈", "Мета", "максимум незручних моментів і регіт"],
        ].map(([icon, bold, text]) => (
          <div key={bold} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>{icon}</span>
            <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.4 }}>
              <strong style={{ color: "var(--text)" }}>{bold}</strong> — {text}
            </p>
          </div>
        ))}
      </div>

      {/* Гравці */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...lbl(), marginBottom: 0 }}>👥 Гравці (мін. 3)</p>
          {players.length > 0 && (
            <span style={{ fontSize: "0.7rem", color: "#a855f7" }}>
              💾 {players.length} збережено
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text" value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="Ім'я гравця..."
            maxLength={20}
            style={{
              flex: 1, background: "var(--bg3)",
              border: "1px solid #3d3d5c", borderRadius: "var(--radius-sm)",
              padding: "12px 14px", color: "var(--text)", fontSize: "1rem",
              outline: "none", fontFamily: "var(--font)",
            }}
          />
          <button onClick={addPlayer} disabled={!nameInput.trim()} style={{
            background: "var(--accent)", border: "none",
            borderRadius: "var(--radius-sm)", padding: "12px 18px",
            color: "#fff", fontSize: "1.3rem", cursor: "pointer", flexShrink: 0,
          }}>+</button>
        </div>
        {players.length > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {players.map((p) => (
                <div key={p} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: candidate === p ? "rgba(168,85,247,0.2)" : "var(--bg3)",
                  border: `1px solid ${candidate === p ? "#a855f7" : "transparent"}`,
                  borderRadius: 999, padding: "6px 12px",
                }}>
                  <span style={{ fontSize: "0.85rem", color: candidate === p ? "#c084fc" : "var(--text)" }}>{p}</span>
                  {candidate === p && <span style={{ fontSize: "0.6rem", color: "#c084fc", fontWeight: 700 }}>КАН.</span>}
                  <button onClick={() => removePlayer(p)} style={{
                    background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: "0.9rem",
                  }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setPlayers([]); setCandidate(""); }} style={{
              marginTop: 10, background: "none", border: "none",
              color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", padding: 0,
            }}>
              🗑️ Очистити список гравців
            </button>
          </>
        )}
      </div>

      {/* Кандидат */}
      {players.length >= 2 && (
        <div style={card()}>
          <p style={lbl()}>🎯 Хто сьогодні страждає як кандидат?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {players.map((p) => (
              <button key={p} onClick={() => setCandidate(p)} style={{
                background: candidate === p ? "#a855f7" : "var(--bg3)",
                border: `1px solid ${candidate === p ? "#a855f7" : "transparent"}`,
                borderRadius: 999, padding: "10px 18px",
                color: candidate === p ? "#fff" : "var(--text2)",
                fontSize: "0.9rem", cursor: "pointer",
                fontWeight: candidate === p ? 700 : 400,
                transition: "all 0.15s",
              }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* Час */}
      <div style={card()}>
        <p style={lbl()}>⏱️ Час на допит</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[2, 3, 4, 5, 7].map((m) => (
            <button key={m} onClick={() => setInterviewMinutes(m)} style={{
              flex: 1, background: interviewMinutes === m ? "#a855f7" : "var(--bg3)",
              border: `1px solid ${interviewMinutes === m ? "#a855f7" : "transparent"}`,
              borderRadius: "var(--radius-sm)", padding: "12px 0",
              color: interviewMinutes === m ? "#fff" : "var(--text2)",
              fontSize: "0.9rem", cursor: "pointer",
              fontWeight: interviewMinutes === m ? 700 : 400,
              transition: "all 0.15s",
            }}>{m}хв</button>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={onStart} disabled={!canStart} style={{
        background: canStart ? "linear-gradient(135deg, #7c3aed, #dc2626)" : undefined,
        fontSize: "1.1rem", padding: "18px", fontWeight: 800,
      }}>
        {canStart ? "🔥 ПОЧАТИ ПЕКЛО" : `Потрібно мін. 3 смертники (є: ${players.length})`}
      </button>
    </div>
  );
}

// ─── HANDOFF ──────────────────────────────────────────────────────────────────

function HandoffScreen({ emoji, accent, bigText, subText, name, actionText, onAction, hint }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "72vh", gap: 24, textAlign: "center",
    }}>
      <div style={{
        background: accent + "22", border: `2px solid ${accent}`,
        borderRadius: "50%", width: 90, height: 90,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "2.5rem", animation: "pulse 1.5s ease-in-out infinite",
      }}>{emoji}</div>
      <div>
        <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text2)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{bigText}</p>
        <p style={{ fontSize: "0.75rem", color: "var(--text2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{subText}</p>
        <p style={{ fontSize: "2.2rem", fontWeight: 900, color: accent, letterSpacing: "-0.02em" }}>{name}</p>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text2)", maxWidth: 280, fontStyle: "italic" }}>{hint}</p>
      <button className="btn-primary" onClick={onAction} style={{ background: accent, maxWidth: 300 }}>
        {actionText}
      </button>
    </div>
  );
}

// ─── КАНДИДАТ ─────────────────────────────────────────────────────────────────

function CandidateScreen({ flaw, onDone }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        background: "linear-gradient(135deg, #1f0a2e, #0f0f13)",
        border: "1px solid #7c1faf", borderRadius: "var(--radius)", padding: "20px",
      }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: "1.6rem" }}>🔬</span>
          <div>
            <p style={lbl("#f59e0b")}>Твій діагноз — ЛИШЕ ДЛЯ ТЕБЕ</p>
            <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f0eeff" }}>{flaw?.title}</p>
          </div>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: 16 }}>
          {flaw?.description}
        </p>
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "var(--radius-sm)", padding: "14px",
        }}>
          <p style={lbl("#ef4444")}>💡 Як це проявляти</p>
          {flaw?.tips.map((tip, i) => (
            <p key={i} style={{ fontSize: "0.83rem", color: "var(--text2)", lineHeight: 1.5, marginBottom: i < flaw.tips.length - 1 ? 7 : 0 }}>
              • {tip}
            </p>
          ))}
        </div>
      </div>
      <div style={card({ padding: "14px 16px" })}>
        <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.5 }}>
          ⚠️ <strong style={{ color: "var(--text)" }}>Правило:</strong> Нехай вада <em>проявляється</em> у поведінці, але не називай її прямо. HR-ці мають здогадатись самі.
        </p>
      </div>
      {!confirmed ? (
        <button className="btn-primary" onClick={() => setConfirmed(true)}
          style={{ background: "linear-gradient(135deg, #7c1f7c, #ef4444)" }}>
          Я все зрозумів(ла). Я готовий(а) страждати. 😈
        </button>
      ) : (
        <button className="btn-secondary" onClick={onDone} style={{ borderColor: "#ef4444", color: "#ef4444" }}>
          🙈 Очистити екран → передати HR-цям
        </button>
      )}
    </div>
  );
}

// ─── HR ───────────────────────────────────────────────────────────────────────

function HRScreen({ vacancy, onStart }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        background: "linear-gradient(135deg, #0a1f3a, #0f0f13)",
        border: "1px solid #1f5f9d", borderRadius: "var(--radius)", padding: "20px",
      }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: "1.6rem" }}>📋</span>
          <div>
            <p style={lbl("#06b6d4")}>Вакансія — СЕКРЕТНО від кандидата</p>
            <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "#f0eeff" }}>{vacancy?.title}</p>
            <p style={{ fontSize: "0.75rem", color: "#22d3ee", marginTop: 3 }}>{vacancy?.company}</p>
          </div>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.65, marginBottom: 16 }}>
          {vacancy?.description}
        </p>
        <div style={{
          background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)",
          borderRadius: "var(--radius-sm)", padding: "14px",
        }}>
          <p style={lbl("#06b6d4")}>💬 Ідеї для питань</p>
          {vacancy?.questions.map((q, i) => (
            <p key={i} style={{ fontSize: "0.83rem", color: "var(--text2)", lineHeight: 1.5, marginBottom: i < vacancy.questions.length - 1 ? 7 : 0 }}>
              • {q}
            </p>
          ))}
        </div>
      </div>
      <div style={card({ padding: "14px 16px" })}>
        <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.5 }}>
          ⚠️ <strong style={{ color: "var(--text)" }}>Правило:</strong> Проводьте жорстку співбесіду, але <em>не називайте вакансію прямо</em>. Кандидат має сам здогадатись.
        </p>
      </div>
      {!confirmed ? (
        <button className="btn-primary" onClick={() => setConfirmed(true)}
          style={{ background: "linear-gradient(135deg, #1f5f9d, #06b6d4)" }}>
          Ми готові нищити. Розуміємо умови! 💼
        </button>
      ) : (
        <button className="btn-primary" onClick={onStart}
          style={{ background: "linear-gradient(135deg, #7c3aed, #dc2626)", fontSize: "1.1rem", fontWeight: 800, padding: "18px" }}>
          🔥 ПОЧАТИ ПЕКЛО
        </button>
      )}
    </div>
  );
}

// ─── ТАЙМЕР ───────────────────────────────────────────────────────────────────

function InterviewScreen({ candidate, hrNames, timerSeconds, timerTotal, interviewMinutes, starterQ, onStop }) {
  const pct = timerTotal > 0 ? timerSeconds / timerTotal : 0;
  const isUrgent = timerSeconds < 60 && timerSeconds > 0;
  const isDone = timerSeconds === 0;
  const timerColor = isDone ? "#ef4444" : isUrgent ? "#f59e0b" : "#a855f7";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        background: "var(--bg2)", border: `1px solid ${timerColor}55`,
        borderRadius: "var(--radius)", padding: "24px 20px 20px",
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: 4,
          width: `${pct * 100}%`, background: timerColor,
          transition: "width 1s linear, background 0.5s",
        }} />
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text2)", marginBottom: 8 }}>
          {isDone ? "⏰ ЧАС ВИЙШОВ!" : isUrgent ? "⚡ ЗАЛИШИЛОСЬ" : "⏱️ ЧАС"}
        </p>
        <p style={{
          fontSize: "4.5rem", fontWeight: 900, color: timerColor,
          letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1,
          animation: isUrgent ? "pulse 0.8s ease-in-out infinite" : "none",
        }}>{formatTime(timerSeconds)}</p>
        <p style={{ fontSize: "0.78rem", color: "var(--text2)", marginTop: 6 }}>з {interviewMinutes} хвилин</p>
      </div>

      <div style={{ ...card(), display: "flex", gap: 12, padding: "14px 16px" }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={lbl("#f59e0b")}>🎭 Кандидат</p>
          <p style={{ fontWeight: 800, color: "#fbbf24" }}>{candidate}</p>
        </div>
        <div style={{ width: 1, background: "var(--bg3)" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <p style={lbl("#06b6d4")}>💼 HR-ці</p>
          <p style={{ fontWeight: 700, color: "#22d3ee", fontSize: "0.88rem" }}>{hrNames.join(", ")}</p>
        </div>
      </div>

      <div style={{
        background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.3)",
        borderRadius: "var(--radius)", padding: "16px",
      }}>
        <p style={lbl("#c084fc")}>🎲 GM рекомендує почати з:</p>
        <p style={{ fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.65, fontStyle: "italic" }}>{starterQ}</p>
      </div>

      <div style={card({ padding: "14px 16px" })}>
        <p style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.6 }}>
          💡 <strong style={{ color: "var(--text)" }}>Нагадування:</strong> HR не називає вакансію прямо. Кандидат не називає ваду прямо. Коли готові — зупиніться.
        </p>
      </div>

      <button className="btn-secondary" onClick={onStop}
        style={{ borderColor: "#ef4444", color: "#ef4444", fontSize: "1rem", fontWeight: 700 }}>
        {isDone ? "⏰ Час вийшов → Підсумки!" : "🛑 СТОП → Завершити допит"}
      </button>
    </div>
  );
}

// ─── ДЕБРИФІНГ ────────────────────────────────────────────────────────────────

function DebriefScreen({ candidate, hrNames, onReveal }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...card(), textAlign: "center", padding: "24px 20px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 8 }}>ДЕБРИФІНГ</h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", lineHeight: 1.6 }}>
          Час версій. Говоріть вголос — не пишіть у чат.
        </p>
      </div>
      <div style={{
        background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.3)",
        borderRadius: "var(--radius)", padding: "20px",
      }}>
        <p style={lbl("#06b6d4")}>💼 HR-ці ({hrNames.join(", ")}) — скажіть вголос:</p>
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.65 }}>
          «Який діагноз / таємна вада у вашого кандидата?»
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: 8, fontStyle: "italic" }}>
          Нарадьтесь і назвіть одну спільну відповідь.
        </p>
      </div>
      <div style={{
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
        borderRadius: "var(--radius)", padding: "20px",
      }}>
        <p style={lbl("#f59e0b")}>🎭 Кандидат ({candidate}) — скажи вголос:</p>
        <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)", lineHeight: 1.65 }}>
          «Куди, в біса, я намагався(лась) влаштуватись?»
        </p>
        <p style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: 8, fontStyle: "italic" }}>
          Назви компанію або опис вакансії — як ти її зрозумів.
        </p>
      </div>
      <div style={{ ...card({ padding: "14px 16px" }), textAlign: "center" }}>
        <p style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
          Коли всі озвучили версії вголос — розкривайте карти!
        </p>
      </div>
      <button className="btn-primary" onClick={onReveal}
        style={{ background: "linear-gradient(135deg, #7c3aed, #f59e0b)", fontSize: "1.05rem", fontWeight: 800, padding: "18px" }}>
        🎴 ПОКАЗАТИ ПРАВИЛЬНІ ВІДПОВІДІ
      </button>
    </div>
  );
}

// ─── РОЗКРИТТЯ КАРТ ───────────────────────────────────────────────────────────

function RevealScreen({ flaw, vacancy, candidate, onRestart }) {
  const comment = getRandom(SARCASM)(candidate);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🎉💀</div>
        <h2 style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--text)" }}>ВЕРДИКТ ОГОЛОШЕНО</h2>
      </div>

      <div style={{
        background: "linear-gradient(135deg, rgba(220,38,38,0.12), var(--bg2))",
        border: "1px solid rgba(220,38,38,0.4)", borderRadius: "var(--radius)", padding: "20px",
      }}>
        <p style={lbl("#ef4444")}>🔬 Таємна вада кандидата ({candidate})</p>
        <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f0eeff", marginBottom: 10 }}>{flaw?.title}</p>
        <p style={{ fontSize: "0.86rem", color: "var(--text2)", lineHeight: 1.65 }}>{flaw?.description}</p>
      </div>

      <div style={{
        background: "linear-gradient(135deg, rgba(6,182,212,0.1), var(--bg2))",
        border: "1px solid rgba(6,182,212,0.35)", borderRadius: "var(--radius)", padding: "20px",
      }}>
        <p style={lbl("#06b6d4")}>💼 Вакансія (куди він(а) влаштовувався/лась)</p>
        <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f0eeff", marginBottom: 4 }}>{vacancy?.title}</p>
        <p style={{ fontSize: "0.78rem", color: "#22d3ee", marginBottom: 10 }}>{vacancy?.company}</p>
        <p style={{ fontSize: "0.86rem", color: "var(--text2)", lineHeight: 1.65 }}>{vacancy?.description}</p>
      </div>

      <div style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.08))",
        border: "1px solid rgba(245,158,11,0.4)", borderRadius: "var(--radius)", padding: "20px",
      }}>
        <p style={lbl("#f59e0b")}>☠️ Вердикт корпоративного GM</p>
        <p style={{ fontSize: "0.95rem", color: "var(--text)", lineHeight: 1.75, fontStyle: "italic" }}>
          "{comment}"
        </p>
      </div>

      <button className="btn-primary" onClick={onRestart}
        style={{ background: "linear-gradient(135deg, #7c3aed, #dc2626)", fontSize: "1.05rem", fontWeight: 800, padding: "18px" }}>
        🔄 НОВИЙ РАУНД СТРАЖДАНЬ
      </button>
    </div>
  );
}
