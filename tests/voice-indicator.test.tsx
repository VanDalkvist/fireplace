import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { VoiceIndicator } from "@/components/salon/VoiceIndicator";

describe("VoiceIndicator with Calm, Steady State", () => {
  it("renders idle microphone button with keyboard shortcut hint", () => {
    const html = renderToString(<VoiceIndicator isListening={false} />);
    expect(html).toContain("микрофон (v)");
  });

  it("renders calm, steady 'слушаю' status without technical jargon when listening", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        pipelineStatus="hearing"
        audioLevel={0.05}
        engineType="gigaam"
      />
    );
    expect(html).toContain("слушаю");
    expect(html).not.toContain("gigaam");
    expect(html).not.toContain("слышу речь");
  });

  it("keeps 'слушаю' steady during transcribing phase without jumping text", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        pipelineStatus="transcribing"
        engineType="whisper"
      />
    );
    expect(html).toContain("слушаю");
    expect(html).not.toContain("распознаю");
  });

  it("keeps 'слушаю' steady during meeting audio capture without jumping label", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        isMeetingAudio={true}
      />
    );
    expect(html).toContain("слушаю");
  });
});
