import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="page not-found-page">
      <span className="not-found-icon">🔍</span>
      <h1>Сторінку не знайдено</h1>
      <p>Можливо, гра ще не додана або адресу вказано неправильно.</p>
      <Link to="/" className="btn-primary">
        На головну
      </Link>
    </div>
  );
}
