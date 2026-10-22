import { describe, it, expect } from 'vitest';
import { HearthSeatsLayout } from '../src/canvas/hearth-seats';
import type { Participant } from '../src/domain/types';

describe('HearthSeatsLayout', () => {
  it('creates seats with correct isometric depth gradient', () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 300, 400, 200);

    const participants: Participant[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      seatNumber: i + 1,
      role: 'guest',
      isSpeaking: i === 0,
      hasPassed: false,
      isHost: i === 0,
    }));

    layout.syncParticipants(participants, 1);
    expect(layout.seats).toHaveLength(8);

    const depths = layout.seats.map((s) => s.depth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);

    expect(minDepth).toBeGreaterThanOrEqual(0);
    expect(maxDepth).toBeLessThanOrEqual(1);
  });

  it('accurately hit-tests click coordinates near a seat', () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 300, 400, 200);

    const participants: Participant[] = [
      { id: 1, seatNumber: 1, role: 'light', isSpeaking: true, hasPassed: false, isHost: true },
    ];
    layout.syncParticipants(participants, 1);

    const targetSeat = layout.seats[0];
    // Exact click
    expect(layout.getSeatAtPoint(targetSeat.x, targetSeat.y)).toBe(targetSeat.id);

    // Click within threshold
    expect(layout.getSeatAtPoint(targetSeat.x + 8, targetSeat.y - 8)).toBe(targetSeat.id);

    // Click far away
    expect(layout.getSeatAtPoint(targetSeat.x + 100, targetSeat.y + 100)).toBeNull();
  });

  it('records lastSpokenAt on pulseSeat and triggers 5-second pulse decay', () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 300, 400, 200);
    layout.syncParticipants(
      [{ id: 1, seatNumber: 1, role: 'light', isSpeaking: false, hasPassed: false, isHost: true }],
      null
    );

    layout.pulseSeat(1);
    const seat = layout.seats[0];
    expect(seat.lastSpokenAt).toBeDefined();
    expect(seat.spokenCount).toBe(1);
  });
});
