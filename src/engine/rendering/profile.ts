export interface RenderProfile { ao?:{intensity:number;radius:number;algorithm?:'gtao'|'n8ao'}; bloomThreshold?:number; environmentIntensity?:number; maxPixelRatio?:number; fxaa?:boolean; fov?:number; responsiveFov?:{portrait:number;medium:number}; fog?:{color:string;near:number;far:number}; authoredShadows?:boolean; filmic?:boolean; exposure?:number; bloom?:number; shadows?:boolean; near?:number; far?:number }
/** Bound fill rate on Retina displays; low quality keeps native CSS dimensions. */
export function renderPixelRatio(deviceRatio:number,low:boolean,maxRatio=1.5):number {
  return Math.min(Math.max(1,deviceRatio),low?1:maxRatio);
}

/** Authored camera framing for narrow and portrait viewports. */
export function fieldOfView(profile: RenderProfile, aspect: number): number {
  const responsive=profile.responsiveFov;
  return responsive&&aspect<.8?responsive.portrait:responsive&&aspect<1.35?responsive.medium:profile.fov??70;
}
