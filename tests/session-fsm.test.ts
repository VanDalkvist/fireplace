import { describe, it, expect } from "vitest";
import {
  createInitialState,
  advancePhase,
  nextSpeaker,
  passTurn,
  addFeelingToken,
} from "../src/domain/session-fsm";
import type { FeelingToken } from "../src/domain/types";

describe("Session FSM", () => {
  it("initializes 12 participants with seat 1 as active speaker", () => {
    const state = createInitialState(12);
    expect(state.phase).toBe("silence");
    expect(state.participants.length).toBe(12);
    expect(state.activeSpeakerId).toBe(1);
    expect(state.participants[0].isSpeaking).toBe(true);
    expect(state.participants[0].isHost).toBe(true);
  });

  it("advances phases through silence -> feelings -> desires -> completion", () => {
    let state = createInitialState(12);
    state = advancePhase(state);
    expect(state.phase).toBe("feelings");
    state = advancePhase(state);
    expect(state.phase).toBe("desires");
    state = advancePhase(state);
    expect(state.phase).toBe("completion");
    state = advancePhase(state);
    expect(state.phase).toBe("completion"); // stays completed
  });

  it("hands over turn to next speaker sequentially", () => {
    let state = createInitialState(12);
    state = nextSpeaker(state);
    expect(state.activeSpeakerId).toBe(2);
    expect(state.participants[1].isSpeaking).toBe(true);
    expect(state.participants[0].isSpeaking).toBe(false);
  });

  it("handles pass turn gracefully leaving pass marker", () => {
    let state = createInitialState(12);
    state = passTurn(state, 1);
    expect(state.participants[0].hasPassed).toBe(true);
    expect(state.activeSpeakerId).toBe(2);
  });

  it("adds feeling token without mutating previous state", () => {
    const state = createInitialState(12);
    const token: FeelingToken = {
      id: "f-1",
      text: "спокойствие",
      lemma: "спокойствие",
      family: "мир",
      valence: 1,
      arousal: -0.5,
      intensity: 1,
      speakerId: 1,
      timestamp: Date.now(),
    };
    const nextState = addFeelingToken(state, token);
    expect(state.feelings.length).toBe(0);
    expect(nextState.feelings.length).toBe(1);
    expect(nextState.feelings[0].text).toBe("спокойствие");
  });
});
