import { describe, it, expect } from "vitest";
import { computeSelectiveEdges } from "../src/domain/linking-graph";
import type { FeelingToken, ConnectionEdge } from "../src/domain/types";

describe("Selective Linking Graph", () => {
  const tokenA1: FeelingToken = {
    id: "a-1",
    text: "тревога",
    lemma: "тревога",
    family: "страх",
    valence: -1,
    arousal: 0.8,
    intensity: 1,
    speakerId: 1,
    timestamp: 1000,
  };

  const tokenA2: FeelingToken = {
    id: "a-2",
    text: "растерянность",
    lemma: "растерянность",
    family: "грусть",
    valence: -0.5,
    arousal: 0.2,
    intensity: 1,
    speakerId: 1,
    timestamp: 1050,
  };

  const tokenB1: FeelingToken = {
    id: "b-1",
    text: "опасение",
    lemma: "опасение",
    family: "страх", // same family as a-1
    valence: -0.8,
    arousal: 0.5,
    intensity: 1,
    speakerId: 2,
    timestamp: 2000,
  };

  it("links new speaker token to previous speaker's last token (sequential)", () => {
    const existingTokens = [tokenA1, tokenA2];
    const newTokens = [tokenB1];
    const edges: ConnectionEdge[] = [];

    const result = computeSelectiveEdges(existingTokens, newTokens, edges);
    // Should connect b-1 to a-2 (previous speaker's last token)
    const seqEdge = result.find(
      (e) =>
        e.sourceTokenId === "a-2" &&
        e.targetTokenId === "b-1" &&
        e.kind === "sequential"
    );
    expect(seqEdge).toBeDefined();
    expect(seqEdge?.strength).toBeGreaterThan(0);
  });

  it("creates resonance link when family matches", () => {
    const existingTokens = [tokenA1, tokenA2];
    const newTokens = [tokenB1]; // family 'страх' matches a-1
    const edges: ConnectionEdge[] = [];

    const result = computeSelectiveEdges(existingTokens, newTokens, edges);
    const resEdge = result.find(
      (e) =>
        e.sourceTokenId === "a-1" &&
        e.targetTokenId === "b-1" &&
        e.kind === "resonance"
    );
    expect(resEdge).toBeDefined();
  });

  it("limits maximum links per token to prevent all-to-all clutter", () => {
    // 5 existing tokens from multiple speakers
    const existingTokens = Array.from({ length: 5 }, (_, i) => ({
      ...tokenA1,
      id: `prev-${i}`,
      speakerId: i + 1,
      timestamp: 1000 + i * 100,
    }));
    const newTokens = [tokenB1];
    const edges: ConnectionEdge[] = [];

    const result = computeSelectiveEdges(existingTokens, newTokens, edges, {
      maxEdgesPerToken: 2,
    });

    const edgesForB1 = result.filter(
      (e) => e.sourceTokenId === "b-1" || e.targetTokenId === "b-1"
    );
    expect(edgesForB1.length).toBeLessThanOrEqual(2);
  });
});
