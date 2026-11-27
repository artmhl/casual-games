import { useState } from "react";
import { Link } from "react-router-dom";
import {
  loadLocalSession,
  clearLocalSession,
  shouldPromptLocalResume,
} from "../lib/localSession";
import { loadRoomSession } from "../lib/roomSession";

function formatTimeAgo(savedAt) {
  if (!savedAt) return "нещодавно";
  const mins = Math.max(0, Math.floor((Date.now() - savedAt) / 60000));
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв тому`;
  const hours = Math.floor(mins / 60);
  return `${hours} год тому`;
}

export default function GamePage({ game }) {
  return <GamePageInner key={game.slug} game={game} />;
}

function GamePageInner({ game }) {
  const GameComponent = game.component;

  const [showResumePrompt, setShowResumePrompt] = useState(() => {
    // Якщо активна мультиплеєрна кімната — не перекриваємо її локальним екраном
    if (loadRoomSession(game.slug)) return false;
    return Boolean(loadLocalSession(game.slug) && shouldPromptLocalResume());
  });

  const [savedAt] = useState(() => loadLocalSession(game.slug)?.savedAt || null);

  function handleContinue() {
    setShowResumePrompt(false);
  }

  function handleNewGame() {
    clearLocalSession(game.slug);
    setShowResumePrompt(false);
  }

  return (
    <div className="page game-page">
      <header className="game-header">
        <Link to="/" className="back-btn">
          ← Назад
        </Link>
        <div className="game-header-title">
          <span>{game.emoji}</span>
          <span>{game.title}</span>
        </div>
        <div
          id="game-header-action"
          style={{ minWidth: 80, display: "flex", justifyContent: "flex-end" }}
        />
      </header>

      <main className="game-main">
        {showResumePrompt ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              padding: "24px 0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: "var(--bg2)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
                borderRadius: "var(--radius)",
                padding: "32px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 12px 32px rgba(124, 106, 247, 0.12)",
              }}
            >
              <div style={{ fontSize: "3.4rem", lineHeight: 1 }}>{game.emoji}</div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--accent2)",
                  background: "rgba(124, 106, 247, 0.15)",
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                Збережена партія · {formatTimeAgo(savedAt)}
              </span>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: "4px 0 0" }}>
                Продовжити гру?
              </h2>
              <p
                style={{
                  color: "var(--text2)",
                  fontSize: "0.95rem",
                  lineHeight: 1.5,
                  maxWidth: 320,
                  margin: 0,
                }}
              >
                У грі «{game.title}» залишилась незавершена локальна партія. Можеш повернутися до неї або почати нову.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn-primary" onClick={handleContinue}>
                ▶ Продовжити гру
              </button>
              <button className="btn-secondary" onClick={handleNewGame}>
                🔄 Нова гра
              </button>
            </div>
          </div>
        ) : (
          <GameComponent />
        )}
      </main>
    </div>
  );
}
