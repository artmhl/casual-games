import { Link } from "react-router-dom";

export default function GamePage({ game }) {
  const GameComponent = game.component;

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
        <div id="game-header-action" style={{ minWidth: 80, display: "flex", justifyContent: "flex-end" }} />
      </header>

      <main className="game-main">
        <GameComponent />
      </main>
    </div>
  );
}
