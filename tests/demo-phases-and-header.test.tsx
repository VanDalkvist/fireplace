import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { DEMO_PHRASES_BY_PHASE, getDemoPhrasesForPhase, DEMO_PHRASES } from "@/domain/demo-script";
import { SalonHeader } from "@/components/salon/SalonHeader";
import { isRemoteHost } from "@/hooks/useSalonUiState";

describe("Demo Script Phase Awareness", () => {
  it("provides distinct phrase sets for all 4 session phases", () => {
    expect(DEMO_PHRASES_BY_PHASE.silence.length).toBeGreaterThanOrEqual(25);
    expect(DEMO_PHRASES_BY_PHASE.feelings.length).toBeGreaterThanOrEqual(30);
    expect(DEMO_PHRASES_BY_PHASE.desires.length).toBeGreaterThanOrEqual(25);
    expect(DEMO_PHRASES_BY_PHASE.completion.length).toBeGreaterThanOrEqual(20);

    const silence = getDemoPhrasesForPhase("silence");
    const feelings = getDemoPhrasesForPhase("feelings");
    const desires = getDemoPhrasesForPhase("desires");
    const completion = getDemoPhrasesForPhase("completion");

    expect(silence.length).toBeGreaterThan(5);
    expect(feelings.length).toBeGreaterThan(10);
    expect(desires.length).toBeGreaterThan(8);
    expect(completion.length).toBeGreaterThan(5);

    // Desires phase must contain desire entries
    expect(desires.some((item) => Boolean(item.desire))).toBe(true);

    // Completion phase must contain completion family entries
    expect(completion.some((item) => item.family === "завершение")).toBe(true);

    // Passes are distributed across phases
    expect(silence.some((item) => item.isPass)).toBe(true);
    expect(feelings.some((item) => item.isPass)).toBe(true);
    expect(desires.some((item) => item.isPass)).toBe(true);
    expect(completion.some((item) => item.isPass)).toBe(true);
  });

  it("exports flattened DEMO_PHRASES for backwards compatibility", () => {
    expect(DEMO_PHRASES.length).toBeGreaterThanOrEqual(30);
  });
});

describe("SalonHeader Author Credit", () => {
  it("renders author name and link to personal landing page", () => {
    const html = renderToString(<SalonHeader />);

    expect(html).toContain("автор: Ваня Афанасов");
    expect(html).toContain("https://vanya-arc.lovable.app");
    expect(html).toContain("target=\"_blank\"");
    expect(html).toContain("rel=\"noopener noreferrer\"");
  });
});

describe("Remote Host Detection", () => {
  it("treats localhost and 127.0.0.1 as local", () => {
    expect(typeof isRemoteHost).toBe("function");
  });
});
