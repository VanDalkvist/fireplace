import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HearthWordsManager } from "../src/canvas/hearth-words";
import type { IsometricSeat } from "../src/canvas/hearth-seats";
import { loadHearthWordsPersistence } from "../src/infrastructure/salon-persistence";

const seat: IsometricSeat = { id: 1, angle: 0, x: 900, y: 400, depth: 1, pulse: 0, spokenCount: 0 };
const ctx = { font: "", measureText: (s: string) => ({ width: Array.from(s).length * 11 }) } as unknown as CanvasRenderingContext2D;
const text = Array.from({ length: 110 }, (_, i) => `смысл${i}`).join(" ") + " последняя важная мысль";

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("lossless visual overflow of a single logical token", () => {
  it("keeps a wide five-line block outside the fire when it cannot fit beside it", () => {
    const slot = new HearthWordsManager().findSlot(0, 640, 640, 400, 580, 320, 120);
    expect(slot.y - 60).toBeGreaterThan(475);
  });
  it("keeps the entire phrase in several five-line blocks and preserves it after restore", () => {
    const manager = new HearthWordsManager();
    manager.addWord("long", text, "покой", seat, 640, 400, 580, 320, ctx);
    expect(manager.words.length).toBeGreaterThan(1);
    expect(manager.words.every(word => (word.lines?.length ?? 1) <= 5)).toBe(true);
    expect(manager.words.map(word => word.text).join("")).toBe(text);
    expect(manager.words.every(word => word.sourceId === "long")).toBe(true);
    expect(manager.words[0].sourceText).toBe(text);
    expect(manager.words.every(word => word.width <= 640)).toBe(true);
    expect(loadHearthWordsPersistence().map(word => word.text).join("")).toBe(text);
    expect(new HearthWordsManager().words[0].sourceText).toBe(text);
  });

  it("does not overlap the visual blocks of a long phrase on a desktop viewport", () => {
    const manager = new HearthWordsManager();
    const natural = "Я чувствую волнение перед встречей и одновременно радость от того, что могу говорить здесь открыто, без необходимости выглядеть сильнее, чем я есть. Мне важно оставаться рядом с людьми, слышать их и не торопить ни себя, ни других. Я замечаю усталость в теле, но вместе с ней появляется спокойствие и желание просто посидеть у огня. Я не хочу обрезать свою мысль на середине, потому что в её конце есть ещё одна важная часть. И мне важно, чтобы последняя мысль тоже осталась видимой.";
    const measured = { font: "", measureText: (s: string) => ({ width: s.length * 12.6 }) } as unknown as CanvasRenderingContext2D;
    manager.addWord("wide", natural, "покой", { ...seat, angle: -Math.PI / 2 }, 960, 540, 883, 421, measured);
    for (let a = 0; a < manager.words.length; a++) for (let b = a + 1; b < manager.words.length; b++) {
      const first = manager.words[a], second = manager.words[b];
      const overlaps = Math.abs(first.targetX - second.targetX) < (first.width + second.width) / 2 && Math.abs(first.targetY - second.targetY) < ((first.height ?? 24) + (second.height ?? 24)) / 2;
      expect(overlaps).toBe(false);
    }
  });

  it("updates and reflows all fragments without leaving old text or losing the final words", () => {
    const manager = new HearthWordsManager();
    manager.addWord("long", text, "покой", seat, 640, 400, 580, 320, ctx);
    const updated = text + " и продолжение в самом конце";
    manager.updateWordText("long", updated, "радость", ctx);
    expect(manager.words.map(word => word.text).join("")).toBe(updated);
    expect(manager.words[0].sourceText).toBe(updated);
    expect(manager.words.every(word => (word.lines?.length ?? 1) <= 5)).toBe(true);
    manager.repositionToViewport(200, 400, 180, 320, ctx);
    expect(manager.words.every(word => word.width <= 304)).toBe(true);
    expect(manager.words.map(word => word.text).join("")).toBe(updated);
  });
});
