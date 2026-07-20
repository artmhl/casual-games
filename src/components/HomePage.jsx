import { Link } from "react-router-dom";

export default function HomePage({ games }) {
  const multiplayerGames = games.filter(g => g.tags?.includes("мультиплеєр"));
  const localGames = games.filter(g => !g.tags?.includes("мультиплеєр"));

  const renderGameCard = (game, isMultiplayer) => (
    <Link
      key={game.slug}
      to={`/games/${game.slug}`}
      className={`game-card ${isMultiplayer ? "multiplayer" : ""}`}
    >
      {isMultiplayer && (
        <div className="online-badge">Online</div>
      )}
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
      {!isMultiplayer && <span className="game-card-arrow">→</span>}
    </Link>
  );

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
          <>
            {multiplayerGames.length > 0 && (
              <>
                <h2 className="section-title">🌐 Онлайн Мультиплеєр</h2>
                <div className="games-grid">
                  {multiplayerGames.map((g) => renderGameCard(g, true))}
                </div>
              </>
            )}

            {localGames.length > 0 && (
              <>
                <h2 className="section-title">📱 На одному пристрої</h2>
                <div className="games-grid">
                  {localGames.map((g) => renderGameCard(g, false))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
