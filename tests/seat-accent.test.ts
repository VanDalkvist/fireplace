import { describe, it, expect, vi, afterEach } from "vitest";
import { HearthSeatsLayout } from "@/canvas/hearth-seats";
import { setSpeaker, createInitialState } from "@/domain/session-fsm";
import type { Participant } from "@/domain/types";

const participants: Participant[] = [1, 2].map(id => ({ id, seatNumber: id, role: "guest", isSpeaking: id === 1, hasPassed: false, isHost: id === 1 }));
function canvas() {
  const colors: unknown[] = [];
  const ctx = { fillStyle: "" as unknown, save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), stroke: vi.fn(),
    fill: () => { colors.push(ctx.fillStyle); }, createRadialGradient: () => ({ addColorStop: vi.fn() }) };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, stroke: ctx.stroke, colors };
}
afterEach(() => vi.restoreAllMocks());

describe("automatic participant accent", () => {
  it("never treats a logical active owner as live speech in an idle frame", () => {
    const layout = new HearthSeatsLayout(), frame = canvas();
    layout.syncParticipants(participants, 1);
    layout.render(frame.ctx, 1, 0);
    expect(frame.stroke).not.toHaveBeenCalled();
  });

  it("does not revive an expired speech accent when the owner pointer remains", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000);
    const layout = new HearthSeatsLayout(); layout.syncParticipants(participants, 1);
    layout.pulseSeat(1);
    const active = canvas(); layout.render(active.ctx, 1, 0); expect(active.stroke).toHaveBeenCalledTimes(1);
    now.mockReturnValue(7000);
    const idle = canvas(); layout.render(idle.ctx, 1, 6000);
    expect(idle.stroke).not.toHaveBeenCalled();
    const cores = idle.colors.filter(value => typeof value === "string");
    expect(new Set(cores).size).toBe(1);
  });

  it("shows only the newly speaking participant, not several selected seats", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const layout = new HearthSeatsLayout(); layout.syncParticipants(participants, 1);
    layout.pulseSeat(1); layout.pulseSeat(2);
    const frame = canvas(); layout.render(frame.ctx, 1, 0);
    expect(frame.stroke).toHaveBeenCalledTimes(1);
    expect(layout.seats.find(seat => seat.id === 1)?.lastSpokenAt).toBeUndefined();
    expect(layout.seats.find(seat => seat.id === 2)?.lastSpokenAt).toBe(1000);
  });

  it("ignores malformed historical phantom IDs at the visual boundary", () => {
    const layout = new HearthSeatsLayout();
    layout.syncParticipants([...participants, { ...participants[0], id: null as unknown as number }], null);
    expect(layout.seats.map(seat => seat.id)).toEqual([1, 2]);
  });

  it("clears speaker ownership with null without creating a participant", () => {
    const previous = createInitialState(2);
    const cleared = setSpeaker(previous, null);
    expect(cleared.participants).toHaveLength(2);
    expect(cleared.activeSpeakerId).toBeNull();
    expect(cleared.participants.every(person => !person.isSpeaking)).toBe(true);
    expect(cleared.participants.map(person => person.id)).toEqual([1, 2]);
  });
});
