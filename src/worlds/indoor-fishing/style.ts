/** One art direction for architecture, furniture, equipment and light. sRGB colours. */
export const interiorPalette={pnwBreeze:'#443B1C',fieldNotes:'#F4EEE6',trailDust:'#C8B38B'} as const;
const p=interiorPalette;
export const palette={
  ...interiorPalette,
  dustyTeal:'#6F918D',deepTeal:p.pnwBreeze,honey:p.trailDust,walnut:p.pnwBreeze,ivory:p.fieldNotes,charcoal:'#30312D',amber:'#EBC48A',
  wall:p.fieldNotes,wood:p.pnwBreeze,edge:p.pnwBreeze,plank:p.trailDust,roof:p.fieldNotes,roofSeam:p.trailDust,
  floor:p.fieldNotes,floorTile:p.trailDust,floorAlternate:p.trailDust,rim:p.fieldNotes,water:'#426864',olive:p.pnwBreeze,
  metal:'#30312D',brass:p.trailDust,grout:p.fieldNotes,sign:p.pnwBreeze,
  sky:'#A9B9B9',skyLight:'#CFD9D5',bounce:'#80766A',sun:'#FFF0DC',
  foliage:['#364F49','#4A6458','#405B55'],outdoorGround:'#3B5149',treeBark:'#57493A',
  skin:'#D3AD8C',skinShade:'#B88D70',hair:'#39271E',hairLight:'#5A4436',
  clothes:['#747D67','#9B735C','#6F918D','#426864','#A27A48'],pants:'#555850',lightPants:'#B3AA92',
  floatAccent:'#BC8958',line:'#C4C7B4',ripple:'#A3B9AB',fish:'#426864',fishDark:'#304D49',caughtFish:'#A27A48',
} as const;

export const lightingStyle={
  exposure:1.0,bloom:.055,ambient:.8,sunIntensity:3.0,
  sunPosition:[-9,6,-8] as [number,number,number],sunTarget:[1,0,0] as [number,number,number],
  pendantIntensity:32,pendantFill:4.0,pendantRange:7.5,
} as const;
