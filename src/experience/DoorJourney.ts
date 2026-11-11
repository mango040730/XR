import {Vector3} from 'three';
import type {Engine} from '../engine/core/Engine';
import {doorPath,doorway} from '../worlds/my-room/doorway';
import {myRoom} from '../worlds/my-room/config';
import {myRoomSeats} from '../worlds/my-room/seats';
import {setPortalOpen} from '../worlds/my-room/portal';

const ease=(t:number)=>t*t*(3-2*t);
const angle=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export class DoorJourney {
 private controller?:AbortController;
 private restore?:()=>void;
 private veil=document.createElement('div');
 private message=document.createElement('p');
 constructor(private engine:Engine,private shell:HTMLElement,viewport:HTMLElement,private changed:()=>void,private immersive:()=>boolean){
  this.veil.className='door-transition-veil';this.veil.setAttribute('aria-hidden','true');this.message.className='door-transition-message';this.message.setAttribute('role','status');this.veil.append(this.message);viewport.append(this.veil);
 }
 private begin(message:string):AbortSignal{
  this.cancel();this.controller=new AbortController();this.message.textContent=message;this.veil.removeAttribute('aria-hidden');this.shell.classList.add('is-travelling');this.engine.setPresentationActive(true);this.changed();
  const root=this.engine.worlds.active?.root,player=this.engine.player,position=player.feet,yaw=player.rig.rotation.y,pitch=player.camera.rotation.x,height=player.camera.position.y,seated=player.seated;
  const movementExit=player.movementExitPosition;
  this.restore=()=>{if(root&&this.engine.worlds.active?.root===root){setPortalOpen(root,0);if(seated)player.sit(position,yaw,movementExit,pitch);else player.place(position,yaw,height,pitch);}};
  return this.controller.signal;
 }
 private animate(duration:number,step:(t:number)=>void,signal:AbortSignal):Promise<void>{
  signal.throwIfAborted();return new Promise((resolve,reject)=>{
   let elapsed=0;const finish=(error?:unknown)=>{stop();signal.removeEventListener('abort',abort);if(error)reject(error);else resolve();};
   const abort=()=>finish(signal.reason??new DOMException('취소됨','AbortError'));
   const stop=this.engine.frames.subscribe(({delta})=>{elapsed+=Math.max(0,Math.min(delta,.05));const t=Math.min(1,elapsed/duration);step(t);if(t===1)finish();});signal.addEventListener('abort',abort,{once:true});step(0);
  });
 }
 async depart(message:string):Promise<void>{
  const signal=this.begin(message),root=this.engine.worlds.active!.root,player=this.engine.player;
  const reduced=this.immersive()||matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced){
   const initial=player.feet,initialYaw=player.rig.rotation.y,initialPitch=player.camera.rotation.x,height=player.camera.position.y;
   const seat=player.seated?[...myRoomSeats].sort((a,b)=>new Vector3(...a.position).distanceToSquared(initial)-new Vector3(...b.position).distanceToSquared(initial))[0]:null;
   const start=seat?new Vector3(...seat.stand):initial.clone(),route=doorPath(start,myRoom);
   const first=route[1].clone().sub(start),heading=first.lengthSq()<1e-8?doorway.outwardYaw:Math.atan2(-first.x,-first.z);
   await this.animate(.42,t=>{const k=ease(t);player.place(initial.clone().lerp(start,k),angle(initialYaw,heading,k),height+(1.65-height)*k,initialPitch*(1-k));},signal);
   for(let i=1;i<route.length;i++){
    const a=route[i-1],b=route[i];if(a.distanceToSquared(b)<1e-8)continue;const d=b.clone().sub(a),yaw=Math.atan2(-d.x,-d.z),fromYaw=player.rig.rotation.y;
    await this.animate(Math.max(.25,a.distanceTo(b)/2.7),t=>{player.place(a.clone().lerp(b,ease(t)),angle(fromYaw,yaw,Math.min(1,t*3)),1.65);},signal);
   }
   const fromYaw=player.rig.rotation.y;await this.animate(.55,t=>{player.place(new Vector3(...doorway.arrival),angle(fromYaw,0,ease(t)),1.65);setPortalOpen(root,ease(t));},signal);
   await this.animate(.48,t=>{player.place(new Vector3(...doorway.arrival).lerp(new Vector3(...doorway.threshold),ease(t)),0,1.65);this.veil.style.opacity=String(ease(t));},signal);
  }else{await this.animate(.22,t=>{setPortalOpen(root,t);this.veil.style.opacity=String(t);},signal);}
 }
 async cover(message:string):Promise<void>{const signal=this.begin(message);await this.animate(.18,t=>this.veil.style.opacity=String(t),signal);}
 async reveal():Promise<void>{
  if(!this.controller)return;const signal=this.controller.signal;this.restore=undefined;
  await this.animate(.32,t=>this.veil.style.opacity=String(1-ease(t)),signal);this.finish();
 }
 private finish():void{this.restore=undefined;this.controller=undefined;this.veil.style.opacity='0';this.message.textContent='';this.veil.setAttribute('aria-hidden','true');this.shell.classList.remove('is-travelling');this.engine.setPresentationActive(false);this.changed();}
 cancel():void{this.controller?.abort();this.restore?.();this.finish();}
 dispose():void{this.cancel();this.veil.remove();}
}
