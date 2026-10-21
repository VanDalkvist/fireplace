import { describe, it, expect } from 'vitest';
import { HearthSeatsLayout } from '../src/canvas/hearth-seats';

describe('HearthSeatsLayout', () => {
  it('creates 12 seats with correct isometric depth gradient', () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 300, 400, 200, 12);

    expect(layout.seats).toHaveLength(12);

    // North seats (far, negative sin) should have depth close to 0
    // South seats (near, positive sin) should have depth close to 1
    const depths = layout.seats.map((s) => s.depth);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);

    expect(minDepth).toBeCloseTo(0, 1);
    expect(maxDepth).toBeCloseTo(1, 1);
  });

  it('accurately hit-tests click coordinates near a seat', () => {
    const layout = new HearthSeatsLayout();
    layout.layout(500, 300, 400, 200, 12);

    const targetSeat = layout.seats[3];
    // Exact click
    expect(layout.getSeatAtPoint(targetSeat.x, targetSeat.y)).toBe(targetSeat.id);

    // Click within 20px threshold
    expect(layout.getSeatAtPoint(targetSeat.x + 10, targetSeat.y - 10)).toBe(targetSeat.id);

    // Click far away
    expect(layout.getSeatAtPoint(targetSeat.x + 100, targetSeat.y + 100)).toBeNull();
  });
});
