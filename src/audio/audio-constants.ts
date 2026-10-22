const BASE = 146.83; // D3 in standard tuning

export const FAMILY_SEMITONES: Record<string, number> = {
  радость: 7,
  живость: 14,
  интерес: 9,
  нежность: 5,
  спокойствие: 0,
  тело: -5,
  усталость: 2,
  грусть: 3,
  растерянность: 10,
  стыд: -2,
  страх: -3,
  тревога: -10,
  злость: -12,
  другое: 0,
};

export const BELL_STEPS = [0, 2, 5, 7, 9, 12, 14];

export function semitoneToHz(semi: number): number {
  return BASE * Math.pow(2, semi / 12);
}
