import { Signal } from '../../engine/core/Signal';
import { FISH_SPECIES,CATCH_WAIT } from './fishSpecies';
import type { FishSpeciesId } from './fishSpecies';
export { CATCH_WAIT } from './fishSpecies';
import { seats } from './layout';
export interface FishCatch { species:FishSpeciesId; name:string; lengthCm:number }
export interface FishingUser { id:string; seatId:string|null; fishing:'idle'|'cast'|'caught'; position:number[]; yaw:number; catchCount:number; lastCatch:FishCatch|null }
/** Frame-polled deadline: no lingering timeout after reeling, standing, switching or disposal. */
export class FishingState {
  readonly changes=new Signal<void>();
  readonly user:FishingUser={id:'local-visitor',seatId:null,fishing:'idle',position:[],yaw:0,catchCount:0,lastCatch:null};
  readonly occupancy=new Map<string,string>();
  samples=true;
  low=false;
  private catchAt:number|null=null;
  constructor(private random:()=>number=Math.random,private now:()=>number=()=>performance.now(),samples=true){this.samples=samples;this.syncSamples();}
  private syncSamples(){for(const s of seats)if(s.npc){if(this.samples)this.occupancy.set(s.id,`sample:${s.id}`);else if(this.occupancy.get(s.id)?.startsWith('sample:'))this.occupancy.delete(s.id);}}
  sit(id:string):boolean{
    if(!seats.some(s=>s.id===id)||this.occupancy.has(id))return false;
    this.stand();this.user.seatId=id;this.occupancy.set(id,this.user.id);this.changes.emit();return true;
  }
  toggleCast():boolean{
    if(!this.user.seatId)return false;
    if(this.user.fishing==='cast'){this.user.fishing='idle';this.catchAt=null;}
    else {
      this.user.fishing='cast';this.user.lastCatch=null;
      this.catchAt=this.now()+CATCH_WAIT.minMs+Math.max(0,Math.min(1,this.random()))*(CATCH_WAIT.maxMs-CATCH_WAIT.minMs);
    }
    this.changes.emit();return true;
  }
  /** Returns a result exactly once. A background tab catches on its next frame, never twice. */
  tick():FishCatch|null{
    if(this.catchAt===null||this.user.fishing!=='cast'||!this.user.seatId||this.now()<this.catchAt)return null;
    this.catchAt=null;
    const species=FISH_SPECIES[Math.max(0,Math.min(FISH_SPECIES.length-1,Math.floor(this.random()*FISH_SPECIES.length)))];
    const lengthCm=species.minLengthCm+Math.max(0,Math.min(species.maxLengthCm-species.minLengthCm,Math.floor(this.random()*(species.maxLengthCm-species.minLengthCm+1))));
    const result:FishCatch={species:species.id,name:species.name,lengthCm};
    this.user.fishing='caught';this.user.lastCatch=result;this.user.catchCount++;this.changes.emit();return result;
  }
  get biting():boolean{return this.catchAt!==null&&this.catchAt-this.now()<=1800;}
  stand(){if(this.user.seatId)this.occupancy.delete(this.user.seatId);this.catchAt=null;this.user.seatId=null;this.user.fishing='idle';this.changes.emit();}
  toggleSamples(){if(!this.samples&&this.user.seatId&&seats.find(s=>s.id===this.user.seatId)?.npc)this.stand();this.samples=!this.samples;this.syncSamples();this.changes.emit();}
  dispose(){this.stand();this.occupancy.clear();this.changes.clear();}
}
