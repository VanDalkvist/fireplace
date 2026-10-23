/** CSS-pixel presentation: measurement, rendering and collision layout share these budgets. */
export const HEARTH_SCALE = 0.8;
export const PHRASE_FONT = "16px 'JetBrains Mono'";
export const PHRASE_WARM_FONT = "600 17px 'JetBrains Mono'";
export const PHRASE_LINE_HEIGHT = 22;
export const FIRE_HALF_WIDTH = 160 * HEARTH_SCALE;
export const FIRE_BELOW = 75 * HEARTH_SCALE;
// Maximum visible flame follows presentation scale, not a separate heat curve.
export const FIRE_ABOVE = Math.ceil(195 * 1.7 * HEARTH_SCALE);
