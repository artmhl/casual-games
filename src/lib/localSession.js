/**
 * LOCAL SESSION HELPERS (Pass-and-Play)
 * ======================================
 * Платформний модуль збереження стану локальних ігор (на одному пристрої).
 *
 * Використання в грі:
 *   import {
 *     useLocalSession,
 *     loadLocalPlayers,
 *     saveLocalPlayers,
 *     loadLocalPref,
 *     saveLocalPref,
 *     hasLocalSession,
 *     clearLocalSession,
 *   } from "../../lib/localSession";
 *
 * Особливості:
 * - Зберігає активну партію в localStorage (із fallback у sessionStorage) з TTL 4 год.
 * - Коли гра на екрані "setup", активна сесія автоматично очищається.
 * - При поверненні в гру через меню/«← Назад» GamePage автоматично показує
 *   екран «Продовжити гру / Нова гра» без дублювання коду в іграх.
 * - При звичайному перезавантаженні (F5 / pull-to-refresh) гра миттєво відновлюється.
 */

import { useState, useEffect, useCallback, useRef } from "react";

const SESSION_PREFIX = "gamehub_local_session_";
const PLAYERS_PREFIX = "gamehub_players_";
const PREF_PREFIX = "gamehub_pref_";
const DEFAULT_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 години

// Прапорець у пам'яті JS: скидається в false при повному перезавантаженні (F5),
// і стає true при SPA-переході через головну сторінку (включно з «← Назад»).
let hasVisitedHomeInMemory = false;

export function markHomeVisited() {
  hasVisitedHomeInMemory = true;
}

/**
 * Повертає true, якщо потрібно показати екран вибору «Продовжити / Нова гра»,
 * і false при прямому перезавантаженні активної гри (F5 / pull-to-refresh).
 */
export function shouldPromptLocalResume() {
  if (hasVisitedHomeInMemory) return true;
  if (typeof performance === "undefined") return true;
  try {
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav && nav.type === "reload") return false;
  } catch {
    // Ігноруємо обмеження середовища
  }
  return true;
}

function readStorage(key) {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // Fallback нижче
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  let saved = false;
  try {
    localStorage.setItem(key, value);
    saved = true;
  } catch {
    // Якщо localStorage заповнений/заблокований — пишемо в sessionStorage
  }
  if (!saved) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Ігноруємо
    }
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ігноруємо
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ігноруємо
  }
}

/* ── Активна локальна сесія (поточна партія) ──────────────────────────────── */

export function saveLocalSession(gameSlug, state) {
  if (!gameSlug || !state) return;
  try {
    const payload = JSON.stringify({ state, savedAt: Date.now() });
    writeStorage(`${SESSION_PREFIX}${gameSlug}`, payload);
  } catch {
    // Ігноруємо помилки серіалізації/квоти
  }
}

export function loadLocalSession(gameSlug, ttlMs = DEFAULT_SESSION_TTL_MS) {
  if (!gameSlug) return null;
  const raw = readStorage(`${SESSION_PREFIX}${gameSlug}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.state !== "object" || parsed.state === null) {
      clearLocalSession(gameSlug);
      return null;
    }
    if (parsed.savedAt && Date.now() - parsed.savedAt > ttlMs) {
      clearLocalSession(gameSlug);
      return null;
    }
    return { state: parsed.state, savedAt: parsed.savedAt || Date.now() };
  } catch {
    clearLocalSession(gameSlug);
    return null;
  }
}

export function hasLocalSession(gameSlug, ttlMs = DEFAULT_SESSION_TTL_MS) {
  return loadLocalSession(gameSlug, ttlMs) !== null;
}

export function clearLocalSession(gameSlug) {
  if (!gameSlug) return;
  removeStorage(`${SESSION_PREFIX}${gameSlug}`);
}

/* ── Постійні налаштування (список гравців, обрані категорії тощо) ────────── */

export function loadLocalPlayers(gameSlug, fallback = []) {
  if (!gameSlug) return fallback;
  const raw = readStorage(`${PLAYERS_PREFIX}${gameSlug}`);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalPlayers(gameSlug, players) {
  if (!gameSlug || !Array.isArray(players)) return;
  try {
    writeStorage(`${PLAYERS_PREFIX}${gameSlug}`, JSON.stringify(players));
  } catch {
    // Ігноруємо
  }
}

export function loadLocalPref(gameSlug, key, fallback) {
  if (!gameSlug || !key) return fallback;
  const raw = readStorage(`${PREF_PREFIX}${gameSlug}_${key}`);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveLocalPref(gameSlug, key, value) {
  if (!gameSlug || !key) return;
  try {
    writeStorage(`${PREF_PREFIX}${gameSlug}_${key}`, JSON.stringify(value));
  } catch {
    // Ігноруємо
  }
}

/* ── React-хук для автоматичного збереження локальної партії ─────────────── */

function defaultIsActive(state) {
  if (!state || typeof state !== "object") return false;
  if ("phase" in state) return Boolean(state.phase && state.phase !== "setup");
  if ("screen" in state) return Boolean(state.screen && state.screen !== "setup");
  return false;
}

/**
 * Хук для локальної гри: автоматично зберігає стан активної партії
 * та очищає його при поверненні у "setup" або виклику resetSession().
 *
 * @returns {[object, Function, Function]} [session, setSession, resetSession]
 */
export function useLocalSession(gameSlug, initialState, options = {}) {
  const { isActive = defaultIsActive, ttlMs = DEFAULT_SESSION_TTL_MS } = options;

  const initialRef = useRef(initialState);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const getInitial = useCallback(() => {
    const init = initialRef.current;
    return typeof init === "function" ? init() : init;
  }, []);

  const [state, setState] = useState(() => {
    const base = typeof initialState === "function" ? initialState() : initialState;
    const saved = loadLocalSession(gameSlug, ttlMs);
    if (saved?.state && isActive(saved.state)) {
      return { ...base, ...saved.state };
    }
    return base;
  });

  useEffect(() => {
    if (isActiveRef.current(state)) {
      saveLocalSession(gameSlug, state);
    } else {
      clearLocalSession(gameSlug);
    }
  }, [gameSlug, state]);

  const resetSession = useCallback(
    (overrides) => {
      clearLocalSession(gameSlug);
      const base = getInitial();
      setState(overrides ? { ...base, ...overrides } : base);
    },
    [gameSlug, getInitial]
  );

  return [state, setState, resetSession];
}

