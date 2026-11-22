export const FLOOR_Y = 1.15;
export const PREVIOUS_TOTAL_RISE = 6.7216;
// The previous middle terrace sets the new ceiling for all three seating tiers.
export const TOTAL_RISE = PREVIOUS_TOTAL_RISE * 2 / 3;
export const PATH_Y = FLOOR_Y + TOTAL_RISE;
export const ACCESS_STEP_COUNT = Math.max(6, Math.ceil(TOTAL_RISE / 0.9) * 3);
export const ACCESS_STEPS_PER_TIER = ACCESS_STEP_COUNT / 3;
export const ACCESS_STEP_RISE = TOTAL_RISE / ACCESS_STEP_COUNT;

export function terraceHeight(level) {
  return FLOOR_Y + TOTAL_RISE * level / 3;
}
