import { useState } from "react";
import LocalGame from "./local";
import MultiplayerGame from "./multiplayer";

export default function UniversalBunker() {
  const [mode, setMode] = useState(null);

  if (mode === "local") return <LocalGame />;
  if (mode === "multiplayer") return <MultiplayerGame />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "10px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🏚️</div>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 900, background: "linear-gradient(180deg, #ffffff 0%, var(--accent2) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: "0 0 8px 0" }}>
          БУНКЕР
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "1rem", maxWidth: 400, margin: "0 auto", lineHeight: 1.5 }}>
          Катастрофа вже близько. Вирішіть, хто гідний потрапити у бункер і врятувати людство.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Local Mode Button */}
        <button 
          onClick={() => setMode("local")}
          style={{
            background: "linear-gradient(135deg, rgba(124, 106, 247, 0.15), rgba(26, 26, 36, 0.8))",
            border: "1px solid rgba(124, 106, 247, 0.4)",
            borderRadius: "var(--radius)",
            padding: "24px 20px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 20,
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            fontFamily: "inherit"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(124, 106, 247, 0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)"; }}
        >
          <div style={{ fontSize: "2.5rem", background: "var(--bg3)", borderRadius: "16px", width: 68, height: 68, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            📱
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.25rem", color: "var(--text)", fontWeight: 800 }}>Грати локально</h3>
            <p style={{ margin: 0, color: "var(--text2)", fontSize: "0.85rem", lineHeight: 1.45 }}>
              Всі гравці використовують один пристрій (передача по колу). Підходить для гри поряд один з одним.
            </p>
          </div>
        </button>

        {/* Multiplayer Mode Button */}
        <button 
          onClick={() => setMode("multiplayer")}
          style={{
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(26, 26, 36, 0.8))",
            border: "1px solid rgba(249, 115, 22, 0.4)",
            borderRadius: "var(--radius)",
            padding: "24px 20px",
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 20,
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            fontFamily: "inherit"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(249, 115, 22, 0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)"; }}
        >
          <div style={{ fontSize: "2.5rem", background: "var(--bg3)", borderRadius: "16px", width: 68, height: 68, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            🌐
          </div>
          <div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.25rem", color: "var(--text)", fontWeight: 800 }}>Грати онлайн</h3>
            <p style={{ margin: 0, color: "var(--text2)", fontSize: "0.85rem", lineHeight: 1.45 }}>
              Кожен гравець використовує власний смартфон. Підходить для більшого занурення та таємності.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
