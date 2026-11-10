import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from 'three';
import type { WorldBehavior, WorldBehaviorContext } from '../../engine/world/types';
import { Kit } from './geometry';
import { action, chair, equipment, rod } from './equipment';
import type { FishingRig } from './equipment';
import { architecture } from './architecture';
import { avatar } from './avatars';
import { pool } from './water';
import { configureSun } from './lighting';
import { CATCH_WAIT_LABEL } from './fishSpecies';
import { palette as c } from './style';
import { entry, opposite, review, seats } from './layout';
import { FishingState } from './state';
import { FISHING_UI_VISIBLE } from './presentation';
export const sessions=new WeakMap<Group,FishingSession>();
const models=new WeakMap<Group,ReturnType<typeof buildFishing>>();
export function buildFishing(root:Group){
  configureSun(root);
  const kit=new Kit();architecture(root,kit);const water=pool(root,kit);equipment(root,kit);
  const rigs=new Map<string,FishingRig>(),avatars=new Map<string,Group>(),panels=new Map<string,Group>();let i=0;
  for(const seat of seats){
    root.add(chair(kit,seat));rigs.set(seat.id,rod(root,kit,seat));
    if(seat.npc&&FISHING_UI_VISIBLE)avatars.set(seat.id,avatar(root,kit,seat,i++));
    const panel=new Group();panel.position.fromArray(seat.position);panel.rotation.y=seat.yaw;root.add(panel);
    if(FISHING_UI_VISIBLE){
      control(panel,kit,'투입 · 회수',`cast:${seat.id}`,-.4);
      control(panel,kit,'일어나기',`stand:${seat.id}`,0);
    }
    panel.traverse(n=>n.userData.dynamic=true);panel.visible=false;panels.set(seat.id,panel);
  }
  // Controller-selectable global controls at the entrance, independent of HTML.
  if(FISHING_UI_VISIBLE){
    const kiosk=new Group();kiosk.position.set(1.7,0,4.9);kiosk.rotation.y=Math.PI;root.add(kiosk);
    control(kiosk,kit,'시작 위치','home',-.4);control(kiosk,kit,'샘플 인물','samples',0);control(kiosk,kit,'물 효과','quality',.4);
    kiosk.traverse(n=>n.userData.dynamic=true);
  }
  kit.batch(root);kit.finish(root);
  const result={water,rigs,avatars,panels};models.set(root,result);return result;
}
function control(root:Group,kit:Kit,label:string,id:string,x:number){
  const g=new Group();root.add(g);kit.box(g,[.35,.17,.045],[x,.91,-.58],c.deepTeal);
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=144;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=c.deepTeal;ctx.fillRect(0,0,384,144);ctx.fillStyle=c.ivory;ctx.font='500 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,192,72);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;const m=new Mesh(new PlaneGeometry(.34,.15),new MeshBasicMaterial({map}));m.position.set(x,.91,-.554);g.add(m);action(g,id,label);
}
export class FishingSession implements WorldBehavior {
  readonly state=new FishingState(Math.random,()=>performance.now(),FISHING_UI_VISIBLE);
  seatAuthority?:{request(id:string):void;stand():void};
  message='빈 의자에 가까이 가서 E 또는 클릭으로 앉아보세요.';
  private model:ReturnType<typeof buildFishing>;
  private stop:()=>void;
  constructor(private ctx:WorldBehaviorContext){
    this.model=models.get(ctx.root)!;sessions.set(ctx.root,this);ctx.player.unrestrictedTracking=true;
    this.stop=ctx.interactions.actions.subscribe(a=>{if(a.type!=='action')return;const [kind,id]=a.objectId.split(':');this.perform(kind,id);});
    this.state.changes.subscribe(()=>this.sync());this.sync();
  }
  perform(kind:string,id?:string){
    const {player,isXR}=this.ctx;
    if(kind==='seat'){
      if(this.seatAuthority){if(id)this.seatAuthority.request(id);return;}
      const seat=seats.find(s=>s.id===id);
      if(!seat||player.feet.distanceTo(new Vector3(...seat.position))>3){this.say('의자에 조금 더 가까이 다가가세요.');return;}
      if(this.state.occupancy.has(seat.id)){this.say('사용 중인 자리입니다. 빈 의자를 선택해 주세요.');return;}
      if(this.state.sit(seat.id)){player.sit(new Vector3(...seat.position),seat.yaw);this.say(`${seat.id}번 자리 · 낚싯대 또는 F로 찌를 투입하세요.`);}
    }else if(kind==='nearest'){
      const seat=seats.filter(s=>!this.state.occupancy.has(s.id)).sort((a,b)=>player.feet.distanceToSquared(new Vector3(...a.position))-player.feet.distanceToSquared(new Vector3(...b.position)))[0];
      if(seat)this.perform('seat',seat.id);
    }else if(kind==='rod'||kind==='cast'){
      if(!this.state.user.seatId||(id&&id!==this.state.user.seatId)){this.say('먼저 해당 자리에 앉아 주세요.');return;}
      this.state.toggleCast();this.say(this.state.user.fishing==='cast'?`찌를 투입했습니다. ${CATCH_WAIT_LABEL} 사이에 물고기가 잡힙니다.`:'낚싯줄을 회수했습니다.');
    }else if(kind==='stand'){
      if(this.seatAuthority){this.seatAuthority.stand();return;}
      const seat=seats.find(s=>s.id===this.state.user.seatId);this.state.stand();
      if(seat)player.place(new Vector3(...seat.stand),seat.yaw);this.say('통로로 돌아왔습니다. 다른 자리를 둘러보세요.');
    }else if(kind==='samples'){
      if(!this.state.samples&&seats.find(s=>s.id===this.state.user.seatId)?.npc)this.perform('stand');
      this.state.toggleSamples();this.say(this.state.samples?'시연용 인물 5명을 표시합니다.':'시연용 인물을 숨겼습니다.');
    }else if(kind==='quality'){
      this.state.low=!this.state.low;this.ctx.setQuality?.(this.state.low);this.state.changes.emit();this.say(this.state.low?'가벼운 그래픽을 사용합니다.':'셰이더 그래픽을 사용합니다.');
    }else if(['home','review','opposite'].includes(kind)){
      if(isXR()&&kind!=='home')return;
      this.perform('stand');const pose=kind==='review'?review:kind==='opposite'?opposite:entry;
      player.place(new Vector3(...pose.position),pose.yaw,kind==='review'?review.eye:1.65);
      if(kind==='review'&&!isXR())player.look(0,-review.pitch/.002);
      this.say(kind==='review'?'전체 구도 검수 시점 · 시작 위치로 돌아가 탐색할 수 있습니다.':kind==='opposite'?'반대편 통로 시점입니다.':'입장 위치로 돌아왔습니다.');
    }
    this.sync();
  }
  applyNetworkSeat(id:string|null):void{
    const authority=this.seatAuthority;this.seatAuthority=undefined;
    try{if(this.state.user.seatId!==id){if(this.state.user.seatId)this.perform('stand');if(id)this.perform('seat',id);}}
    finally{this.seatAuthority=authority;}
  }
  private say(message:string){this.message=message;this.ctx.interactions.messages.emit(message);this.state.changes.emit();}
  private sync(){
    for(const seat of seats){
      const npc=this.state.samples&&seat.npc;
      const person=this.model.avatars.get(seat.id);if(person)person.visible=npc;
      const selected=this.state.user.seatId===seat.id;this.model.panels.get(seat.id)!.visible=selected&&FISHING_UI_VISIBLE;
      const r=this.model.rigs.get(seat.id)!;r.root.visible=npc||selected;
    }
    this.ctx.root.userData.shadowDirty=true;
    this.ctx.root.userData.fishing={user:{...this.state.user},samples:this.state.samples,occupancy:Object.fromEntries(this.state.occupancy),low:this.state.low};
  }
  update(time:number){
    const caught=this.state.tick();
    if(caught){
      const seat=seats.find(s=>s.id===this.state.user.seatId);
      if(seat)this.model.water.showCatch(time,seat.cast,caught.species);
      this.say(`${caught.name} ${caught.lengthCm}cm를 잡았습니다! 오늘 ${this.state.user.catchCount}마리 · 다시 투입해 보세요.`);
    }
    this.model.water.update(time,this.state.low);
    for(const seat of seats){
      const active=this.state.samples&&seat.npc||this.state.user.seatId===seat.id;
      const rig=this.model.rigs.get(seat.id)!;
      rig.update(time,!!(this.state.samples&&seat.npc||this.state.user.seatId===seat.id&&this.state.user.fishing==='cast'),this.state.user.seatId===seat.id&&this.state.biting);
      rig.root.visible=active;
      const a=this.model.avatars.get(seat.id);if(a){a.rotation.x=Math.sin(time*.6+seat.position[0])*.003;const arms=a.getObjectByName('fishing-arms');if(arms)arms.rotation.x=Math.sin(time*.75+seat.position[0])*.009;}
    }
    this.state.user.position=this.ctx.player.feet.toArray();this.state.user.yaw=this.ctx.player.rig.rotation.y;
  }
  dispose(){
    this.stop();const seat=seats.find(s=>s.id===this.state.user.seatId);if(seat)this.ctx.player.place(new Vector3(...seat.stand),seat.yaw);
    this.ctx.player.unrestrictedTracking=false;this.state.dispose();sessions.delete(this.ctx.root);models.delete(this.ctx.root);
  }
}
