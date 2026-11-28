import {createTimedRegionTutorialState} from './timed-region-tutorial-state.js';

export const CRAFT_IDS=Object.freeze(['knitting','blocks','beads']);
export const SEATED_EYE_HEIGHT=1.2;
export const SEAT_APPROACH_DISTANCE=1.65;

export function nearestTerraceSeat(seats,position){
  let nearest=null,distance=SEAT_APPROACH_DISTANCE;
  for(const seat of seats){
    if(Math.abs(position.y-seat.position[1]-.025)>.20)continue;
    const d=Math.hypot(position.x-seat.position[0],position.z-seat.position[2]);
    if(d<distance){nearest=seat;distance=d;}
  }
  return nearest;
}

const clock=()=>{const timer=createTimedRegionTutorialState(()=>true);timer.start();return timer;};

export function createTerraceActivityState(){
  let phase='standing',nearSeat=null,seat=null,hint=null,guide=null,hintSeen=false,guideSeen=false,disposed=false;
  const choices=new Map();
  return {
    get phase(){return phase;},
    get seated(){return phase!=='standing';},
    get nearSeat(){return nearSeat;},
    get seat(){return seat;},
    get hintVisible(){return hint?.active??false;},
    get choice(){return seat?choices.get(seat.id)??null:null;},
    approach(next){
      if(disposed||phase!=='standing')return;
      nearSeat=next;
      if(!next){hint?.dispose();hint=null;return;}
      if(!hintSeen){hintSeen=true;hint=clock();}
    },
    sit(next){
      if(disposed||phase!=='standing'||!next)return false;
      seat=next;nearSeat=null;hint?.dispose();hint=null;phase='seating';return true;
    },
    settle(){
      if(disposed||phase!=='seating')return false;
      if(!guideSeen){guideSeen=true;guide=clock();phase='guide';}
      else phase=choices.has(seat.id)?'selected':'choices';
      return true;
    },
    tick(now,visible=true){
      hint?.tick(now,visible);
      if(phase==='guide'&&guide.tick(now,visible)){
        phase=choices.has(seat.id)?'selected':'choices';guide=null;return true;
      }
      return false;
    },
    choose(id){
      if(disposed||phase!=='choices'||!CRAFT_IDS.includes(id))return false;
      choices.set(seat.id,id);phase='selected';return true;
    },
    stand(){
      if(disposed||phase==='standing')return false;
      guide?.dispose();guide=null;seat=null;nearSeat=null;phase='standing';return true;
    },
    dispose(){disposed=true;hint?.dispose();guide?.dispose();hint=guide=null;seat=nearSeat=null;phase='standing';},
  };
}
