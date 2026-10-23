/** Attribution pointers are not live speech: only a recent phrase event has an accent. */
export function seatAccent(lastSpokenAt: number | undefined, now: number): number {
  if (lastSpokenAt === undefined || !Number.isFinite(lastSpokenAt)) return 0;
  const elapsed = now - lastSpokenAt;
  return elapsed >= 0 && elapsed < 5000 ? 1 - elapsed / 5000 : 0;
}
