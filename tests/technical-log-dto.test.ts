import { describe, expect, it } from "vitest";
import {
  ALLOWED_EVENT_NAMES,
  sanitizeErrorType,
  sanitizeProvider,
  validateTechnicalLogPayload,
} from "../src/infrastructure/technical-log-dto";

describe("Technical Log DTO & Validator", () => {
  it("rejects non-object or malformed input", () => {
    expect(validateTechnicalLogPayload(null)).toBeNull();
    expect(validateTechnicalLogPayload(undefined)).toBeNull();
    expect(validateTechnicalLogPayload("string")).toBeNull();
    expect(validateTechnicalLogPayload(123)).toBeNull();
    expect(validateTechnicalLogPayload([])).toBeNull();
    expect(validateTechnicalLogPayload({})).toBeNull();
  });

  it("rejects invalid log level or missing event", () => {
    expect(validateTechnicalLogPayload({ level: "verbose", event: "meeting_audio_no_tracks" })).toBeNull();
    expect(validateTechnicalLogPayload({ level: "info", event: "unallowlisted_event" })).toBeNull();
    expect(validateTechnicalLogPayload({ level: "info" })).toBeNull();
  });

  it("sanitizes errorType properly", () => {
    expect(sanitizeErrorType(new Error("Secret error message"))).toBe("Error");
    expect(sanitizeErrorType("TypeError")).toBe("TypeError");
    expect(sanitizeErrorType("Injection; -- drop table")).toBe("unknown");
    expect(sanitizeErrorType(null)).toBe("unknown");
    expect(sanitizeErrorType("")).toBe("unknown");
  });

  it("sanitizes provider name properly", () => {
    expect(sanitizeProvider("Whisper Large Turbo")).toBe("whisper");
    expect(sanitizeProvider("openai-gigaam")).toBe("gigaam");
    expect(sanitizeProvider("<script>evil</script>")).toBe("unknown");
    expect(sanitizeProvider(123)).toBe("unknown");
  });

  it("validates meeting_audio_captured with bounded trackCount", () => {
    const valid = validateTechnicalLogPayload({
      level: "info",
      event: "meeting_audio_captured",
      details: { trackCount: 2, secret: "leak" },
    });
    expect(valid).toEqual({
      level: "info",
      event: "meeting_audio_captured",
      details: { trackCount: 2 },
      timestamp: expect.any(String),
    });
    // Rejects out of range trackCount
    expect(
      validateTechnicalLogPayload({
        level: "info",
        event: "meeting_audio_captured",
        details: { trackCount: -1 },
      })
    ).toBeNull();
    expect(
      validateTechnicalLogPayload({
        level: "info",
        event: "meeting_audio_captured",
        details: { trackCount: 999 },
      })
    ).toBeNull();
  });

  it("validates asr_phrase_recognized and drops any phrase or speech text", () => {
    const valid = validateTechnicalLogPayload({
      level: "info",
      event: "asr_phrase_recognized",
      provider: "whisper",
      charCount: 42,
      seatNumber: 3,
      text: "private spoken words",
      phrase: "private phrase",
      transcript: "confidential",
    });
    expect(valid).toEqual({
      level: "info",
      event: "asr_phrase_recognized",
      details: { provider: "whisper", charCount: 42, seatNumber: 3 },
      timestamp: expect.any(String),
    });
    // Details must NOT contain text, phrase or transcript
    expect((valid?.details as Record<string, unknown>)?.text).toBeUndefined();
    expect((valid?.details as Record<string, unknown>)?.phrase).toBeUndefined();
    expect((valid?.details as Record<string, unknown>)?.transcript).toBeUndefined();
  });

  it("validates asr_http_error and drops remote response body or URL", () => {
    const valid = validateTechnicalLogPayload({
      level: "error",
      event: "asr_http_error",
      details: {
        provider: "openai",
        statusCode: 502,
        blobSize: 1024,
        body: "Stack trace and internal database error",
        url: "http://internal-service:8080/api/keys?token=secret",
      },
    });
    expect(valid).toEqual({
      level: "error",
      event: "asr_http_error",
      details: { provider: "openai", statusCode: 502, blobSize: 1024 },
      timestamp: expect.any(String),
    });
  });

  it("supports all 12 allowlisted event names", () => {
    for (const eventName of ALLOWED_EVENT_NAMES) {
      const sample = validateTechnicalLogPayload({
        level: "warn",
        event: eventName,
        details: {
          trackCount: 1,
          charCount: 1,
          blobSize: 100,
          statusCode: 500,
          attempt: 1,
          provider: "whisper",
          primaryProvider: "whisper",
          fallbackProvider: "openai",
        },
      });
      expect(sample).not.toBeNull();
      expect(sample?.event).toBe(eventName);
    }
  });
});
