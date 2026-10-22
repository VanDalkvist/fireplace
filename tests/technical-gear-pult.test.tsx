import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { TechnicalGearPult } from "@/components/salon/TechnicalGearPult";

describe("TechnicalGearPult", () => {
  it("renders tiny gear icon without borders", () => {
    const html = renderToString(
      <TechnicalGearPult
        sttEngine="whisper"
        onToggleSttEngine={vi.fn()}
        isVerbatimMode={false}
        onToggleVerbatimMode={vi.fn()}
        isAudioOn={false}
        onAudioToggle={vi.fn()}
        phase="feelings"
        onPhaseSelect={vi.fn()}
        isDemoActive={false}
        onToggleDemo={vi.fn()}
        onResetCircle={vi.fn()}
      />
    );

    // Initial state renders the gear button with title
    expect(html).toContain("Технические настройки (шестерёнка)");
    // Must not contain border classes
    expect(html).not.toContain("border-border");
    expect(html).not.toContain("border-primary");
  });
});
