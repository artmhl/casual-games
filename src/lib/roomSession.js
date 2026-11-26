/**
 * ROOM SESSION & CLEANUP HELPERS
 * ===============================
 * Платформний модуль збереження сесії та прибирання старих кімнат
 * для всіх мультиплеєрних ігор порталу.
 *
 * Використання в грі:
 *   import {
 *     saveRoomSession,
 *     loadRoomSession,
 *     clearRoomSession,
 *     cleanupStaleRooms,
 *   } from "../../lib/roomSession";
 *
 * Особливості:
 * - Зберігає дані в localStorage з автоматичним резервом у cookie
 *   (стабільно працює на iOS Safari, Android Chrome і при обмеженнях сховища).
 * - Підтримує TTL (за замовчуванням 4 години).
 * - Не залежить від React і може викликатись у лінивих ініціалізаторах useState.
 */

const KEY_PREFIX = "gamehub_session_";
const DEFAULT_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 години
const DEFAULT_STALE_ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 години

function storageKey(gameSlug) {
  return `${KEY_PREFIX}${gameSlug}`;
}

function readCookie(name) {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const parts = document.cookie ? document.cookie.split("; ") : [];
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        return decodeURIComponent(part.slice(prefix.length));
      }
    }
  } catch {
    // Ігноруємо обмеження середовища
  }
  return null;
}

function writeCookie(name, value, maxAgeSec) {
  if (typeof document === "undefined") return;
  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
  } catch {
    // Ігноруємо обмеження середовища
  }
}

/**
 * Зберігає активну сесію кімнати (localStorage + cookie fallback).
 */
export function saveRoomSession(gameSlug, session, ttlMs = DEFAULT_SESSION_TTL_MS) {
  if (!gameSlug || !session?.roomCode || !session?.playerName) return;

  const key = storageKey(gameSlug);
  const payload = JSON.stringify({
    ...session,
    roomCode: String(session.roomCode).toUpperCase().trim(),
    playerName: String(session.playerName).trim(),
    savedAt: Date.now(),
  });

  try {
    localStorage.setItem(key, payload);
  } catch {
    // У приватному режимі мобільних браузерів localStorage може бути недоступним
  }
  writeCookie(key, payload, Math.floor(ttlMs / 1000));
}

/**
 * Повертає збережену сесію кімнати або null, якщо її немає / минув TTL.
 */
export function loadRoomSession(gameSlug, ttlMs = DEFAULT_SESSION_TTL_MS) {
  if (!gameSlug) return null;

  const key = storageKey(gameSlug);
  let raw = null;

  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (!raw) {
    raw = readCookie(key);
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.roomCode || !parsed?.playerName) return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > ttlMs) {
      clearRoomSession(gameSlug);
      return null;
    }
    return {
      ...parsed,
      roomCode: String(parsed.roomCode).toUpperCase().trim(),
      playerName: String(parsed.playerName).trim(),
    };
  } catch {
    clearRoomSession(gameSlug);
    return null;
  }
}

/**
 * Повністю очищає збережену сесію (і localStorage, і cookie).
 */
export function clearRoomSession(gameSlug) {
  if (!gameSlug) return;
  const key = storageKey(gameSlug);
  try {
    localStorage.removeItem(key);
  } catch {
    // Ігноруємо
  }
  writeCookie(key, "", 0);
}

/**
 * Неблокуюче видаляє старі покинуті кімнати конкретної гри (старші за ttlMs).
 * Викликай у createRoom(), щоб таблиця rooms не накопичувала «мертві» записи
 * без потреби вбивати кімнату на beforeunload.
 */
export function cleanupStaleRooms(supabase, gameSlug, ttlMs = DEFAULT_STALE_ROOM_TTL_MS) {
  if (!supabase || !gameSlug) return;
  const cutoff = new Date(Date.now() - ttlMs).toISOString();
  supabase
    .from("rooms")
    .delete()
    .eq("game", gameSlug)
    .lt("updated_at", cutoff)
    .then(() => {})
    .catch(() => {});
}

