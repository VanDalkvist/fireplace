import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SalonSpeechEngine } from "../src/speech/speech-engine";
import type { SpeechRecognitionInstanceLike } from "../src/speech/speech-types";

describe("SalonSpeechEngine Resilience & Watchdog", () => {
  let mockRecognition: SpeechRecognitionInstanceLike;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("automatically restarts listening when Chrome fires unexpected onend during active session", () => {
    const engine = new SalonSpeechEngine();
    engine.start();
    expect(mockRecognition.start).toHaveBeenCalledTimes(1);

    // Simulate Chrome disconnecting due to silence
    mockRecognition.onend?.(new Event("end"));

    // Advance debounce timer
    vi.advanceTimersByTime(500);

    // Should have re-started
    expect(mockRecognition.start).toHaveBeenCalledTimes(2);
  });

  it("auto-finalizes pending interim phrase if silence lasts > 1400ms without server isFinal", () => {
    let capturedFinal = "";
    let capturedInterim = "";

    const engine = new SalonSpeechEngine({
      onInterimPhrase: (text) => { capturedInterim = text; },
      onFinalPhrase: (text) => { capturedFinal = text; },
    });

    engine.start();

    // Emit interim result
    const interimEntry = Object.assign([{ transcript: "чувствую спокойствие", confidence: 0.8 }], {
      isFinal: false,
      length: 1,
      item: () => ({ transcript: "чувствую спокойствие", confidence: 0.8 }),
    });

    const fakeEvent = {
      resultIndex: 0,
      results: Object.assign([interimEntry], {
        length: 1,
        item: () => interimEntry,
      }),
    } as unknown as Parameters<NonNullable<typeof mockRecognition.onresult>>[0];

    mockRecognition.onresult?.(fakeEvent);
    expect(capturedInterim).toBe("чувствую спокойствие");
    expect(capturedFinal).toBe("");

    // Advance time past the 1400ms silence threshold
    vi.advanceTimersByTime(1500);

    expect(capturedFinal).toBe("чувствую спокойствие");
  });

  it("does not restart on not-allowed permission error", () => {
    const engine = new SalonSpeechEngine();
    engine.start();

    mockRecognition.onerror?.({
      error: "not-allowed",
      message: "Microphone permission denied",
    } as Parameters<NonNullable<typeof mockRecognition.onerror>>[0]);

    mockRecognition.onend?.(new Event("end"));
    vi.advanceTimersByTime(1000);

    expect(mockRecognition.start).toHaveBeenCalledTimes(1); // not restarted
  });
});
