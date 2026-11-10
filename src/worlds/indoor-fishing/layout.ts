import type { Vector3Tuple } from 'three';
import { palette } from './style';
export { palette } from './style';
export interface FishingSeat { id: string; position: Vector3Tuple; yaw: number; stand: Vector3Tuple; cast: Vector3Tuple; npc: boolean }
// Local forward is -Z. The feet anchor and safe aisle exit are separate from the seat mesh.
export const seats: FishingSeat[] = [];
for (const side of [1, -1]) for (let i = 0; i < 4; i++) {
  const x = -3 + i * 2;
  seats.push({ id: `${side === 1 ? 'S' : 'N'}${i + 1}`, position: [x, 0, side * 3.22], yaw: side === 1 ? 0 : Math.PI,
    stand: [x, 0, side * 4.25], cast: [x + .15, .39, side * 1.25], npc: (side === 1 && [1, 3].includes(i)) || (side === -1 && [0, 2].includes(i)) });
}
for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
  const z = -.95 + i * 1.9;
  seats.push({ id: `${side === 1 ? 'E' : 'W'}${i + 1}`, position: [side * 4.95, 0, z], yaw: side === 1 ? Math.PI / 2 : -Math.PI / 2,
    stand: [side * 6.1, 0, z], cast: [side * 3.15, .39, z + .1], npc: side === -1 && i === 0 });
}
export const entry = { position: [6.25, 0, 4.35] as Vector3Tuple, yaw: .84 };
export const review = { position: [6.65, 0, 4.8] as Vector3Tuple, yaw: .86, pitch: -.18, eye: 2.5 };
export const opposite = { position: [-6.25, 0, -4.35] as Vector3Tuple, yaw: -2.3 };
export const floorAreas = [
  { center: [0, 3.875] as [number, number], size: [15, 3.25] as [number, number], y: 0, color: palette.floor, visible: false },
  { center: [0, -3.875] as [number, number], size: [15, 3.25] as [number, number], y: 0, color: palette.floor, visible: false },
  { center: [-5.75, 0] as [number, number], size: [3.5, 5.7] as [number, number], y: 0, color: palette.floor, visible: false },
  { center: [5.75, 0] as [number, number], size: [3.5, 5.7] as [number, number], y: 0, color: palette.floor, visible: false },
];

// Outer wall footprint; visible floor ends here, behind the basin's inner face.
export const poolFootprint:readonly [number,number]=[4.28,2.53];
// Collision areas deliberately overlap to support a player's full footprint at joins.
// Visible slabs partition only the exposed floor; no slab side faces inside the pool.
const [poolX,poolZ]=poolFootprint;
export const floorSlabs = floorAreas.map(f => ({ ...f,
  center: (f.center[1]===0 ? [Math.sign(f.center[0])*(7.5+poolX)/2,0] : [0,Math.sign(f.center[1])*(5.5+poolZ)/2]) as [number,number],
  size: (f.center[1]===0 ? [7.5-poolX,poolZ*2] : [15,5.5-poolZ]) as [number,number],
}));
