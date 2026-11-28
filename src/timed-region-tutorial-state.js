// Reading time starts only when the notice is displayed.
export function createTimedRegionTutorialState(isInside,{durationMs=5000}={}) {
  let phase='waiting',anchor=null,remaining=durationMs,lastTime=null;
  function start(){if(phase!=='waiting')return false;phase='showing';return true;}
  return {
    get phase(){return phase;},
    get active(){return phase==='showing';},
    start,
    observe(position) {
      if(phase!=='waiting'||![position.x,position.y,position.z].every(Number.isFinite))return false;
      if(!isInside(position)){anchor??={x:position.x,z:position.z};return false;}
      if(!anchor||Math.hypot(position.x-anchor.x,position.z-anchor.z)<.05)return false;
      return start();
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
