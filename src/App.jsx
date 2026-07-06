import { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import games from "./games/registry";
import HomePage from "./components/HomePage";
import GamePage from "./components/GamePage";
import NotFound from "./components/NotFound";
import LoadingScreen from "./components/LoadingScreen";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage games={games} />} />
          {games.map((game) => (
            <Route
              key={game.slug}
              path={`/games/${game.slug}`}
              element={<GamePage game={game} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
