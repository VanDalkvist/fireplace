import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { VoiceIndicator } from "../src/components/salon/VoiceIndicator";
import { WhisperSpeechAdapter } from "../src/speech/whisper-speech-adapter";

describe("Autonomous Speaker Routing (Cycle 12)", () => {
  it("renders clean quiet listening indicator on VoiceIndicator without numbers", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        engineType="whisper"
      />
    );

    expect(html).toContain("слушаю");
  });

  it("passes speaker seat number from speakerPort to onFinalPhrase callback", async () => {
    const onFinalPhrase = vi.fn();
    const mockSpeaker = {
      identify: vi.fn().mockResolvedValue({
        matched: true,
        speakerId: "seat_7",
        seatNumber: 7,
        score: 0.92,
      }),
      reset: vi.fn().mockResolvedValue(true),
      getEnrolledSpeakers: vi.fn().mockResolvedValue([]),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const adapter = new WhisperSpeechAdapter(
      { onFinalPhrase },
      "http://127.0.0.1:8085",
      mockSpeaker
    );

    const mockRecorder = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(new Blob([])),
      extractCurrentSegment: vi.fn().mockReturnValue(new Blob(["speech"], { type: "audio/webm" })),
      hasSpeechInCurrentSegment: vi.fn().mockReturnValue(true),
      cleanup: vi.fn(),
      isRecording: true,
    };
    (adapter as unknown as { recorder: typeof mockRecorder }).recorder = mockRecorder;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/client-log")) {
        return { ok: true, status: 200 } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ text: "спокойствие и тепло" }),
      } as unknown as Response;
    });

    await adapter.start();
    adapter.flush();

    await new Promise((r) => setTimeout(r, 10));

    expect(mockSpeaker.identify).toHaveBeenCalled();
    expect(onFinalPhrase).toHaveBeenCalledWith("спокойствие и тепло", 7);
  });
});
