export const CROSSROADS_DURATION_MS = 5000;

export function isOnGrayTerrace({x,y,z},layout) {
  if(![x,y,z].every(Number.isFinite))return false;
  const radius=Math.hypot(x,z);
  // The upper terrace is blue carpet. Gray access treads and both lower
  // seating terraces sit below it; foot height excludes the central floor.
  return radius>layout.centralRadius+.05&&radius<layout.terraceOuter-.05
    &&y>layout.floorY+.2&&y<layout.pathY-.12;
}

export function createCrossroadsTutorialState(layout) {
  let phase='waiting',anchor=null,remaining=CROSSROADS_DURATION_MS,lastTime=null;
  return {
    get phase(){return phase;},
    get active(){return phase==='showing';},
    observe(position) {
      if(phase!=='waiting'||![position.x,position.y,position.z].every(Number.isFinite))return false;
      if(!isOnGrayTerrace(position,layout)){anchor??={x:position.x,z:position.z};return false;}
      if(!anchor||Math.hypot(position.x-anchor.x,position.z-anchor.z)<.05)return false;
      phase='showing';return true;
    },
    tick(now,visible=true) {
      if(phase!=='showing'||!Number.isFinite(now))return false;
      if(lastTime!==null)remaining-=Math.max(0,now-lastTime);
      lastTime=visible?now:null;
      if(remaining>0)return false;
      phase='done';lastTime=null;return true;
    },
    dispose(){phase='done';lastTime=null;},
  };
}
