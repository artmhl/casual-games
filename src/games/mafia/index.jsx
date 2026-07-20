import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabase";

/* ═══════════════════════════════════════════════
   ROLE REGISTRY — Add new roles here
═══════════════════════════════════════════════ */
const ROLES = {
  civilian: { id: "civilian", name: "Мирний житель", emoji: "👨‍🌾", color: "#63b3ed", glow: "0 0 24px rgba(99,179,237,0.35)", team: "civilians", teamName: "Мирні", nightAction: false, description: "Вдень шукай мафію та голосуй за підозрілих. Твоя зброя — логіка та переконання." },
  mafia: { id: "mafia", name: "Мафія", emoji: "🔫", color: "#fc5c5c", glow: "0 0 24px rgba(252,92,92,0.4)", team: "mafia", teamName: "Мафія", nightAction: true, description: "Вночі разом з командою обирайте жертву. Вдень приховуй свою роль." },
  don: { id: "don", name: "Дон Мафії", emoji: "🕴️", color: "#e53e3e", glow: "0 0 24px rgba(229,62,62,0.5)", team: "mafia", teamName: "Мафія", nightAction: true, description: "Лідер мафії. Твій голос вирішальний при виборі жертви. Один раз за гру можеш перевірити роль гравця." },
  doctor: { id: "doctor", name: "Лікар", emoji: "💉", color: "#68d391", glow: "0 0 24px rgba(104,211,145,0.4)", team: "civilians", teamName: "Мирні", nightAction: true, description: "Вночі рятуй одного гравця від смерті. Не можеш лікувати себе дві ночі поспіль." },
  detective: { id: "detective", name: "Комісар", emoji: "🕵️‍♂️", color: "#f6ad55", glow: "0 0 24px rgba(246,173,85,0.4)", team: "civilians", teamName: "Мирні", nightAction: true, description: "Вночі перевіряй одного гравця — дізнаєшся, чи він мафія." },
  maniac: { id: "maniac", name: "Маньяк", emoji: "🔪", color: "#b794f4", glow: "0 0 24px rgba(183,148,244,0.4)", team: "solo", teamName: "Одинак", nightAction: true, description: "Граєш сам за себе. Вночі вбивай будь-кого. Переможеш у двобої 1 на 1." },
  butterfly: { id: "butterfly", name: "Нічний метелик", emoji: "💋", color: "#f687b3", glow: "0 0 24px rgba(246,135,179,0.4)", team: "civilians", teamName: "Мирні", nightAction: true, description: "Вночі відволікай одного гравця — він не зможе виконати свою нічну дію." },
};

/* ═══════════════════════════════════════════════
   ROLE DISTRIBUTION
═══════════════════════════════════════════════ */
const ROLE_DIST = {
  5: { mafia: 1, don: 0, doctor: 1, detective: 0, maniac: 0, butterfly: 0 },
  6: { mafia: 1, don: 1, doctor: 1, detective: 1, maniac: 0, butterfly: 0 },
  7: { mafia: 1, don: 1, doctor: 1, detective: 1, maniac: 1, butterfly: 0 },
  8: { mafia: 2, don: 1, doctor: 1, detective: 1, maniac: 0, butterfly: 1 },
  9: { mafia: 2, don: 1, doctor: 1, detective: 1, maniac: 1, butterfly: 1 },
  10: { mafia: 2, don: 1, doctor: 1, detective: 1, maniac: 1, butterfly: 1 },
  11: { mafia: 2, don: 1, doctor: 1, detective: 1, maniac: 1, butterfly: 1 },
  12: { mafia: 3, don: 1, doctor: 1, detective: 1, maniac: 1, butterfly: 1 },
};

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function generateCode() {
  const ch = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => ch[Math.floor(Math.random() * ch.length)]).join("");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignRoles(players) {
  const n = players.length;
  const dist = ROLE_DIST[Math.min(n, 12)] || ROLE_DIST[12];
  const pool = [
    ...Array(dist.don || 0).fill("don"),
    ...Array(dist.mafia).fill("mafia"),
    ...Array(dist.doctor || 0).fill("doctor"),
    ...Array(dist.detective || 0).fill("detective"),
    ...Array(dist.maniac || 0).fill("maniac"),
    ...Array(dist.butterfly || 0).fill("butterfly"),
  ];
  pool.push(...Array(Math.max(0, n - pool.length)).fill("civilian"));
  const shuffled = shuffle(pool);
  return players.map((p, i) => ({ ...p, role: shuffled[i] || "civilian", isDead: false, isReady: false }));
}

