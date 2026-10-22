import { describe, it, expect, vi, beforeEach } from "vitest";
import { SherpaSpeakerAdapter } from "../src/speaker/sherpa-speaker-adapter";

describe("SherpaSpeakerAdapter", () => {
  let adapter: SherpaSpeakerAdapter;

  beforeEach(() => {
    adapter = new SherpaSpeakerAdapter({ serviceUrl: "http://127.0.0.1:8086" });
    vi.restoreAllMocks();
  });

  it("checks availability and returns true on 200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as unknown as Response);

    const available = await adapter.isAvailable();
    expect(available).toBe(true);
  });

  it("identifies speaker from audio blob and returns seat number", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        matched: true,
        speakerId: "seat_4",
        seatNumber: 4,
        score: 0.88,
      }),
    } as unknown as Response);

    const blob = new Blob(["audio data"], { type: "audio/webm" });
    const result = await adapter.identify(blob);

    expect(result).not.toBeNull();
    expect(result?.matched).toBe(true);
    expect(result?.seatNumber).toBe(4);
    expect(result?.speakerId).toBe("seat_4");
  });

  it("degrades gracefully to null if identification service errors or times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const blob = new Blob(["audio data"], { type: "audio/webm" });
    const result = await adapter.identify(blob);

    expect(result).toBeNull();
  });

  it("resets voiceprints via POST /reset", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as unknown as Response);

    const ok = await adapter.reset();
    expect(ok).toBe(true);
  });
});
