import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { clientLogger } from "../src/infrastructure/client-logger";
import { WhisperSpeechAdapter } from "../src/speech/whisper-speech-adapter";
import { transcribeAudioBlob } from "../src/speech/whisper-client";
import { transcribeAudioBlobOpenAi } from "../src/speech/openai-speech-client";
import { createClientLoggerHandler } from "../server/client-logger-handler";

const SENTINEL = "SYNTHETIC_PRIVATE_SPEECH_SENTINEL";
const collectLogs = (spies: ReturnType<typeof vi.spyOn>[]) => JSON.stringify(spies.flatMap((s) => s.mock.calls));

describe("Privacy-Safe Diagnostic Logging", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    consoleSpies = [logSpy, warnSpy, errorSpy];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("Browser Client Logger Sinks (console, fetch, sendBeacon)", () => {
    it("does not log unallowlisted free-form message containing sentinel to console", () => {
      (clientLogger as unknown as { info: (msg: unknown) => void }).info(SENTINEL);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });

    it("does not dispatch unallowlisted free-form message containing sentinel over fetch", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
      (clientLogger as unknown as { info: (msg: unknown, details?: unknown) => void }).info("regular_event", { speech: SENTINEL });
      const fetchBodies = fetchSpy.mock.calls.map((c) => String(c[1]?.body ?? ""));
      expect(JSON.stringify(fetchBodies)).not.toContain(SENTINEL);
    });

    it("does not dispatch unallowlisted free-form message containing sentinel over sendBeacon", () => {
      let beaconData = "";
      const sendBeaconMock = vi.fn((_url: string, data?: BodyInit | null) => {
        if (data instanceof Blob) beaconData = "blob-dispatched";
        return true;
      });
      vi.stubGlobal("navigator", { sendBeacon: sendBeaconMock });
      (clientLogger as unknown as { error: (msg: unknown) => void }).error(SENTINEL);
      expect(beaconData).not.toContain(SENTINEL);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });
  });

  describe("ASR Successful Callback vs Diagnostic Privacy", () => {
    it("delivers recognized speech intact to onFinalPhrase callback but never leaks it to console or network logs", async () => {
      const onFinalPhrase = vi.fn();
      const adapter = new WhisperSpeechAdapter({ onFinalPhrase }, "http://127.0.0.1:8085");
      const mockRecorder = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(new Blob([])),
        extractCurrentSegment: vi.fn().mockReturnValue(new Blob(["speech audio"], { type: "audio/webm" })),
        hasSpeechInCurrentSegment: vi.fn().mockReturnValue(true),
        cleanup: vi.fn(),
        isRecording: true,
      };
      (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

      const fetchCalls: { url: string; body?: string }[] = [];
      vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        fetchCalls.push({ url: String(url), body: init?.body ? String(init.body) : undefined });
        if (String(url).includes("/api/client-log")) return new Response(null, { status: 204 });
        return new Response(JSON.stringify({ text: SENTINEL }), { status: 200 });
      });

      await adapter.start();
      adapter.flush();
      await new Promise((r) => setTimeout(r, 20));

      expect(onFinalPhrase).toHaveBeenCalledWith(SENTINEL, undefined);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
      const clientLogCalls = fetchCalls.filter((c) => c.url.includes("/api/client-log"));
      expect(JSON.stringify(clientLogCalls)).not.toContain(SENTINEL);
    });
  });

  describe("ASR HTTP and Network Error Path", () => {
    it("Whisper client throws generic status message without leaking error response body, and does not log sentinel", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(SENTINEL, { status: 500, statusText: "Internal Server Error" }));
      const fakeBlob = new Blob(["audio"], { type: "audio/webm" });
      let error: Error | null = null;
      try { await transcribeAudioBlob(fakeBlob); } catch (e) { error = e instanceof Error ? e : new Error(String(e)); }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Whisper server responded with HTTP 500");
      expect(error?.message).not.toContain(SENTINEL);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });

    it("OpenAI speech client throws generic status message without leaking error response body, and does not log sentinel", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(SENTINEL, { status: 502, statusText: "Bad Gateway" }));
      const fakeBlob = new Blob(["audio"], { type: "audio/wav" });
      let error: Error | null = null;
      try { await transcribeAudioBlobOpenAi(fakeBlob); } catch (e) { error = e instanceof Error ? e : new Error(String(e)); }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("ASR server responded with HTTP 502");
      expect(error?.message).not.toContain(SENTINEL);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });

    it("network exception does not leak error message or stack to diagnostic logs", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(SENTINEL));
      const fakeBlob = new Blob(["audio"], { type: "audio/webm" });
      await expect(transcribeAudioBlob(fakeBlob)).rejects.toThrow();
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });
  });

  describe("Server /api/client-log Handler Boundary", () => {
    let server: Server;
    let base: string;

    beforeEach(async () => {
      const handler = createClientLoggerHandler();
      server = createServer((req, res) => { handler(req, res); });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("Server address unavailable");
      base = `http://127.0.0.1:${addr.port}`;
    });

    afterEach(async () => {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    });

    it("rejects non-POST methods with 405 Method Not Allowed", async () => {
      const res = await fetch(`${base}/api/client-log`, { method: "GET" });
      expect(res.status).toBe(405);
    });

    it("rejects cross-origin requests with 403 Forbidden", async () => {
      const res = await fetch(`${base}/api/client-log`, {
        method: "POST",
        headers: { Origin: "https://evil-cross-origin.com", "Content-Type": "application/json" },
        body: JSON.stringify({ level: "info", event: "meeting_audio_no_tracks", timestamp: new Date().toISOString() }),
      });
      expect(res.status).toBe(403);
    });

    it("rejects oversized payloads (> 4KB) with 413 Payload Too Large", async () => {
      const oversized = JSON.stringify({ level: "info", event: "meeting_audio_no_tracks", padding: "x".repeat(8192) });
      const res = await fetch(`${base}/api/client-log`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: oversized,
      });
      expect(res.status).toBe(413);
    });

    it("rejects malformed JSON with 400 Bad Request without logging sentinel", async () => {
      const res = await fetch(`${base}/api/client-log`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: `{ "broken": "${SENTINEL}"`,
      });
      expect(res.status).toBe(400);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });

    it("rejects direct adversarial unallowlisted submission with 400 and does not reflect sentinel to console", async () => {
      const res = await fetch(`${base}/api/client-log`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ level: "info", message: SENTINEL, details: { secret: SENTINEL }, timestamp: new Date().toISOString() }),
      });
      expect(res.status).toBe(400);
      expect(collectLogs(consoleSpies)).not.toContain(SENTINEL);
    });

    it("accepts same-origin allowlisted technical log event with 204 No Content", async () => {
      const res = await fetch(`${base}/api/client-log`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "info",
          event: "asr_phrase_recognized",
          details: { provider: "whisper", charCount: 24, seatNumber: 3 },
          timestamp: new Date().toISOString(),
        }),
      });
      expect(res.status).toBe(204);
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