function resolveNight(gs) {
  const { night = {}, players } = gs;
  const alive = players.filter(p => !p.isDead);
  const blocked = night.butterflyTarget;

  // Mafia kill — decision maker = Don > first alive mafia
  const aliveMafia = alive.filter(p => p.role === "mafia" || p.role === "don");
  const don = alive.find(p => p.role === "don");
  const decisionMaker = don ?? aliveMafia[0];
  let mafiaTarget = night.mafiaTarget;

  if (mafiaTarget && decisionMaker?.name === blocked) {
    // Decision maker blocked — try other mafia votes
    const others = aliveMafia.filter(m => m.name !== blocked);
    if (!others.length) {
      mafiaTarget = null; // Mafia loses the shot
    } else {
      const counts = {};
      others.forEach(m => { const v = night.mafiaVotes?.[m.name]; if (v) counts[v] = (counts[v] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      mafiaTarget = sorted[0]?.[0] ?? null;
    }
  }

  // Doctor save
  const doctor = alive.find(p => p.role === "doctor");
  const doctorTarget = (doctor && blocked === doctor.name) ? null : night.doctorTarget;

  // Apply kills
  const killed = [];
  const savedByDoctor = !!(mafiaTarget && mafiaTarget === doctorTarget);
  if (mafiaTarget && mafiaTarget !== doctorTarget) killed.push(mafiaTarget);

  // Maniac kill
  const maniac = alive.find(p => p.role === "maniac");
  const maniacTarget = (maniac && blocked === maniac.name) ? null : night.maniacTarget;
  if (maniacTarget && maniacTarget !== doctorTarget) killed.push(maniacTarget);

  // Detective check
  const detective = alive.find(p => p.role === "detective");
  const detectiveBlocked = detective && blocked === detective.name;
  let detectiveResult = null;
  if (!detectiveBlocked && night.detectiveTarget) {
    const t = players.find(p => p.name === night.detectiveTarget);
    if (t) detectiveResult = (t.role === "mafia" || t.role === "don") ? "mafia" : "civilian";
  }

  // Don check (no block on this)
  let donCheckResult = null;
  if (night.donCheckTarget) {
    const t = players.find(p => p.name === night.donCheckTarget);
    if (t) donCheckResult = t.role;
  }

  return {
    killed: [...new Set(killed)],
    savedByDoctor,
    detectiveResult,
    detectiveTarget: night.detectiveTarget,
    donCheckResult,
    donCheckTarget: night.donCheckTarget,
  };
}

function checkWin(players) {
  const alive = players.filter(p => !p.isDead);
  const mafia = alive.filter(p => p.role === "mafia" || p.role === "don");
  const maniac = alive.find(p => p.role === "maniac");
  if (maniac && alive.length <= 2) return "maniac";
  if (!mafia.length && !maniac) return "civilians";
  if (mafia.length >= alive.length - mafia.length && mafia.length > 0) return "mafia";
  return null;
}

function getDecisionMaker(players) {
  const alive = players.filter(p => !p.isDead);
  return alive.find(p => p.role === "don") ?? alive.find(p => p.role === "mafia");
}

/* ═══════════════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════════════ */
const S = {
  col: { display: "flex", flexDirection: "column", gap: 16 },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 },
  card: { background: "var(--bg2)", border: "1px solid var(--bg3)", borderRadius: "var(--radius)", padding: 20 },
  input: { padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg2)", border: "1px solid var(--bg3)", color: "var(--text)", fontSize: 16, width: "100%", boxSizing: "border-box", outline: "none", fontFamily: "inherit" },
  heading: { fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg,var(--accent2),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 },
  sub: { color: "var(--text2)", fontSize: "0.9rem", margin: 0 },
  label: { color: "var(--text2)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" },
  chip: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem" },
};

/* ═══════════════════════════════════════════════
   PLAYER PICKER
═══════════════════════════════════════════════ */
function PlayerPicker({ players, selected, onSelect, disabled, exclude = [] }) {
  const opts = players.filter(p => !p.isDead && !exclude.includes(p.name));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {opts.map(p => {
        const sel = selected === p.name;
        return (
          <button key={p.name} onClick={() => !disabled && onSelect(p.name)} style={{
            padding: "13px 16px", borderRadius: "var(--radius-sm)",
            border: sel ? "2px solid var(--accent2)" : "1px solid var(--bg3)",
            background: sel ? "rgba(167,139,250,0.12)" : "var(--bg3)",
            color: "var(--text)", fontSize: "1rem", fontWeight: sel ? 700 : 400,
            cursor: disabled ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            transition: "all 0.15s", fontFamily: "inherit",
            opacity: disabled && !sel ? 0.6 : 1,
          }}>
            <span>{p.name}</span>
            {sel && <span style={{ color: "var(--accent2)" }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   NIGHT STARS
═══════════════════════════════════════════════ */
function NightStars() {
  const [stars] = useState(() => Array.from({ length: 50 }, (_, i) => ({
    id: i, size: Math.random() * 2.5 + 0.5,
    x: Math.random() * 100, y: Math.random() * 65,
    op: Math.random() * 0.6 + 0.2,
    dur: (Math.random() * 3 + 2).toFixed(1),
    delay: (Math.random() * 4).toFixed(1),
  })));
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute", width: s.size, height: s.size,
          left: s.x + "%", top: s.y + "%", borderRadius: "50%",
          background: `rgba(255,255,255,${s.op})`,
          boxShadow: `0 0 ${s.size * 2}px rgba(255,255,255,${s.op * 0.5})`,
          animation: `maf-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   NIGHT ACTION PANELS
═══════════════════════════════════════════════ */
function ButterflyAction({ night, alive, playerName, onSubmit }) {
  const [sel, setSel] = useState(null);
  const r = ROLES.butterfly;
  if (night.butterflyTarget) return (
    <div style={{ ...S.card, ...S.center, background: `${r.color}11`, border: `1px solid ${r.color}33` }}>
      <p style={{ fontWeight: 700, color: r.color, margin: 0 }}>💋 Ти відвернула {night.butterflyTarget}</p>
    </div>
  );
  return (
    <div style={S.col}>
      <p style={S.sub}>Обери кого відвернеш від нічних справ:</p>
      <PlayerPicker players={alive} selected={sel} onSelect={setSel} exclude={[playerName]} />
      <button className="btn-primary" disabled={!sel}
        onClick={() => sel && onSubmit("butterflyTarget", sel)}
        style={{ background: `linear-gradient(135deg,${r.color}bb,${r.color})` }}>
        💋 Підтвердити
      </button>
    </div>
  );
}

function DoctorAction({ night, alive, playerName, onSubmit }) {
  const [sel, setSel] = useState(null);
  const r = ROLES.doctor;
  const cantSelf = night.lastDoctorTarget === playerName;
  if (night.doctorTarget) return (
    <div style={{ ...S.card, ...S.center, background: `${r.color}11`, border: `1px solid ${r.color}33` }}>
      <p style={{ fontWeight: 700, color: r.color, margin: 0 }}>💉 Ти захистив {night.doctorTarget}</p>
    </div>
  );
  return (
    <div style={S.col}>
      {cantSelf && (
        <div style={{ background: `${r.color}0f`, border: `1px solid ${r.color}33`, borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
          <p style={{ color: r.color, margin: 0, fontSize: "0.85rem" }}>⚠️ Не можеш лікувати себе дві ночі поспіль</p>
        </div>
      )}
      <p style={S.sub}>Кого врятуєш цієї ночі?</p>
      <PlayerPicker players={alive} selected={sel} onSelect={setSel} exclude={cantSelf ? [playerName] : []} />
      <button className="btn-primary" disabled={!sel}
        onClick={() => sel && onSubmit("doctorTarget", sel)}
        style={{ background: `linear-gradient(135deg,${r.color}bb,${r.color})` }}>
        💉 Підтвердити
      </button>
    </div>
  );
}

function DetectiveAction({ night, alive, playerName, onSubmit }) {
  const [sel, setSel] = useState(null);
  const r = ROLES.detective;
  if (night.detectiveTarget) return (
    <div style={{ ...S.card, ...S.center, background: `${r.color}11`, border: `1px solid ${r.color}33` }}>
      <p style={{ fontWeight: 700, color: r.color, margin: 0 }}>🔍 Ти перевіряєш {night.detectiveTarget}. Результат вранці.</p>
    </div>
  );
  return (
    <div style={S.col}>
      <p style={S.sub}>Кого перевіряєш цієї ночі?</p>
      <PlayerPicker players={alive} selected={sel} onSelect={setSel} exclude={[playerName]} />
      <button className="btn-primary" disabled={!sel}
        onClick={() => sel && onSubmit("detectiveTarget", sel)}
        style={{ background: `linear-gradient(135deg,${r.color}bb,${r.color})` }}>
        🔍 Підтвердити
      </button>
    </div>
  );
}

function ManiacAction({ night, alive, playerName, onSubmit }) {
  const [sel, setSel] = useState(null);
  const r = ROLES.maniac;
  if (night.maniacTarget) return (
    <div style={{ ...S.card, ...S.center, background: `${r.color}11`, border: `1px solid ${r.color}33` }}>
      <p style={{ fontWeight: 700, color: r.color, margin: 0 }}>🔪 Твоя жертва: {night.maniacTarget}</p>
    </div>
  );
  return (
    <div style={S.col}>
      <p style={S.sub}>Обери свою жертву:</p>
      <PlayerPicker players={alive} selected={sel} onSelect={setSel} exclude={[playerName]} />
      <button className="btn-primary" disabled={!sel}
        onClick={() => sel && onSubmit("maniacTarget", sel)}
        style={{ background: `linear-gradient(135deg,${r.color}bb,${r.color})` }}>
        🔪 Підтвердити
      </button>
    </div>
  );
}

function MafiaAction({ night, alive, players, playerName, isDecisionMaker, onVote, onConfirm, onDonCheck, donCheckUsed }) {
  const [donSel, setDonSel] = useState(null);
  
  const myPlayer = players.find(p => p.name === playerName);
  const isOriginalDon = myPlayer?.role === "don"; 
  
  // Знаходимо поточного боса (Дон або його спадкоємець)
  const currentBoss = getDecisionMaker(players);
  const amIBossNow = currentBoss?.name === playerName;

  const mafiaTeam = alive.filter(p => p.role === "mafia" || p.role === "don");
  const myVote = night.mafiaVotes?.[playerName];
  const killConfirmed = night.mafiaTarget != null;

  return (
    <div style={S.col}>
      {/* Якщо я спадкоємець і став босом - показуємо статус */}
      {amIBossNow && !isOriginalDon && (
        <div style={{ ...S.card, ...S.center, background: "rgba(229,62,62,0.1)", border: "1px solid #e53e3e" }}>
          <p style={{ color: "#e53e3e", fontWeight: 800, margin: 0 }}>🕴️ Ти — Новий Дон Мафії!</p>
          <p style={{ ...S.sub, fontSize: "0.8rem" }}>Попередній бос мертвий. Тепер ти приймаєш фінальне рішення.</p>
        </div>
      )}

      {/* Team votes */}
      {mafiaTeam.length > 1 && (
        <div style={{ ...S.card, background: "rgba(252,92,92,0.07)", border: "1px solid rgba(252,92,92,0.2)" }}>
          <p style={{ ...S.label, color: "#fc5c5c", margin: "0 0 10px" }}>Голоси команди</p>
          {mafiaTeam.map(m => {
            const isThisGuyBoss = currentBoss?.name === m.name;
            return (
              <div key={m.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(252,92,92,0.1)" }}>
                <span style={{ fontWeight: m.name === playerName ? 700 : 400, color: m.name === playerName ? "var(--text)" : "var(--text2)" }}>
                  {m.name === playerName ? `${m.name} (ти)` : m.name}
                  {isThisGuyBoss ? " 🕴️" : ""}
                </span>
                <span style={{ color: "#fc5c5c", fontWeight: 600 }}>
                  {night.mafiaVotes?.[m.name] ? `→ ${night.mafiaVotes[m.name]}` : "⋯"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {killConfirmed ? (
        <div style={{ ...S.card, ...S.center, background: "rgba(252,92,92,0.08)", border: "1px solid rgba(252,92,92,0.3)" }}>
          <p style={{ color: "#fc5c5c", fontWeight: 700, margin: 0 }}>✓ Ціль підтверджена: {night.mafiaTarget}</p>
        </div>
      ) : (
        <>
          <p style={S.sub}>Обери жертву:</p>
          <PlayerPicker
            players={alive} selected={myVote} onSelect={onVote}
            exclude={mafiaTeam.map(m => m.name)}
          />
          {amIBossNow ? (
            <button className="btn-primary" disabled={!myVote} onClick={onConfirm}
              style={{ background: myVote ? "linear-gradient(135deg,#c53030,#fc5c5c)" : undefined }}>
              🔫 Підтвердити вбивство
            </button>
          ) : (
            <p style={{ ...S.sub, textAlign: "center", fontSize: "0.85rem" }}>
              Чекаємо рішення Дона ({currentBoss?.name})...
            </p>
          )}
        </>
      )}

      {/* Don special check (Тільки для оригінального Дона) - ФІКС ЗНИКНЕННЯ */}
      {isOriginalDon && (!donCheckUsed || night.donCheckTarget) && (
        <div style={{ ...S.card, border: "1px solid rgba(229,62,62,0.25)" }}>
          <p style={{ ...S.label, color: "#e53e3e", margin: "0 0 10px" }}>🔍 Особлива перевірка (1 раз за гру)</p>
          {night.donCheckTarget ? (
            <p style={{ margin: 0, color: "#e53e3e", fontWeight: 600 }}>✓ Перевіряєш: {night.donCheckTarget} (результат вранці)</p>
          ) : (
            <>
              <PlayerPicker players={alive} selected={donSel} onSelect={setDonSel} exclude={[playerName]} />
              {donSel && (
                <button onClick={() => onDonCheck(donSel)} style={{
                  marginTop: 10, width: "100%", padding: "10px", borderRadius: "var(--radius-sm)",
                  background: "rgba(229,62,62,0.15)", border: "1px solid rgba(229,62,62,0.3)",
                  color: "#e53e3e", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>
                  🔍 Перевірити {donSel}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   NIGHT PROGRESS (host only)
═══════════════════════════════════════════════ */
function NightProgress({ done, needsAction }) {
  const items = [
    { key: "butterfly", label: "Метелик 💋" },
    { key: "mafia", label: "Мафія 🔫" },
    { key: "doctor", label: "Лікар 💉" },
    { key: "detective", label: "Комісар 🕵️" },
    { key: "maniac", label: "Маньяк 🔪" },
  ].filter(i => needsAction[i.key]);
  const allDone = items.every(i => done[i.key]);
  return (
    <div>
      <p style={{ ...S.label, margin: "0 0 8px" }}>Статус ночі</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map(i => (
          <span key={i.key} style={{
            ...S.chip,
            background: done[i.key] ? "rgba(104,211,145,0.12)" : "rgba(255,255,255,0.04)",
            color: done[i.key] ? "#68d391" : "var(--text2)",
            border: `1px solid ${done[i.key] ? "rgba(104,211,145,0.3)" : "var(--bg3)"}`,
          }}>
            {done[i.key] ? "✓ " : "⋯ "}{i.label}
          </span>
        ))}
      </div>
      {allDone && <p style={{ color: "#68d391", fontSize: "0.85rem", margin: "8px 0 0", fontWeight: 600 }}>Всі дії виконано!</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: JOIN
═══════════════════════════════════════════════ */
function JoinScreen({ onCreateRoom, onJoinRoom, error }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function doCreate() {
    if (!name.trim() || loading) return;
    setLoading(true); await onCreateRoom(name.trim()); setLoading(false);
  }
  async function doJoin() {
    if (!name.trim() || code.length < 4 || loading) return;
    setLoading(true); await onJoinRoom(name.trim(), code.toUpperCase().trim()); setLoading(false);
  }

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.4s ease" }}>
      <div style={{ ...S.center, paddingTop: 8 }}>
        <div style={{ fontSize: "4rem", filter: "drop-shadow(0 0 24px rgba(124,106,247,0.55))" }}>🎭</div>
        <h1 style={S.heading}>Мафія</h1>
        <p style={S.sub}>Мультиплеєрна гра на дедукцію та блеф</p>
      </div>

      <div style={{ ...S.card, display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={S.label}>Твоє ім'я</label>
        <input placeholder="Як тебе звати?" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doCreate()}
          style={S.input} maxLength={18} autoComplete="off" />
      </div>

      <button className="btn-primary" onClick={doCreate} disabled={!name.trim() || loading}
        style={{ background: "linear-gradient(135deg,#7c6af7,#a78bfa)" }}>
        {loading ? "⏳ Підключення..." : "🏠 Створити кімнату"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: "var(--bg3)" }} />
        <span style={{ ...S.sub, fontSize: "0.8rem" }}>або</span>
        <div style={{ flex: 1, height: 1, background: "var(--bg3)" }} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input placeholder="XXXX" value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          onKeyDown={e => e.key === "Enter" && doJoin()}
          style={{ ...S.input, letterSpacing: "0.25em", fontWeight: 700, textAlign: "center", flex: 1, width: "auto" }}
          maxLength={4} autoComplete="off" />
        <button className="btn-secondary" onClick={doJoin}
          disabled={!name.trim() || code.length < 4 || loading}
          style={{ width: "auto", padding: "0 20px", whiteSpace: "nowrap", flexShrink: 0 }}>
          Увійти →
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(252,92,92,0.1)", border: "1px solid rgba(252,92,92,0.3)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
          <p style={{ color: "#fc5c5c", margin: 0, fontSize: "0.9rem" }}>⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: LOBBY
═══════════════════════════════════════════════ */
function LobbyScreen({ gameState, roomCode, playerName, isHost, onStart, onLeave }) {
  const players = gameState?.players || [];
  const canStart = players.length >= 5;

  // Таймер авто-розпуску — рахується від lobbyExpiresAt у gameState (реальний час створення)
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!gameState?.lobbyExpiresAt) return;
    function tick() {
      const left = Math.max(0, Math.round((new Date(gameState.lobbyExpiresAt) - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0 && isHost) onLeave();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameState?.lobbyExpiresAt, isHost]); // eslint-disable-line

  const mins = timeLeft != null ? Math.floor(timeLeft / 60) : null;
  const secs = timeLeft != null ? String(timeLeft % 60).padStart(2, "0") : null;
  const timerColor = timeLeft <= 30 ? "#fc5c5c" : timeLeft <= 60 ? "#f6ad55" : "var(--text2)";

  return (
    <div style={S.col}>
      <div style={{ ...S.card, ...S.center, gap: 8, background: "linear-gradient(135deg,rgba(124,106,247,0.08),rgba(167,139,250,0.04))", border: "1px solid rgba(167,139,250,0.25)" }}>
        <p style={{ ...S.sub, fontSize: "0.8rem" }}>Код кімнати — поділись з друзями</p>
        <p style={{ fontSize: "3.2rem", fontWeight: 800, letterSpacing: "0.35em", color: "var(--accent2)", margin: 0, lineHeight: 1 }}>
          {roomCode}
        </p>
      </div>

      {timeLeft != null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px" }}>
          <span style={{ color: "var(--text2)", fontSize: "0.8rem" }}>⏱ Кімната закриється через</span>
          <span style={{ color: timerColor, fontWeight: 700, fontSize: "0.95rem", fontVariantNumeric: "tabular-nums", transition: "color 0.3s" }}>
            {mins}:{secs}
          </span>
        </div>
      )}

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 12px" }}>Гравці ({players.length}/12)</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {players.map((p, i) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              background: p.name === playerName ? "rgba(167,139,250,0.1)" : "var(--bg3)",
              borderRadius: "var(--radius-sm)",
              border: p.name === playerName ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
              animation: `maf-slideIn 0.3s ease ${i * 0.04}s both`,
            }}>
              <span style={{ color: "var(--text2)", fontSize: "0.8rem", width: 18, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: p.name === playerName ? 700 : 400 }}>{p.name}</span>
              {p.name === gameState.host && <span style={{ ...S.chip, background: "rgba(167,139,250,0.15)", color: "var(--accent2)", border: "1px solid rgba(167,139,250,0.3)" }}>ведучий</span>}
              {p.name === playerName && p.name !== gameState.host && <span style={{ ...S.chip, background: "var(--bg3)", color: "var(--text2)" }}>ти</span>}
            </div>
          ))}
        </div>
      </div>

      {players.length < 5 && <p style={{ ...S.sub, textAlign: "center" }}>Потрібно ще {5 - players.length} гравців</p>}

      {isHost ? (
        <button className="btn-primary" onClick={onStart} disabled={!canStart}
          style={canStart ? { background: "linear-gradient(135deg,#7c6af7,#a78bfa)" } : {}}>
          🎮 Почати гру
        </button>
      ) : (
        <div style={{ ...S.card, ...S.center }}><p style={S.sub}>⏳ Очікуємо ведучого...</p></div>
      )}

      <button className="btn-secondary" onClick={onLeave}
        style={{ color: "rgba(252,92,92,0.8)", borderColor: "rgba(252,92,92,0.25)" }}>
        {isHost ? "🗑 Розпустити кімнату" : "← Вийти з кімнати"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: ROLE REVEAL
═══════════════════════════════════════════════ */
function RoleRevealScreen({ gameState, playerName, onReady }) {
  const myPlayer = gameState.players.find(p => p.name === playerName);
  const role = ROLES[myPlayer?.role] || ROLES.civilian;
  const isReady = myPlayer?.isReady;
  const waiting = gameState.players.filter(p => !p.isReady && !p.isLeft).length;
  
  // Збираємо всю мафію, сортуємо: спочатку Дон, потім рядові за порядком спадкування
  const mafiaTeamRaw = role.team === "mafia" 
    ? gameState.players.filter(p => p.role === "mafia" || p.role === "don")
    : [];
  const donPlayer = mafiaTeamRaw.find(p => p.role === "don");
  const regularMafias = mafiaTeamRaw.filter(p => p.role === "mafia");
  const mafiaTeam = donPlayer ? [donPlayer, ...regularMafias] : regularMafias;

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.4s ease" }}>
      <div style={S.center}><p style={S.sub}>Твоя роль у цій грі</p></div>

      <div style={{
        ...S.card, ...S.center, gap: 16, padding: "32px 24px",
        background: `linear-gradient(135deg,${role.color}18,${role.color}08)`,
        border: `2px solid ${role.color}55`, boxShadow: role.glow,
        animation: "maf-roleReveal 0.6s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ fontSize: "4.5rem", lineHeight: 1 }}>{role.emoji}</div>
        <h2 style={{ color: role.color, fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>{role.name}</h2>
        <span style={{ ...S.chip, background: `${role.color}20`, color: role.color, border: `1px solid ${role.color}40`, padding: "4px 14px", fontSize: "0.8rem" }}>
          Команда: {role.teamName}
        </span>
        <p style={{ color: "var(--text)", lineHeight: 1.65, margin: 0, maxWidth: 280 }}>{role.description}</p>
      </div>

      {mafiaTeam.length > 0 && (
        <div style={{ ...S.card, background: "rgba(252,92,92,0.06)", border: "1px solid rgba(252,92,92,0.2)" }}>
          <p style={{ ...S.label, color: "#fc5c5c", margin: "0 0 10px" }}>🔫 Твоя мафіозна команда</p>
          {mafiaTeam.map((p, idx) => {
            const isMe = p.name === playerName;
            const badge = p.role === "don" ? "Бос 🕴️" : `Спадкоємець ${p.role === "don" ? idx : idx}`;
            
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <span style={{ fontSize: "1.1rem" }}>{ROLES[p.role]?.emoji}</span>
                <span style={{ fontWeight: isMe ? 800 : 600, color: isMe ? "var(--text)" : "var(--text2)" }}>
                  {p.name} {isMe && "(ти)"}
                </span>
                <span style={{ ...S.chip, background: "rgba(252,92,92,0.15)", color: "#fc5c5c", marginLeft: "auto" }}>
                  {badge}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isReady ? (
        <button className="btn-primary" onClick={onReady}
          style={{ background: `linear-gradient(135deg,${role.color}cc,${role.color}ee)` }}>
          ✓ Я готовий
        </button>
      ) : (
        <div style={{ ...S.card, ...S.center, background: "rgba(104,211,145,0.06)", border: "1px solid rgba(104,211,145,0.2)" }}>
          <p style={{ color: "#68d391", margin: 0, fontWeight: 600 }}>
            ✓ {waiting > 0 ? `Чекаємо ще ${waiting} гравців...` : "Всі готові!"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: NIGHT
═══════════════════════════════════════════════ */
function NightScreen({ gameState, playerName, isHost, onUpdateRoom }) {
  const { players, night = {} } = gameState;
  const alive = players.filter(p => !p.isDead);
  const myPlayer = players.find(p => p.name === playerName);
  const myRole = myPlayer?.role;
  const isDead = myPlayer?.isDead;
  const dm = getDecisionMaker(players);
  const isDecisionMaker = dm?.name === playerName;

  const hasRole = r => alive.some(p => p.role === r);
  const needsAction = {
    butterfly: hasRole("butterfly"), mafia: hasRole("mafia") || hasRole("don"),
    doctor: hasRole("doctor"), detective: hasRole("detective"), maniac: hasRole("maniac"),
  };
  const done = {
    butterfly: !needsAction.butterfly || night.butterflyTarget != null,
    mafia: !needsAction.mafia || night.mafiaTarget != null,
    doctor: !needsAction.doctor || night.doctorTarget != null,
    detective: !needsAction.detective || night.detectiveTarget != null,
    maniac: !needsAction.maniac || night.maniacTarget != null,
  };
  const allDone = Object.values(done).every(Boolean);

  async function submit(field, val) {
    await onUpdateRoom({ ...gameState, night: { ...night, [field]: val } });
  }
  async function mafiaVote(target) {
    const votes = { ...night.mafiaVotes, [playerName]: target };
    await onUpdateRoom({ ...gameState, night: { ...night, mafiaVotes: votes } });
  }
  async function confirmKill() {
    const myVote = night.mafiaVotes?.[playerName];
    if (!myVote) return;
    await onUpdateRoom({ ...gameState, night: { ...night, mafiaTarget: myVote } });
  }
  async function donCheck(target) {
    await onUpdateRoom({ ...gameState, donCheckUsed: true, night: { ...night, donCheckTarget: target } });
  }
  async function advance() {
    const res = resolveNight(gameState);
    const newPlayers = players.map(p => ({ ...p, isDead: p.isDead || res.killed.includes(p.name) }));
    await onUpdateRoom({
      ...gameState, phase: "morning", players: newPlayers,
      morning: { killed: res.killed, savedByDoctor: res.savedByDoctor, detectiveResult: res.detectiveResult, detectiveTarget: res.detectiveTarget, donCheckResult: res.donCheckResult, donCheckTarget: res.donCheckTarget },
      night: { ...night, lastDoctorTarget: night.doctorTarget },
    });
  }

  const content = () => {
    if (isDead) return (
      <div style={{ ...S.center, padding: "32px 0", gap: 16 }}>
        <div style={{ fontSize: "3rem" }}>💀</div>
        <h2 style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>Ти мертвий</h2>
        <p style={{ color: "rgba(255,255,255,0.3)", margin: 0 }}>Спостерігай мовчки</p>
      </div>
    );
    if (myRole === "mafia" || myRole === "don") return (
      <div style={S.col}>
        <div style={{ ...S.center, gap: 8 }}>
          <div style={{ fontSize: "2.5rem" }}>🔫</div>
          <h2 style={{ color: "#fc5c5c", fontWeight: 800, margin: 0 }}>Мафія прокинулась</h2>
        </div>
        <MafiaAction night={night} alive={alive} players={players} playerName={playerName}
          isDecisionMaker={isDecisionMaker} onVote={mafiaVote} onConfirm={confirmKill}
          onDonCheck={donCheck} donCheckUsed={gameState.donCheckUsed} />
      </div>
    );
    if (myRole === "doctor") return (
      <div style={S.col}>
        <div style={{ ...S.center, gap: 8 }}><div style={{ fontSize: "2.5rem" }}>💉</div><h2 style={{ color: "#68d391", fontWeight: 800, margin: 0 }}>Лікар прокинувся</h2></div>
        <DoctorAction night={night} alive={alive} playerName={playerName} onSubmit={submit} />
      </div>
    );
    if (myRole === "detective") return (
      <div style={S.col}>
        <div style={{ ...S.center, gap: 8 }}><div style={{ fontSize: "2.5rem" }}>🕵️‍♂️</div><h2 style={{ color: "#f6ad55", fontWeight: 800, margin: 0 }}>Комісар прокинувся</h2></div>
        <DetectiveAction night={night} alive={alive} playerName={playerName} onSubmit={submit} />
      </div>
    );
    if (myRole === "maniac") return (
      <div style={S.col}>
        <div style={{ ...S.center, gap: 8 }}><div style={{ fontSize: "2.5rem" }}>🔪</div><h2 style={{ color: "#b794f4", fontWeight: 800, margin: 0 }}>Маньяк прокинувся</h2></div>
        <ManiacAction night={night} alive={alive} playerName={playerName} onSubmit={submit} />
      </div>
    );
    if (myRole === "butterfly") return (
      <div style={S.col}>
        <div style={{ ...S.center, gap: 8 }}><div style={{ fontSize: "2.5rem" }}>💋</div><h2 style={{ color: "#f687b3", fontWeight: 800, margin: 0 }}>Нічний метелик прокинувся</h2></div>
        <ButterflyAction night={night} alive={alive} playerName={playerName} onSubmit={submit} />
      </div>
    );
    return (
      <div style={{ ...S.center, padding: "32px 0", gap: 16 }}>
        <div style={{ fontSize: "3rem", filter: "drop-shadow(0 0 20px rgba(255,255,255,0.08))" }}>🌙</div>
        <h2 style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Місто спить</h2>
        <p style={{ color: "rgba(255,255,255,0.35)", margin: 0, maxWidth: 220, lineHeight: 1.6 }}>
          Твоя роль активна вдень.<br />Чекай ранку і уважно спостерігай.
        </p>
      </div>
    );
  };

  return (
    <div style={{
      margin: "0 -16px",
      padding: "24px 16px calc(24px + env(safe-area-inset-bottom))",
      background: "linear-gradient(180deg,#020408 0%,#080d18 60%,#0d1122 100%)",
      minHeight: "calc(100dvh - 70px)", position: "relative", overflow: "hidden",
    }}>
      <NightStars />
      <div style={{ position: "relative", zIndex: 1, ...S.col, gap: 20 }}>
        <div style={{ ...S.center, gap: 4 }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Ніч {gameState.nightNumber}
          </p>
          <h1 style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            Місто засинає...
          </h1>
        </div>
        {content()}
        {isHost && (
          <div style={{ ...S.card, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <NightProgress done={done} needsAction={needsAction} />
            <button className="btn-primary" onClick={advance} style={{
              marginTop: 14,
              background: allDone ? "linear-gradient(135deg,#f6ad55,#ed8936)" : "rgba(255,255,255,0.06)",
              color: allDone ? "#fff" : "var(--text2)",
            }}>
              {allDone ? "🌅 Завершити ніч" : "⚡ Перейти до ранку (пропустити)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: MORNING
═══════════════════════════════════════════════ */
function MorningResultsScreen({ gameState, playerName, isHost, onContinue }) {
  const morning = gameState.morning || {};
  const killed = morning.killed || [];
  const myPlayer = gameState.players.find(p => p.name === playerName);
  const myRole = myPlayer?.role;
  const isDetective = myRole === "detective" && !myPlayer?.isDead;
  const isDon = myRole === "don" && !myPlayer?.isDead;
  const alive = gameState.players.filter(p => !p.isDead);

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.5s ease" }}>
      <div style={S.center}>
        <div style={{ fontSize: "2.5rem" }}>🌅</div>
        <h1 style={S.heading}>Настав ранок</h1>
      </div>

      {killed.length === 0 ? (
        <div style={{ ...S.card, ...S.center, gap: 12, padding: "28px 24px", background: "rgba(104,211,145,0.07)", border: "1px solid rgba(104,211,145,0.25)" }}>
          <div style={{ fontSize: "2.5rem" }}>🕊️</div>
          <h2 style={{ color: "#68d391", fontWeight: 700, margin: 0 }}>Цієї ночі ніхто не загинув</h2>
          {morning.savedByDoctor && <p style={{ ...S.sub, margin: 0 }}>💉 Лікар врятував чиєсь життя!</p>}
        </div>
      ) : (
        <div style={{ ...S.card, ...S.center, gap: 16, padding: "28px 24px", background: "rgba(252,92,92,0.07)", border: "1px solid rgba(252,92,92,0.25)" }}>
          <div style={{ fontSize: "2.5rem" }}>💀</div>
          <h2 style={{ color: "#fc5c5c", fontWeight: 700, margin: 0 }}>
            {killed.length === 1 ? "Загинув гравець" : `Загинули ${killed.length} гравці`}
          </h2>
          {killed.map(name => {
            const p = gameState.players.find(p => p.name === name);
            const r = ROLES[p?.role] || ROLES.civilian;
            return (
              <div key={name} style={{ ...S.center, gap: 4, padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", width: "100%" }}>
                <span style={{ fontSize: "1.8rem" }}>{r.emoji}</span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>{name}</span>
                <span style={{ color: r.color, fontSize: "0.9rem" }}>{r.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {isDetective && morning.detectiveResult && (
        <div style={{ ...S.card, background: "rgba(246,173,85,0.07)", border: "1px solid rgba(246,173,85,0.25)" }}>
          <p style={{ ...S.label, color: "#f6ad55", margin: "0 0 8px" }}>🕵️ Результат перевірки (тільки для тебе)</p>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {morning.detectiveTarget} — це{" "}
            <span style={{ color: morning.detectiveResult === "mafia" ? "#fc5c5c" : "#68d391" }}>
              {morning.detectiveResult === "mafia" ? "🔫 МАФІЯ!" : "👨‍🌾 Мирний"}
            </span>
          </p>
        </div>
      )}

      {isDon && morning.donCheckResult && (
        <div style={{ ...S.card, background: "rgba(229,62,62,0.07)", border: "1px solid rgba(229,62,62,0.25)" }}>
          <p style={{ ...S.label, color: "#e53e3e", margin: "0 0 8px" }}>🔍 Результат перевірки Дона (тільки для тебе)</p>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {morning.donCheckTarget} — {ROLES[morning.donCheckResult]?.emoji} {ROLES[morning.donCheckResult]?.name}
          </p>
        </div>
      )}

      {killed.includes(playerName) && (
        <div style={{ ...S.card, ...S.center, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "var(--text2)", margin: 0 }}>💀 Тебе вбили цієї ночі. Тепер ти спостерігач.</p>
        </div>
      )}

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 10px" }}>Живі ({alive.length})</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {gameState.players.map(p => (
            <span key={p.name} style={{
              ...S.chip, padding: "4px 12px",
              background: p.isDead ? "transparent" : "var(--bg3)",
              color: p.isDead ? "var(--text2)" : "var(--text)",
              border: `1px solid ${p.isDead ? "rgba(255,255,255,0.05)" : "var(--bg3)"}`,
              opacity: p.isDead ? 0.45 : 1,
              textDecoration: p.isDead ? "line-through" : "none",
            }}>{p.name}</span>
          ))}
        </div>
      </div>

      {isHost
        ? <button className="btn-primary" onClick={onContinue}>☀️ Почати обговорення</button>
        : <div style={{ ...S.card, ...S.center }}><p style={S.sub}>⏳ Очікуємо ведучого...</p></div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: DAY DISCUSSION
═══════════════════════════════════════════════ */
function DayDiscussionScreen({ gameState, playerName, isHost, onStartVoting }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const timerEnd = gameState.day?.timerEnd;
  const alive = gameState.players.filter(p => !p.isDead);

  useEffect(() => {
    if (!timerEnd) return;
    const tick = () => setTimeLeft(Math.max(0, Math.floor((new Date(timerEnd) - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [timerEnd]);

  const mins = timeLeft != null ? Math.floor(timeLeft / 60) : null;
  const secs = timeLeft != null ? timeLeft % 60 : null;
  const urgent = timeLeft != null && timeLeft < 30;

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.4s ease" }}>
      <div style={S.center}>
        <div style={{ fontSize: "2.5rem" }}>☀️</div>
        <h1 style={S.heading}>День. Обговорення</h1>
        <p style={{ ...S.sub, maxWidth: 260, textAlign: "center" }}>Обговорюйте підозрілих. Знайдіть мафію!</p>
      </div>

      {timeLeft != null && (
        <div style={{ ...S.card, ...S.center, gap: 4, background: urgent ? "rgba(252,92,92,0.07)" : "var(--bg2)", border: `1px solid ${urgent ? "rgba(252,92,92,0.3)" : "var(--bg3)"}` }}>
          <p style={{ ...S.sub, fontSize: "0.75rem" }}>Час на обговорення</p>
          <p style={{ fontSize: "2.8rem", fontWeight: 800, margin: 0, color: urgent ? "#fc5c5c" : "var(--text)", fontVariantNumeric: "tabular-nums", animation: urgent ? "maf-pulse 1s ease infinite" : "none" }}>
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
          </p>
          {timeLeft === 0 && <p style={{ color: "#fc5c5c", margin: 0, fontWeight: 600 }}>Час вийшов!</p>}
        </div>
      )}

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 10px" }}>Живі гравці ({alive.length})</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {alive.map((p, i) => (
            <div key={p.name} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              background: p.name === playerName ? "rgba(167,139,250,0.1)" : "var(--bg3)",
              borderRadius: "var(--radius-sm)",
              border: p.name === playerName ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
            }}>
              <span style={{ color: "var(--text2)", width: 18, fontSize: "0.8rem" }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: p.name === playerName ? 700 : 400 }}>{p.name}</span>
              {p.name === playerName && <span style={S.sub}>ти</span>}
            </div>
          ))}
        </div>
      </div>

      {isHost
        ? <button className="btn-primary" onClick={onStartVoting} style={{ background: "linear-gradient(135deg,#e53e3e,#fc5c5c)" }}>🗳️ Перейти до голосування</button>
        : <div style={{ ...S.card, ...S.center }}><p style={S.sub}>⏳ Ведучий переводить до голосування</p></div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: VOTING
═══════════════════════════════════════════════ */
function VotingScreen({ gameState, playerName, isHost, onUpdateRoom }) {
  const alive = gameState.players.filter(p => !p.isDead);
  const myPlayer = gameState.players.find(p => p.name === playerName);
  const isAlive = !myPlayer?.isDead;
  const voting = gameState.voting || {};
  const votes = voting.votes || {};
  const myVote = votes[playerName];

  const counts = {};
  alive.forEach(p => { const v = votes[p.name]; if (v) counts[v] = (counts[v] || 0) + 1; });
  const totalVoted = Object.keys(votes).filter(n => alive.some(p => p.name === n)).length;

  async function castVote(target) {
    if (!isAlive) return;
    await onUpdateRoom({ ...gameState, voting: { ...voting, votes: { ...votes, [playerName]: target } } });
  }
  async function finalize() {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let eliminated = null;
    if (entries.length > 0 && (entries.length === 1 || entries[0][1] !== entries[1][1])) eliminated = entries[0][0];
    const newPlayers = gameState.players.map(p => ({ ...p, isDead: p.isDead || p.name === eliminated }));
    await onUpdateRoom({ ...gameState, phase: "execution", players: newPlayers, voting: { ...voting, eliminated } });
  }

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.4s ease" }}>
      <div style={S.center}>
        <div style={{ fontSize: "2.5rem" }}>🗳️</div>
        <h1 style={S.heading}>Голосування</h1>
        <p style={S.sub}>Проголосовано: {totalVoted} / {alive.length}</p>
      </div>

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 12px" }}>Кого виключити?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alive.map(p => {
            const cnt = counts[p.name] || 0;
            const pct = alive.length ? (cnt / alive.length) * 100 : 0;
            const isChoice = myVote === p.name;
            const canVote = isAlive && p.name !== playerName;
            return (
              <div key={p.name}>
                <div onClick={() => canVote && castVote(p.name)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: "var(--radius-sm)", cursor: canVote ? "pointer" : "default", transition: "all 0.15s",
                  background: isChoice ? "rgba(252,92,92,0.1)" : "var(--bg3)",
                  border: isChoice ? "1px solid rgba(252,92,92,0.4)" : "1px solid transparent",
                }}>
                  <span style={{ flex: 1, fontWeight: isChoice ? 700 : 400 }}>{p.name}</span>
                  {p.name === playerName && <span style={S.sub}>ти</span>}
                  {cnt > 0 && <span style={{ color: "#fc5c5c", fontWeight: 700, fontSize: "1.1rem" }}>{cnt}</span>}
                </div>
                {cnt > 0 && (
                  <div style={{ height: 3, background: "rgba(252,92,92,0.12)", borderRadius: 999, marginTop: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#e53e3e,#fc5c5c)", borderRadius: 999, transition: "width 0.6s ease" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isAlive && <div style={{ ...S.card, ...S.center }}><p style={S.sub}>💀 Мертві не голосують</p></div>}
      {isAlive && myVote && (
        <div style={{ ...S.card, ...S.center, background: "rgba(252,92,92,0.07)", border: "1px solid rgba(252,92,92,0.2)" }}>
          <p style={{ color: "#fc5c5c", margin: 0 }}>✓ Твій голос: <strong>{myVote}</strong></p>
        </div>
      )}
      {isHost && <button className="btn-primary" onClick={finalize} style={{ background: "linear-gradient(135deg,#c53030,#fc5c5c)" }}>⚖️ Підрахувати голоси</button>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: EXECUTION
═══════════════════════════════════════════════ */
function ExecutionScreen({ gameState, playerName, isHost, onNextNight }) {
  const eliminated = gameState.voting?.eliminated;
  const ep = gameState.players.find(p => p.name === eliminated);
  const role = ROLES[ep?.role] || ROLES.civilian;

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.5s ease" }}>
      <div style={S.center}><div style={{ fontSize: "2.5rem" }}>⚖️</div><h1 style={S.heading}>Вирок міста</h1></div>

      {eliminated ? (
        <div style={{
          ...S.card, ...S.center, gap: 16, padding: "32px 24px",
          background: `${role.color}0f`, border: `2px solid ${role.color}44`, boxShadow: role.glow,
          animation: "maf-roleReveal 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ fontSize: "3rem" }}>🪓</div>
          <h2 style={{ color: "#fc5c5c", fontWeight: 800, fontSize: "1.5rem", margin: 0 }}>{eliminated}</h2>
          <p style={{ ...S.sub, margin: 0 }}>виключений рішенням міста</p>
          <div style={{ padding: "12px 24px", borderRadius: "var(--radius-sm)", background: `${role.color}18`, border: `1px solid ${role.color}40`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{role.emoji}</span>
            <span style={{ fontWeight: 700, color: role.color, fontSize: "1.05rem" }}>{role.name}</span>
          </div>
          {eliminated === playerName && <p style={{ ...S.sub, margin: 0 }}>Ти вибув. Спостерігай мовчки.</p>}
        </div>
      ) : (
        <div style={{ ...S.card, ...S.center, gap: 12, background: "rgba(104,211,145,0.07)", border: "1px solid rgba(104,211,145,0.25)" }}>
          <div style={{ fontSize: "2.5rem" }}>🤝</div>
          <h2 style={{ color: "#68d391", fontWeight: 700, margin: 0 }}>Нічия!</h2>
          <p style={S.sub}>Голоси розділились — ніхто не виключений</p>
        </div>
      )}

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 10px" }}>Живі ({gameState.players.filter(p => !p.isDead).length})</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {gameState.players.map(p => (
            <span key={p.name} style={{
              ...S.chip, padding: "4px 12px",
              background: p.isDead ? "transparent" : "var(--bg3)",
              color: p.isDead ? "rgba(255,255,255,0.2)" : "var(--text)",
              textDecoration: p.isDead ? "line-through" : "none",
              border: `1px solid ${p.isDead ? "rgba(255,255,255,0.04)" : "transparent"}`,
            }}>{p.name}</span>
          ))}
        </div>
      </div>

      {isHost
        ? <button className="btn-primary" onClick={onNextNight}>🌙 Наступна ніч</button>
        : <div style={{ ...S.card, ...S.center }}><p style={S.sub}>⏳ Очікуємо ведучого...</p></div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SCREEN: END GAME
═══════════════════════════════════════════════ */
function EndGameScreen({ gameState, playerName, isHost, onRestart }) {
  const winner = gameState.winner;
  const myRole = gameState.players.find(p => p.name === playerName)?.role;
  const cfg = {
    mafia: { emoji: "🔫", color: "#fc5c5c", glow: "0 0 60px rgba(252,92,92,0.3)", title: "Мафія перемогла!", sub: "Темрява поглинула місто" },
    civilians: { emoji: "🕊️", color: "#68d391", glow: "0 0 60px rgba(104,211,145,0.3)", title: "Мирні перемогли!", sub: "Справедливість торжествує!" },
    maniac: { emoji: "🔪", color: "#b794f4", glow: "0 0 60px rgba(183,148,244,0.3)", title: "Маньяк переміг!", sub: "Жах оволодів містом..." },
  }[winner] || { emoji: "🎭", color: "var(--accent2)", glow: "", title: "Гра завершена", sub: "" };

  const isWinner =
    (winner === "mafia" && (myRole === "mafia" || myRole === "don")) ||
    (winner === "civilians" && myRole !== "mafia" && myRole !== "don" && myRole !== "maniac") ||
    (winner === "maniac" && myRole === "maniac");

  return (
    <div style={{ ...S.col, animation: "maf-fadeIn 0.5s ease" }}>
      <div style={{ ...S.card, ...S.center, gap: 16, padding: "40px 24px", background: `${cfg.color}0e`, border: `2px solid ${cfg.color}44`, boxShadow: cfg.glow }}>
        <div style={{ fontSize: "4rem", animation: "maf-roleReveal 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}>{cfg.emoji}</div>
        <h1 style={{ color: cfg.color, fontWeight: 800, fontSize: "1.8rem", margin: 0 }}>{cfg.title}</h1>
        <p style={{ ...S.sub, margin: 0 }}>{cfg.sub}</p>
        <div style={{ padding: "12px 24px", borderRadius: "var(--radius-sm)", background: isWinner ? "rgba(104,211,145,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${isWinner ? "rgba(104,211,145,0.3)" : "rgba(255,255,255,0.08)"}` }}>
          <p style={{ margin: 0, fontWeight: 700, color: isWinner ? "#68d391" : "var(--text2)" }}>
            {isWinner ? "🏆 Ти переміг!" : "💀 Ти програв цього разу"}
          </p>
        </div>
      </div>

      <div style={S.card}>
        <p style={{ ...S.label, margin: "0 0 12px" }}>Ролі всіх гравців</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {gameState.players.map(p => {
            const r = ROLES[p.role] || ROLES.civilian;
            return (
              <div key={p.name} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: p.name === playerName ? `${r.color}12` : p.isDead ? "transparent" : "var(--bg3)",
                borderRadius: "var(--radius-sm)", opacity: p.isDead ? 0.5 : 1,
                border: `1px solid ${p.name === playerName ? r.color + "44" : "transparent"}`,
              }}>
                <span style={{ fontSize: "1.2rem" }}>{r.emoji}</span>
                <span style={{ flex: 1, fontWeight: p.name === playerName ? 700 : 400, textDecoration: p.isDead ? "line-through" : "none" }}>{p.name}</span>
                <span style={{ color: r.color, fontSize: "0.85rem", fontWeight: 600 }}>{r.name}</span>
                {p.isDead && <span style={{ fontSize: "0.75rem" }}>💀</span>}
              </div>
            );
          })}
        </div>
      </div>

      {isHost ? (
        <button className="btn-primary" onClick={onRestart}
          style={{ background: "linear-gradient(135deg,var(--accent),var(--accent2))" }}>
          🔄 Нова гра
        </button>
      ) : (
        <div style={{ ...S.card, ...S.center }}>
          <p style={S.sub}>⏳ Очікуємо рішення ведучого...</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function MafiaGame() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [inRoom, setInRoom] = useState(false);

  const isHost = !!gameState && playerName === gameState.host;

  /* ── Inject CSS animations ──────────────────────── */
  useEffect(() => {
    const ID = "mafia-styles";
    if (document.getElementById(ID)) return;
    const el = document.createElement("style");
    el.id = ID;
    el.textContent = `
      @keyframes maf-twinkle  { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
      @keyframes maf-fadeIn   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes maf-slideIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
      @keyframes maf-roleReveal { from{opacity:0;transform:scale(0.75) rotateY(-20deg)} to{opacity:1;transform:scale(1) rotateY(0)} }
      @keyframes maf-pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
    `;
    document.head.appendChild(el);
    return () => { const e = document.getElementById(ID); if (e) e.remove(); };
  }, []);

  /* ── Reconnect from localStorage ────────────────── */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mafia_session") ?? "null");
      if (saved?.roomCode && saved?.playerName) {
        setPlayerName(saved.playerName);
        setRoomCode(saved.roomCode);
        setInRoom(true);
      }
    } catch { /* ignore */ }
  }, []);

  /* ── Save session (тільки після role_reveal, не в лобі) ─────────── */
  useEffect(() => {
    if (!gameState || !playerName || !roomCode) return;
    if (gameState.phase === "lobby") return; // лобі не зберігаємо
    const myPlayer = gameState.players?.find(p => p.name === playerName);
    localStorage.setItem("mafia_session", JSON.stringify({ roomCode, playerName, role: myPlayer?.role ?? null }));
  }, [gameState, playerName, roomCode]);

  /* ── Subscribe to room ──────────────────────────── */
  useEffect(() => {
    if (!roomCode) return;
    supabase.from("rooms").select("state").eq("code", roomCode).single()
      .then(({ data, error }) => {
        if (error || !data?.state) {
          // Room not found — clear stale session
          localStorage.removeItem("mafia_session");
          setInRoom(false);
          setRoomCode("");
          setPlayerName("");
          return;
        }
        setGameState(data.state);
      });
    const ch = supabase.channel(`mafia:${roomCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        p => {
          if (p.eventType === "DELETE" || (p.eventType === "UPDATE" && p.new?.state?.phase === "deleted")) {
            setError("Ведучий завершив гру.");
            localStorage.removeItem("mafia_session");
            setInRoom(false);
            setRoomCode("");
            setPlayerName("");
            setGameState(null);
          } else if (p.eventType === "UPDATE") {
            setGameState(p.new.state);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [roomCode]);

  /* ── Cleanup on Tab Close (Host Only) ────────────── */
  useEffect(() => {
    if (!isHost || !roomCode) return;
    const handleBeforeUnload = () => {
      // Use keepalive fetch to ensure request is sent before page unloads
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


  /* ── Game State Checks (Host Only) ──────────── */
  useEffect(() => {
    if (!isHost || !gameState) return;

    if (gameState.phase === "role_reveal") {
      const active = gameState.players.filter(p => !p.isLeft);
      if (active.length > 0 && active.every(p => p.isReady)) {
        updateRoom({
          ...gameState, phase: "night", nightNumber: 1,
          night: { mafiaTarget: null, mafiaVotes: {}, donCheckTarget: null, lastDoctorTarget: null, doctorTarget: null, detectiveTarget: null, maniacTarget: null, butterflyTarget: null },
        });
      }
    }

    // Check win condition instantly on any player death/leave
    if (["role_reveal", "night", "morning", "day", "voting", "execution"].includes(gameState.phase)) {
      const winner = checkWin(gameState.players);
      if (winner) {
        updateRoom({ ...gameState, phase: "endgame", winner });
      }
    }
  }, [gameState, isHost]); // eslint-disable-line

  async function updateRoom(ns) {
    await supabase.from("rooms").update({ state: ns, updated_at: new Date().toISOString() }).eq("code", roomCode);
  }

  /* ── Create room ─────────────────────────────────── */
  async function handleCreate(name) {
    setError("");
    const code = generateCode();
    const init = { phase: "lobby", host: name, players: [{ name }], nightNumber: 0, round: 0, winner: null, donCheckUsed: false, lobbyExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() };
    const { error: e } = await supabase.from("rooms").insert({ code, game: "mafia", state: init });
    if (e) { setError("Помилка створення. Спробуй ще раз."); return; }
    setPlayerName(name); setRoomCode(code); setInRoom(true);
  }

  /* ── Join room ───────────────────────────────────── */
  async function handleJoin(name, code) {
    setError("");
    const { data } = await supabase.from("rooms").select("state").eq("code", code).single();
    if (!data) { setError("Кімнату не знайдено."); return; }
    if (data.state.phase !== "lobby") { setError("Гра вже розпочалась."); return; }
    if (data.state.players.some(p => p.name === name)) { setError(`Ім'я "${name}" вже зайнято.`); return; }
    if (data.state.players.length >= 12) { setError("Кімната заповнена (макс. 12)."); return; }
    const ns = { ...data.state, players: [...data.state.players, { name }] };
    await supabase.from("rooms").update({ state: ns }).eq("code", code);
    setPlayerName(name); setRoomCode(code); setInRoom(true);
  }

  /* ── Leave room ──────────────────────────────────── */
  async function handleLeave() {
    if (isHost) {
      await supabase.from("rooms").update({ state: { phase: "deleted" } }).eq("code", roomCode);
      await supabase.from("rooms").delete().eq("code", roomCode);
    } else {
      if (gameState.phase === "lobby") {
        const ns = { ...gameState, players: gameState.players.filter(p => p.name !== playerName) };
        await supabase.from("rooms").update({ state: ns }).eq("code", roomCode);
      } else {
        const ns = {
          ...gameState,
          players: gameState.players.map(p => p.name === playerName ? { ...p, isDead: true, isLeft: true } : p)
        };
        await supabase.from("rooms").update({ state: ns }).eq("code", roomCode);
      }
    }
    localStorage.removeItem("mafia_session");
    setInRoom(false);
    setRoomCode("");
    setPlayerName("");
    setGameState(null);
  }

  /* ── Start game ──────────────────────────────────── */
  async function handleStart() {
    const players = assignRoles(gameState.players);
    await updateRoom({ ...gameState, phase: "role_reveal", players, nightNumber: 0, round: 1, winner: null, donCheckUsed: false, night: null, morning: null, voting: null });
  }

  /* ── Mark ready ──────────────────────────────────── */
  async function handleReady() {
    const players = gameState.players.map(p => p.name === playerName ? { ...p, isReady: true } : p);
    await updateRoom({ ...gameState, players });
  }

  /* ── Morning → Day ───────────────────────────────── */
  async function handleMorningContinue() {
    const winner = checkWin(gameState.players);
    if (winner) { await updateRoom({ ...gameState, phase: "endgame", winner }); return; }
    const timerEnd = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    await updateRoom({ ...gameState, phase: "day", day: { timerEnd } });
  }

  /* ── Day → Voting ────────────────────────────────── */
  async function handleStartVoting() {
    await updateRoom({ ...gameState, phase: "voting", voting: { votes: {}, eliminated: null } });
  }

  /* ── Execution → Night ───────────────────────────── */
  async function handleNextNight() {
    const winner = checkWin(gameState.players);
    if (winner) { await updateRoom({ ...gameState, phase: "endgame", winner }); return; }
    const nightNumber = (gameState.nightNumber || 0) + 1;
    await updateRoom({
      ...gameState, phase: "night", nightNumber, round: (gameState.round || 1) + 1,
      night: { mafiaTarget: null, mafiaVotes: {}, donCheckTarget: null, lastDoctorTarget: gameState.night?.lastDoctorTarget ?? null, doctorTarget: null, detectiveTarget: null, maniacTarget: null, butterflyTarget: null },
      morning: null,
    });
  }

  /* ── Restart ─────────────────────────────────────── */
  async function handleRestart() {
    const players = gameState.players.filter(p => !p.isLeft).map(p => ({ name: p.name }));
    await updateRoom({ ...gameState, phase: "lobby", players, winner: null, nightNumber: 0, round: 0, donCheckUsed: false, night: null, morning: null, voting: null, lobbyExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
  }

  /* ── Render ──────────────────────────────────────── */
  if (!inRoom) return <JoinScreen onCreateRoom={handleCreate} onJoinRoom={handleJoin} error={error} />;

  if (!gameState) return (
    <div style={{ ...S.center, padding: "48px 0", gap: 16 }}>
      <div style={{ fontSize: "2.5rem", animation: "maf-pulse 1.2s ease infinite" }}>⏳</div>
      <p style={{ color: "var(--text)", fontSize: "1rem", margin: 0 }}>Підключення до кімнати...</p>
      <p style={{ color: "var(--text2)", fontSize: "0.85rem", margin: 0 }}>Код: {roomCode}</p>
    </div>
  );

  const phase = gameState.phase;

  const showExit = phase !== "lobby";

  return (
    <>
      {showExit && createPortal(
        <button onClick={() => {
          if (window.confirm(isHost ? "Ви дійсно хочете завершити гру для всіх?" : "Ви дійсно хочете покинути гру?")) handleLeave();
        }} style={{
          position: "fixed", top: 16, right: 16, zIndex: 99999,
          background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.8)", borderRadius: "var(--radius-sm)", padding: "8px 12px",
          fontSize: "0.85rem", cursor: "pointer", backdropFilter: "blur(4px)",
        }}>
          🚪 Вихід
        </button>,
        document.body
      )}
      {phase === "lobby" && <LobbyScreen gameState={gameState} roomCode={roomCode} playerName={playerName} isHost={isHost} onStart={handleStart} onLeave={handleLeave} />}
      {phase === "role_reveal" && <RoleRevealScreen gameState={gameState} playerName={playerName} onReady={handleReady} />}
      {phase === "night" && <NightScreen gameState={gameState} playerName={playerName} isHost={isHost} onUpdateRoom={updateRoom} />}
      {phase === "morning" && <MorningResultsScreen gameState={gameState} playerName={playerName} isHost={isHost} onContinue={handleMorningContinue} />}
      {phase === "day" && <DayDiscussionScreen gameState={gameState} playerName={playerName} isHost={isHost} onStartVoting={handleStartVoting} />}
      {phase === "voting" && <VotingScreen gameState={gameState} playerName={playerName} isHost={isHost} onUpdateRoom={updateRoom} />}
      {phase === "execution" && <ExecutionScreen gameState={gameState} playerName={playerName} isHost={isHost} onNextNight={handleNextNight} />}
      {phase === "endgame" && <EndGameScreen gameState={gameState} playerName={playerName} isHost={isHost} onRestart={handleRestart} />}
    </>
  );
}
