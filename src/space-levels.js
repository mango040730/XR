export const FLOOR_Y = 1.15;
export const PREVIOUS_TOTAL_RISE = 1.9902 - FLOOR_Y;
export const HEIGHT_MULTIPLIER = 2;
export const TOTAL_RISE = PREVIOUS_TOTAL_RISE * HEIGHT_MULTIPLIER;
export const PATH_Y = FLOOR_Y + TOTAL_RISE;
export const ACCESS_STEP_RISE = TOTAL_RISE / 6;

export function terraceHeight(level) {
  return FLOOR_Y + TOTAL_RISE * level / 3;
}
