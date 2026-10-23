import { describe, it, expect, vi } from "vitest";
import { HearthWordsManager } from "@/canvas/hearth-words";
import { renderHearthWords } from "@/canvas/hearth-word-renderer";
import { renderScaledHearth } from "@/canvas/render-scaled-hearth";
import { configureCanvasViewport } from "@/canvas/canvas-viewport";

describe("readable hearth presentation", () => {
  it("measures compact readable text and reserves matching 21px line heights without losing content", () => {
    const manager = new HearthWordsManager(); manager.words = [];
    const ctx = { font: "", measureText: (text: string) => ({ width: text.length * 15 }) } as unknown as CanvasRenderingContext2D;
    const text = "чувствую тепло и спокойствие рядом с людьми и хочу сохранить всю эту мысль";
    manager.addWord("font-test", text, "тепло", { id: 1, angle: 0, x: 900, y: 400, depth: 1, pulse: 0, spokenCount: 0 }, 640, 400, 580, 320, ctx);
    expect(ctx.font).toContain("16px");
    expect(manager.words.every(word => word.height === word.lines!.length * 21)).toBe(true);
    expect(manager.words.map(word => word.text).join("")).toBe(text);
  });

  it("draws readable resting/warm text with the same 21px leading", () => {
    const fonts: string[] = [], ys: number[] = [];
    const ctx = { font: "", save: vi.fn(), restore: vi.fn(), translate: vi.fn(), fillText: (_text: string, _x: number, y: number) => { fonts.push(ctx.font); ys.push(y); } };
    const word = { id: "text", text: "тепло", lines: ["тепло", "и тишина"], family: "тепло", seatId: 1, width: 100, x: 100, y: 100, targetX: 100, targetY: 100, born: Date.now()-10000, lastAt: Date.now()-10000, count: 1, settled: true, opacity: 1, breathOffset: 0 };
    renderHearthWords(ctx as unknown as CanvasRenderingContext2D, [word], [], 1000);
    expect(fonts.every(font => font.includes("15px"))).toBe(true);
    expect(ys[1]-ys[0]).toBe(21);
  });

  it("scales the hearth around its center without substituting heat or accumulating transforms", () => {
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn() };
    const flame = { render: vi.fn() };
    renderScaledHearth(ctx as unknown as CanvasRenderingContext2D, flame, 640, 400, 1000, 0);
    renderScaledHearth(ctx as unknown as CanvasRenderingContext2D, flame, 640, 400, 1000, 1);
    expect(ctx.scale).toHaveBeenCalledWith(0.8,0.8);
    expect(ctx.translate.mock.calls).toContainEqual([640,400]);
    expect(ctx.translate.mock.calls).toContainEqual([-640,-400]);
    expect(flame.render.mock.calls.map(call=>call[4])).toEqual([0,1]);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it("keeps CSS geometry and font sizes stable on a DPR2 backing store", () => {
    const canvas = { width: 0, height: 0 }, ctx = { setTransform: vi.fn() };
    configureCanvasViewport(canvas, ctx, 1280, 800, 2);
    expect(canvas).toEqual({ width: 2560, height: 1600 });
    expect(ctx.setTransform).toHaveBeenCalledWith(2,0,0,2,0,0);
  });
});
