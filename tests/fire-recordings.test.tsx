import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FIRE_RECORDINGS, DEFAULT_FIRE_RECORDING_ID, requireFireRecording } from "@/config/fire-recordings";
import { FireRecordingButton } from "@/components/salon/FireRecordingButton";

describe("fire recording choices", () => {
  it("offers three new recordings and the original with an explicit dry default", () => {
    expect(FIRE_RECORDINGS).toHaveLength(4);
    expect(new Set(FIRE_RECORDINGS.map(recording => recording.url)).size).toBe(4);
    expect(requireFireRecording(DEFAULT_FIRE_RECORDING_ID).id).toBe("dry");
  });
  it("rejects unknown recording IDs instead of substituting an arbitrary clip", () => {
    expect(() => requireFireRecording("not-registered")).toThrow();
  });
  it("renders a named compact cycle control with the current position", () => {
    const html = renderToStaticMarkup(<FireRecordingButton label="Сухой треск" position="1/4" onCycle={vi.fn()} />);
    expect(html).toContain('aria-label="Сменить запись костра: Сухой треск"');
    expect(html).toContain("1/4");
    expect(html).toContain("треск:");
  });
});
