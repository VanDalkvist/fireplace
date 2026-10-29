import { describe, it, expect, vi, beforeEach } from "vitest";
import { clientLogger } from "../src/infrastructure/client-logger";

describe("ClientLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formats and dispatches allowlisted technical events via beacon or fetch without throwing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    expect(() => {
      clientLogger.info({ event: "meeting_audio_captured", trackCount: 1 });
      clientLogger.warn({ event: "meeting_audio_no_tracks" });
      clientLogger.error({ event: "asr_http_error", provider: "whisper", statusCode: 500 });
    }).not.toThrow();

    expect(fetchSpy).toHaveBeenCalled();
  });
});
