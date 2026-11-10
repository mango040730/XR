import { Color } from 'three';
/** Exterior only. Never import these colours into the interior material palette. */
export const forestPalette={
  leather:'#5E3721',fallLeaves:'#8D5C2F',mustard:'#C5953E',trailDust:'#C8B38B',
  fieldNotes:'#F4EEE6',pineDew:'#BFBFA2',mossPillow:'#7E7639',pnwBreeze:'#443B1C',
} as const;
export const forestSky='#'+new Color(forestPalette.pineDew).lerp(new Color(forestPalette.fieldNotes),.52).getHexString();
