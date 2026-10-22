import { describe, it, expect } from "vitest";
import {
  createInitialState,
  ensureParticipant,
  resetParticipants,
  calculatePhyllotaxisAngle,
} from "../src/domain/session-fsm";
import { HearthSeatsLayout } from "../src/canvas/hearth-seats";

describe("Dynamic Emergent Seating (Cycle 13)", () => {
  it("initializes session state with zero participants by default", () => {
    const state = createInitialState(0);
    expect(state.participants).toEqual([]);
    expect(state.activeSpeakerId).toBeNull();
  });

  it("calculates phyllotaxis angles avoiding overlapping clusters", () => {
    const a0 = calculatePhyllotaxisAngle(0);
    const a1 = calculatePhyllotaxisAngle(1);
    const a2 = calculatePhyllotaxisAngle(2);

    expect(a0).not.toBe(a1);
    expect(a1).not.toBe(a2);
  });

  it("dynamically manifests a new participant when a voice is detected", () => {
    let state = createInitialState(0);
    expect(state.participants.length).toBe(0);

    state = ensureParticipant(state, 1);
    expect(state.participants.length).toBe(1);
    expect(state.participants[0].id).toBe(1);
    expect(state.participants[0].isHost).toBe(true);

    // Second voice creates a second participant
    state = ensureParticipant(state, 2);
    expect(state.participants.length).toBe(2);
    expect(state.participants[1].id).toBe(2);

    // Existing voice does not duplicate
    state = ensureParticipant(state, 1);
    expect(state.participants.length).toBe(2);
  });

  it("enforces single speaker invariant when new participants speak", () => {
    let state = createInitialState(0);
    state = ensureParticipant(state, 1);
    expect(state.participants[0].isSpeaking).toBe(true);

    state = ensureParticipant(state, 2);
    expect(state.participants.find((p) => p.id === 1)?.isSpeaking).toBe(false);
    expect(state.participants.find((p) => p.id === 2)?.isSpeaking).toBe(true);
  });

  it("resets participants cleanly on resetParticipants", () => {
    let state = createInitialState(0);
    state = ensureParticipant(state, 1);
    state = ensureParticipant(state, 2);
    expect(state.participants.length).toBe(2);

    state = resetParticipants(state);
    expect(state.participants.length).toBe(0);
    expect(state.activeSpeakerId).toBeNull();
  });

  it("dynamically creates and removes layout seats in HearthSeatsLayout", () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 400, 300, 150);

    // Start with 0 participants
    layout.syncParticipants([], null);
    expect(layout.seats.length).toBe(0);

    // Voice 1 speaks -> manifests ember 1
    layout.syncParticipants(
      [{ id: 1, seatNumber: 1, role: "light", isSpeaking: true, hasPassed: false, isHost: true }],
      1
    );
    expect(layout.seats.length).toBe(1);
    expect(layout.seats[0].id).toBe(1);

    // Voice 2 speaks -> manifests ember 2
    layout.syncParticipants(
      [
        { id: 1, seatNumber: 1, role: "light", isSpeaking: false, hasPassed: false, isHost: true },
        { id: 2, seatNumber: 2, role: "guest", isSpeaking: true, hasPassed: false, isHost: false },
      ],
      2
    );
    expect(layout.seats.length).toBe(2);

    // Reset -> seats cleared
    layout.syncParticipants([], null);
    expect(layout.seats.length).toBe(0);
  });
});
