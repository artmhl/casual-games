import { Link } from "react-router-dom";

export default function HomePage({ games }) {
  return (
    <div className="page home-page">
      <header className="home-header">
        <div className="home-title-wrap">
          <span className="home-logo">🎮</span>
          <h1 className="home-title">Ігри</h1>
        </div>
        <p className="home-subtitle">Казуальні ігри для компанії</p>
      </header>

      <main className="home-main">
        {games.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🚧</span>
            <h2>Ігор поки немає</h2>
            <p>Скоро тут з'являться нові ігри!</p>
          </div>
        ) : (
          <div className="games-grid">
            {games.map((game) => (
              <Link
                key={game.slug}
                to={`/games/${game.slug}`}
                className="game-card"
              >
                <span className="game-card-emoji">{game.emoji}</span>
                <div className="game-card-info">
                  <h2 className="game-card-title">{game.title}</h2>
                  <p className="game-card-desc">{game.description}</p>
                  {(game.minPlayers || game.maxPlayers) && (
                    <span className="game-card-players">
                      👥 {game.minPlayers}–{game.maxPlayers} гравців
                    </span>
                  )}
                  {game.tags && (
                    <div className="game-card-tags">
                      {game.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="game-card-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
