import { Group, Vector3 } from 'three';
import type { Engine } from '../engine/core/Engine';
import type { PeerState, RoomLayout, Seat } from '../../shared/social';
import layouts from '../../shared/rooms.json';
import { SocialClient } from './SocialClient';
import { AvatarPool } from './AvatarPool';
import type { AvatarActor } from './AvatarPool';
import { Nickname } from './Nickname';
import { RemotePose } from './RemotePose';
import { SpatialVoice } from './SpatialVoice';
import { SocialUI } from './SocialUI';
import { sessions } from '../worlds/indoor-fishing/runtime';

interface Remote {actor:AvatarActor;label:Nickname;pose:RemotePose;state:PeerState}
interface Scope {world:Group;root:Group;pool:AvatarPool;self?:AvatarActor;remotes:Map<string,Remote>;pending:Set<string>;last:Vector3}
export class SocialExperience {
  readonly client=new SocialClient();readonly voice=new SpatialVoice(this.client);readonly ui:SocialUI;
  private scope?:Scope;private events=new AbortController();private stops:Array<()=>void>;
  private nickname='';private roomId:string;private since=0;private applied='';private seatId:string|null=null;
  private disposed=false;private notice='';private moving=false;private localWave=0;private seatPending=false;
  private readonly roomLayouts=layouts as RoomLayout[];
  constructor(readonly engine:Engine,host:HTMLElement){
    this.roomId=new URLSearchParams(location.search).get('room')||'public';
    if(!/^[a-zA-Z0-9_-]{1,40}$/.test(this.roomId))this.roomId='public';
    this.ui=new SocialUI(host,this.client,this.voice,{join:name=>this.join(name),wave:()=>this.wave(),seat:()=>{void this.interact();},leave:()=>this.leave()});
    this.stops=[engine.worlds.changes.subscribe(state=>{
      if(state.status==='loading')this.scope?.root.removeFromParent();
      else if(state.status==='ready'&&engine.worlds.active){
        if(this.scope?.world!==engine.worlds.active.root){this.mount(engine.worlds.active.root);if(this.nickname)this.join(this.nickname);}
        else engine.worlds.active.root.add(this.scope.root);
      }else if(state.status==='error'&&this.scope)this.scope.world.add(this.scope.root);
      else if(state.status==='idle'){this.leave();this.unmount();}
    }),engine.frames.subscribe(frame=>this.update(frame.delta)),this.client.changes.subscribe(()=>this.network()),this.client.corrections.subscribe(state=>{
      if(['ready','error'].includes(this.engine.worlds.state.status)&&!state.seatId)this.engine.player.place(new Vector3(...state.position),state.yaw);
    })];
    window.addEventListener('keydown',event=>{
      if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable]')))return;
      if(event.code==='Digit1'){event.preventDefault();this.wave();}
      if(event.code==='KeyE'&&this.client.self){event.preventDefault();event.stopImmediatePropagation();void this.interact();}
      if(event.code==='KeyQ'&&this.client.self?.seatId){event.preventDefault();event.stopImmediatePropagation();void this.requestSeat(null);}
    },{signal:this.events.signal,capture:true});
    // Standalone fishing does not have the service shell's focus/input adapter.
    if(!host.classList.contains('service-shell')){
      host.addEventListener('focusin',()=>engine.setDesktopEnabled(!this.editing()),{signal:this.events.signal});
      host.addEventListener('focusout',()=>queueMicrotask(()=>{if(!this.disposed)engine.setDesktopEnabled(!this.editing());}),{signal:this.events.signal});
    }
    if(engine.worlds.active)this.mount(engine.worlds.active.root);
    window.addEventListener('pagehide',()=>this.dispose(),{once:true,signal:this.events.signal});
  }
  private editing():boolean{return document.activeElement instanceof HTMLElement&&!!document.activeElement.closest('input,textarea,select,[contenteditable]');}
  private layout():RoomLayout|undefined{return this.roomLayouts.find(l=>l.id===this.engine.worlds.active?.config.id);}
  setScreen(screen:string):void{if(screen==='rating')this.leave();this.ui.visible(['my-room','modes','simulation'].includes(screen));}
  private join(nickname:string):void{
    const world=this.engine.worlds.active?.config.id;if(!world||!['ready','error'].includes(this.engine.worlds.state.status)){this.client.error='공간 로딩이 끝난 뒤 입장해 주세요.';this.client.changes.emit();return;}
    this.nickname=nickname;this.applied='';this.localWave=0;this.seatId=null;this.voice.stop();
    void this.client.join({world,room:this.roomId,nickname});
  }
  private leave():void{this.nickname='';this.voice.stop();this.client.leave(true);this.applied='';this.applySeat(null);}
  private mount(world:Group):void{
    this.unmount();const root=new Group();root.name='social-avatars';world.add(root);
    const scope:Scope={world,root,pool:new AvatarPool(),remotes:new Map(),pending:new Set(),last:this.engine.player.feet};this.scope=scope;
    void scope.pool.create().then(actor=>{
      if(this.scope!==scope||this.disposed){scope.pool.release(actor);return;}
      scope.self=actor;actor.root.name='self-avatar';actor.root.visible=false;root.add(actor.root);actor.root.position.copy(this.engine.player.feet);
    }).catch(error=>{if(this.scope===scope){this.client.error=`아바타를 열 수 없습니다: ${error instanceof Error?error.message:'파일 확인 필요'}`;this.client.changes.emit();}});
  }
  private unmount():void{
    if(!this.scope)return;const scope=this.scope;this.scope=undefined;
    const fishing=sessions.get(scope.world);if(fishing)fishing.seatAuthority=undefined;
    scope.root.removeFromParent();for(const remote of scope.remotes.values())remote.label.dispose();scope.pool.dispose();
  }
  private network():void{
    const scope=this.scope,state=this.client.self,snapshot=this.client.snapshot;if(!scope)return;
    const fishing=sessions.get(scope.world);
    if(fishing)fishing.seatAuthority=state?{request:id=>{void this.requestSeat(id);},stand:()=>{void this.requestSeat(null);}}:undefined;
    if(!state||!snapshot){
      for(const [id,remote] of scope.remotes){remote.label.dispose();scope.pool.release(remote.actor);scope.remotes.delete(id);}
      this.applySeat(null);return;
    }
    const identity=snapshot.room+state.id;
    if(identity!==this.applied){this.applied=identity;fishing?.applyNetworkSeat(null);this.engine.player.place(new Vector3(...state.position),state.yaw);scope.last.copy(this.engine.player.feet);}
    if(this.seatId!==state.seatId)this.applySeat(state.seatId);
    const others=snapshot.users.filter(u=>u.id!==state.id),ids=new Set(others.map(u=>u.id));
    for(const [id,remote] of scope.remotes)if(!ids.has(id)){remote.label.dispose();scope.pool.release(remote.actor);scope.remotes.delete(id);}
    for(const user of others){
      const remote=scope.remotes.get(user.id);
      if(remote){remote.state=user;remote.pose.push(user,performance.now());}
      else if(!scope.pending.has(user.id)){
        scope.pending.add(user.id);
        void scope.pool.create().then(actor=>{
          scope.pending.delete(user.id);const current=this.client.snapshot?.users.find(u=>u.id===user.id);
          if(this.scope!==scope||!current||current.id===this.client.self?.id){scope.pool.release(actor);return;}
          const label=new Nickname(current.nickname),pose=new RemotePose();pose.push(current,performance.now());actor.root.add(label.sprite);actor.root.name='remote-avatar:'+current.id;actor.root.userData.peerId=current.id;actor.root.position.fromArray(current.position);actor.root.rotation.y=current.yaw;scope.root.add(actor.root);scope.remotes.set(current.id,{actor,label,pose,state:current});
        }).catch(()=>{scope.pending.delete(user.id);});
      }
    }
  }
  private applySeat(id:string|null):void{
    const previous=this.layout()?.seats.find(s=>s.id===this.seatId),seat=this.layout()?.seats.find(s=>s.id===id);this.seatId=id;
    const fishing=this.scope?sessions.get(this.scope.world):undefined;
    if(fishing)fishing.applyNetworkSeat(id);
    if(seat)this.engine.player.sit(new Vector3(...seat.position),seat.yaw);
    else if(previous)this.engine.player.place(new Vector3(...previous.stand),previous.yaw);
    if(this.scope)this.scope.last.copy(this.engine.player.feet);
  }
  private wave():void{
    if(!this.client.self||this.client.self.seatId)return;this.localWave=this.client.self.wave+1;
    this.scope?.self?.pose(this.moving,false,this.localWave);this.client.wave();
  }
  private nearest():Seat|undefined{
    return [...this.layout()?.seats??[]].filter(s=>this.engine.player.feet.distanceTo(new Vector3(...s.stand))<=2.6)
      .sort((a,b)=>this.engine.player.feet.distanceToSquared(new Vector3(...a.stand))-this.engine.player.feet.distanceToSquared(new Vector3(...b.stand)))[0];
  }
  private async interact():Promise<void>{if(this.client.self?.seatId)await this.requestSeat(null);else{const seat=this.nearest();if(seat)await this.requestSeat(seat.id);}}
  private async requestSeat(id:string|null):Promise<void>{
    if(this.seatPending)return;this.seatPending=true;
    try{const state=await this.client.seat(id);if(state)this.applySeat(state.seatId);}finally{this.seatPending=false;}
  }
  private update(delta:number):void{
    if(this.engine.worldFrozen)return;
    const scope=this.scope;if(!scope||!['ready','error'].includes(this.engine.worlds.state.status)||this.engine.worlds.active?.root!==scope.world)return;
    this.engine.player.setThirdPerson(false);
    const feet=this.engine.player.feet;this.moving=feet.distanceToSquared(scope.last)>.000005;scope.last.copy(feet);
    const own=scope.self;
    if(own){
      own.root.position.copy(feet);own.root.rotation.y=this.engine.player.rig.rotation.y;
      own.root.visible=false;own.pose(this.moving,this.engine.player.seated,Math.max(this.localWave,this.client.self?.wave??0));
      own.seatHeight(this.layout()?.seats.find(s=>s.id===(this.seatId??sessions.get(scope.world)?.state.user.seatId))?.surfaceHeight??null);own.update(delta);
    }
    const positions=new Map<string,Vector3>();
    for(const [id,remote] of scope.remotes){const target=remote.pose.sample(performance.now());if(target){
      if(remote.actor.root.userData.seat!==remote.state.seatId){remote.actor.root.position.copy(target.position);remote.actor.root.userData.seat=remote.state.seatId;}
      else remote.actor.root.position.lerp(target.position,1-Math.exp(-18*Math.min(.1,delta)));
      remote.actor.root.rotation.y+=Math.atan2(Math.sin(target.yaw-remote.actor.root.rotation.y),Math.cos(target.yaw-remote.actor.root.rotation.y))*(1-Math.exp(-18*Math.min(.1,delta)));
    }
      remote.actor.pose(remote.state.animation==='walk',!!remote.state.seatId,remote.state.wave,remote.state.animation==='wave');remote.actor.seatHeight(this.layout()?.seats.find(s=>s.id===remote.state.seatId)?.surfaceHeight??null);remote.actor.update(delta);
      remote.label.sprite.position.y=2+Math.max(0,remote.actor.model.position.y);remote.label.sprite.visible=remote.actor.root.position.distanceTo(feet)<18;positions.set(id,remote.actor.root.position);
    }
    this.voice.update(this.engine.rendering.camera,positions);
    this.since+=Math.max(0,delta);
    if(this.since>=1/15){this.since=0;const xr=this.engine.xr.state.active,teleport=xr&&!!this.client.self&&feet.distanceTo(new Vector3(...this.client.self.position))>.65;this.client.state(feet.toArray(),xr?this.engine.player.xrHeading:this.engine.player.rig.rotation.y,teleport);scope.world.userData.shadowDirty=true;
      const seat=this.nearest(),occupied=seat&&this.client.snapshot?.users.some(u=>u.seatId===seat.id&&u.id!==this.client.self?.id);
      const label=this.client.self?.seatId?'일어나기 · E':seat?(occupied?'사용 중인 자리':'앉기 · E'):'가까운 좌석 없음',key=label+!!this.client.self;
      if(key!==this.notice){this.notice=key;this.ui.interaction(label,!!this.client.self&&(!!this.client.self.seatId||!!seat&&!occupied));}
    }
  }
  diagnostics(){return {room:this.client.snapshot?.room??null,id:this.client.self?.id??null,status:this.client.status,users:this.client.snapshot?.users??[],camera:{position:this.engine.rendering.camera.getWorldPosition(new Vector3()).toArray(),local:this.engine.rendering.camera.position.toArray()},local:this.scope?.self?{animation:this.scope.self.root.userData.animation,position:this.scope.self.root.position.toArray(),skeletons:this.skeletons(this.scope.self),visible:this.scope.self.root.visible}:null,remotes:[...this.scope?.remotes??[]].map(([id,r])=>({id,position:r.actor.root.position.toArray(),animation:r.actor.root.userData.animation,skeletons:this.skeletons(r.actor),visible:r.actor.root.visible})),voice:{enabled:this.voice.enabled,muted:this.voice.muted,peers:this.voice.peers.size},thirdPerson:this.engine.player.thirdPerson};}
  private skeletons(actor:AvatarActor):number{const ids=new Set<unknown>();actor.model.traverse(n=>{const s=(n as unknown as {skeleton?:unknown}).skeleton;if(s)ids.add(s);});return ids.size;}
  dispose():void{if(this.disposed)return;this.disposed=true;this.events.abort();this.stops.forEach(s=>s());this.ui.dispose();this.voice.dispose();this.client.dispose();this.unmount();this.engine.player.setThirdPerson(false);}
}
