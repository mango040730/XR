import {gatheringEntrances,isNearGatheringEntrance} from './gathering-entrances.js';
import {createTimedRegionTutorialState} from './timed-region-tutorial-state.js';

export const ROOM_SELECTION_DURATION_MS=5000;

// Each module is introduced once per visit. While a prior notice is on screen
// keep checking proximity, so walking past a room cannot queue a stale popup.
export function createRoomSelectionTutorialState(zones) {
  const entrances=gatheringEntrances(zones),seen=new Set();
  let timer=null,zoneId=null,anchor=null,disposed=false;
  return {
    get active(){return timer?.active??false;},
    get zoneId(){return zoneId;},
    observe(position,{blocked=false}={}){
      if(disposed||![position.x,position.y,position.z].every(Number.isFinite))return false;
      anchor??={...position};
      if(timer?.active||blocked)return false;
      const entrance=entrances.find(e=>!seen.has(e.id)&&isNearGatheringEntrance(position,e));
      if(!entrance){
        if(!entrances.some(e=>isNearGatheringEntrance(position,e)))anchor={...position};
        return false;
      }
      const next=createTimedRegionTutorialState(p=>isNearGatheringEntrance(p,entrance),{durationMs:ROOM_SELECTION_DURATION_MS});
      next.observe(anchor);
      if(!next.observe(position))return false;
      timer=next;zoneId=entrance.id;seen.add(zoneId);return true;
    },
    tick(now,visible=true){return timer?.tick(now,visible)??false;},
    dispose(){disposed=true;timer?.dispose();},
  };
}
