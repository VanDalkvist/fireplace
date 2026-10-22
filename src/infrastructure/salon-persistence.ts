/**
 * Salon Persistence: LocalStorage Sync for Words, Fire State, and Participants.
 * Guarantees words, circular positions, and campfire warmth survive page reload.
 * Compliance: AP-019 (<= 250 lines), AP-022 (explicit warn on storage failure), AP-029 (strict TS)
 */

import type { HearthWordItem } from "@/canvas/hearth-words";
import type { SessionState } from "@/domain/types";

const WORDS_KEY = "salon_presence_words_v1";
const SESSION_KEY = "salon_presence_session_v1";

export interface PersistedSession {
  session: SessionState;
  heat: number;
  savedAt: number;
}

export function saveHearthWordsPersistence(words: HearthWordItem[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const serialized = words.map((w) => ({
      id: w.id,
      text: w.text,
      family: w.family,
      seatId: w.seatId,
      width: w.width,
      x: w.targetX, // Store at target position so reload doesn't re-animate flight
      y: w.targetY,
      targetX: w.targetX,
      targetY: w.targetY,
      born: w.born,
      lastAt: w.lastAt,
      count: w.count,
      settled: true,
      opacity: w.opacity,
      breathOffset: w.breathOffset,
    }));
    localStorage.setItem(WORDS_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.warn("[SalonPersistence] Failed to save words:", err);
  }
}

export function loadHearthWordsPersistence(): HearthWordItem[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(WORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HearthWordItem[]) : [];
  } catch (err) {
    console.warn("[SalonPersistence] Failed to load words:", err);
    return [];
  }
}

export function saveSessionPersistence(session: SessionState, heat: number): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload: PersistedSession = {
      session,
      heat,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[SalonPersistence] Failed to save session:", err);
  }
}

export function loadSessionPersistence(): PersistedSession | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch (err) {
    console.warn("[SalonPersistence] Failed to load session:", err);
    return null;
  }
}

export function clearAllSalonPersistence(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(WORDS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("salon_presence_links");
  } catch (err) {
    console.warn("[SalonPersistence] Failed to clear persistence:", err);
  }
}
