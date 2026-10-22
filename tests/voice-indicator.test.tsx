import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { VoiceIndicator } from "@/components/salon/VoiceIndicator";

describe("VoiceIndicator with VU Meter and Pipeline Status", () => {
  it("renders idle microphone button with keyboard shortcut hint", () => {
    const html = renderToString(<VoiceIndicator isListening={false} />);
    expect(html).toContain("микрофон (v)");
  });

  it("renders hearing status when speech is actively detected", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        pipelineStatus="hearing"
        audioLevel={0.05}
        engineType="gigaam"
      />
    );
    expect(html).toContain("слышу речь…");
  });

  it("renders transcribing status when speech segment is sent to ASR", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        pipelineStatus="transcribing"
        engineType="gigaam"
      />
    );
    expect(html).toContain("распознаю (gigaam)…");
  });

  it("renders distilling status when neural lexicon refinement is active", () => {
    const html = renderToString(
      <VoiceIndicator
        isListening={true}
        pipelineStatus="distilling"
      />
    );
    expect(html).toContain("нейрокоррекция…");
  });
});
