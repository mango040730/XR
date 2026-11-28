import {isOnGrayTerrace} from './crossroads-tutorial-state.js';
import {isInRelationshipRoom} from './relationship-tutorial-state.js';
import {gatheringEntrances,isNearGatheringEntrance} from './gathering-entrances.js';
import {createTimedRegionTutorialState} from './timed-region-tutorial-state.js';

// Location owns the notice, not a queue of unfinished reading timers.
export function createSpatialNoticeState(layout,zones){
  const entrances=gatheringEntrances(zones);
  const seen=new Set();
  let region=null,current=null,timer=null,anchor=null,disposed=false;
  function locate(position){
    if(isOnGrayTerrace(position,layout))return {id:'crossroads'};
    const radius=Math.hypot(position.x,position.z);
    // On the first tread the rig's foot height eases upward after crossing
    // the real edge. Use its tread bounds during that brief height damping.
    const firstTreadOuter=layout.centralRadius+(layout.terraceOuter-layout.centralRadius)/layout.stepCount;
    if(radius>layout.centralRadius+.05&&radius<firstTreadOuter
      &&position.y>=layout.floorY-.1&&position.y<=layout.floorY+.5)return {id:'crossroads'};
    if(isInRelationshipRoom(position,layout)){
      const entrance=entrances.find(e=>isNearGatheringEntrance(position,e));
      return entrance?{id:'room-selection',zoneId:entrance.id}:{id:'relationship'};
    }
    // Keep the previous region through the 10cm contact-tolerance band at
    // the stair/central boundary instead of flashing an empty frame.
    if(Math.abs(radius-layout.centralRadius)<=.05
      &&position.y>=layout.floorY-.1&&position.y<=layout.floorY+.8)return undefined;
    return null;
  }
  const key=notice=>notice?`${notice.id}:${notice.zoneId??''}`:null;
  return {
    get current(){return current;},
    observe(position,{blocked=false}={}){
      if(disposed||blocked||![position.x,position.y,position.z].every(Number.isFinite))return false;
      const next=locate(position);
      if(next===undefined)return false;
      if(!anchor){anchor={...position};region=key(next);return false;}
      if(key(next)===region||Math.hypot(position.x-anchor.x,position.z-anchor.z)<.05)return false;
      timer?.dispose();timer=null;current=null;
      region=key(next);anchor={...position};
      if(next&&!seen.has(next.id)){
        seen.add(next.id);
        current=next;timer=createTimedRegionTutorialState(()=>true);timer.start();
      }
      return true;
    },
    tick(now,visible=true){
      if(!timer?.tick(now,visible))return false;
      timer=null;current=null;return true;
    },
    dismiss(){timer?.dispose();timer=null;current=null;},
    dispose(){disposed=true;timer?.dispose();timer=null;current=null;},
  };
}
