export function isOnBlueRail({x,y,z},layout) {
  if(![x,y,z].every(Number.isFinite))return false;
  const radius=Math.hypot(x,z);
  return radius>=layout.terraceOuter+.05&&radius<=layout.outerRadius-.15&&Math.abs(y-layout.pathY)<.2;
}

// Once per space session; loading, waiting and looking around never advance it.
export function createPlazaTutorialState(layout) {
  let phase='waiting',anchor=null;
  return {
    get phase(){return phase;},
    get active(){return ['plaza','gathering','calendar'].includes(phase);},
    observe(position) {
      if(phase!=='waiting'||![position.x,position.y,position.z].every(Number.isFinite))return false;
      const inside=isOnBlueRail(position,layout);
      if(!inside){anchor??={x:position.x,z:position.z};return false;}
      if(!anchor||Math.hypot(position.x-anchor.x,position.z-anchor.z)<.05)return false;
      phase='plaza';return true;
    },
    next(){if(phase!=='plaza')return false;phase='gathering';return true;},
    calendar(){if(phase!=='gathering')return false;phase='calendar';return true;},
    dismiss(){if(!this.active)return false;phase='done';return true;},
  };
}
