import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SalonSpeechEngine } from "../src/speech/speech-engine";
import type { SpeechRecognitionInstanceLike } from "../src/speech/speech-types";

describe("SalonSpeechEngine", () => {
  let mockRecognition: SpeechRecognitionInstanceLike;

  beforeEach(() => {
    mockRecognition = {
      continuous: false,
      interimResults: false,
      lang: "",
      maxAlternatives: 1,
      start: vi.fn(function (this: SpeechRecognitionInstanceLike) {
        this.onstart?.(new Event("start"));
      }),
      stop: vi.fn(function (this: SpeechRecognitionInstanceLike) {
        this.onend?.(new Event("end"));
      }),
      abort: vi.fn(),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };

    function MockCtor() {
      return mockRecognition;
    }

    (globalThis as unknown as { window: Record<string, unknown> }).window = {
      webkitSpeechRecognition: MockCtor,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("detects browser speech recognition support", () => {
    const engine = new SalonSpeechEngine();
    expect(engine.isSupported()).toBe(true);
  });

  it("toggles listening state and triggers onStatusChange", () => {
    const statusCalls: boolean[] = [];
    const engine = new SalonSpeechEngine({
      onStatusChange: (active) => statusCalls.push(active),
    });

    const active = engine.toggle();
    expect(active).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalled();
    expect(statusCalls).toContain(true);

    const stopped = engine.toggle();
    expect(stopped).toBe(false);
    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it("dispatches final phrase on recognition result", () => {
    let capturedFinal = "";
    const engine = new SalonSpeechEngine({
      onFinalPhrase: (text) => {
        capturedFinal = text;
      },
    });

    engine.start();

    const resultEntry = Object.assign([{ transcript: "мне сейчас тревожно", confidence: 0.95 }], {
      isFinal: true,
      length: 1,
      item: () => ({ transcript: "мне сейчас тревожно", confidence: 0.95 }),
    });

    const fakeEvent = {
      resultIndex: 0,
      results: Object.assign([resultEntry], {
        length: 1,
        item: () => resultEntry,
      }),
    } as unknown as Event;

    mockRecognition.onresult?.(fakeEvent as unknown as Parameters<NonNullable<typeof mockRecognition.onresult>>[0]);
    expect(capturedFinal).toBe("мне сейчас тревожно");
  });
});
