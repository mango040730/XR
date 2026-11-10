export interface RenderProfile { filmic?:boolean; exposure?:number; bloom?:number; shadows?:boolean; near?:number; far?:number }
/** Bound fill rate on Retina displays; low quality keeps native CSS dimensions. */
export function renderPixelRatio(deviceRatio:number,low:boolean):number {
  return Math.min(Math.max(1,deviceRatio),low?1:1.5);
}
