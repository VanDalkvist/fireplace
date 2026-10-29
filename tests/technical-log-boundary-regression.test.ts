import { describe, expect, it } from "vitest";
import { validateTechnicalLogPayload } from "@/infrastructure/technical-log-dto";

const PRIVATE_VALUE = "PRIVATE_WORDS_IN_TECHNICAL_FIELD";
const base = { level: "info", timestamp: "2026-10-30T00:00:00.000Z" };

// Allowed field names must not become an alternate free-text exfiltration channel.
describe("Technical field value boundary", () => {
  it("does not retain arbitrary provider names", () => {
    const record = validateTechnicalLogPayload({ ...base, event: "asr_phrase_empty", details: { provider: PRIVATE_VALUE } });
    expect(JSON.stringify(record)).not.toContain(PRIVATE_VALUE);
  });

  it("does not retain arbitrary error type strings", () => {
    const record = validateTechnicalLogPayload({ ...base, event: "meeting_audio_capture_failed", details: { errorType: PRIVATE_VALUE } });
    expect(JSON.stringify(record)).not.toContain(PRIVATE_VALUE);
  });

  it("does not retain arbitrary MIME strings", () => {
    const record = validateTechnicalLogPayload({ ...base, event: "asr_segment_processing", details: { blobSize: 16, mimeType: PRIVATE_VALUE } });
    expect(JSON.stringify(record)).not.toContain(PRIVATE_VALUE);
  });

  it("rejects or replaces a non-date client timestamp", () => {
    const record = validateTechnicalLogPayload({ ...base, event: "meeting_audio_no_tracks", timestamp: PRIVATE_VALUE });
    expect(JSON.stringify(record)).not.toContain(PRIVATE_VALUE);
  });
});
