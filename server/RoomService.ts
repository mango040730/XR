import { randomUUID } from 'node:crypto';
import { Box3, Vector3 } from 'three';
import { CollisionSystem } from '../src/engine/collision/CollisionSystem.ts';
import { cleanText, validPosition, WAVE_SECONDS } from '../shared/social.ts';
import type { ChatMessage, JoinRequest, PeerState, RoomLayout, RoomSnapshot } from '../shared/social.ts';

interface Member { state: PeerState; budget: number; at: number; chat: number[]; actions: number[];teleportAt:number }
interface Room { key: string; layout: RoomLayout; collision: CollisionSystem; users: Map<string, Member>; messages: ChatMessage[] }
export class RoomService {
  readonly rooms = new Map<string, Room>();
  readonly membership = new Map<string, string>();
  private layouts: Map<string, RoomLayout>;
  constructor(layouts: RoomLayout[], private now: () => number = Date.now, readonly capacity = 16) { this.layouts = new Map(layouts.map(l => [l.id,l])); }
  join(id: string, input: JoinRequest): {error?:string;key?:string;state?:PeerState} {
    const layout = this.layouts.get(input?.world), nickname = cleanText(input?.nickname,24);
    if (!layout || !nickname || !/^[a-zA-Z0-9_-]{1,40}$/.test(input?.room ?? '')) return {error:'이름과 방을 확인해 주세요.'};
    const key = `${layout.id}:${input.room}`;
    let room = this.rooms.get(key);
    if (room && room.users.size >= this.capacity && !room.users.has(id)) return {error:'방이 가득 찼습니다.'};
    if (!room && this.rooms.size >= 256) return {error:'지금은 새 방을 열 수 없습니다.'};
    this.leave(id);
    room = this.rooms.get(key);
    if (!room) {
      room={key,layout,collision:new CollisionSystem({floors:layout.floors,maxStepHeight:layout.player.maxStepHeight,solids:layout.solids.map(b=>new Box3(new Vector3(...b.min),new Vector3(...b.max)))}),users:new Map(),messages:[]};
      this.rooms.set(key,room);
    }
    let position = [...layout.spawn.position] as [number,number,number];
    for(let i=0;i<16;i++) {
      const p = new Vector3(...layout.spawn.position).add(new Vector3((i%4)*.7,0,-Math.floor(i/4)*.7));
      if(room.collision.canStand(p,layout.player.radius,layout.player.height)&&![...room.users.values()].some(u=>p.distanceTo(new Vector3(...u.state.position))<.6)){position=p.toArray();break;}
    }
    const state:PeerState={id,nickname,avatar:'cub-scout-v6',position,yaw:layout.spawn.yaw,moving:false,animation:'idle',seatId:null,updatedAt:this.now(),wave:0,waveUntil:0,voice:false};
    room.users.set(id,{state,budget:.6,at:this.now(),chat:[],actions:[],teleportAt:0});this.membership.set(id,key);return {key,state};
  }
  roomFor(id:string):Room|undefined { const key=this.membership.get(id);return key?this.rooms.get(key):undefined; }
  user(id:string):PeerState|undefined{return this.roomFor(id)?.users.get(id)?.state;}
  leave(id:string):string|undefined{const key=this.membership.get(id);if(!key)return;const room=this.rooms.get(key);room?.users.delete(id);this.membership.delete(id);if(!room?.users.size)this.rooms.delete(key);return key;}
  snapshot(key:string):RoomSnapshot|undefined{
    const room=this.rooms.get(key);if(!room)return;
    const time=this.now();
    return {room:key,world:room.layout.id,time,users:[...room.users.values()].map(({state})=>({...state,position:[...state.position],animation:state.seatId?'sit':state.waveUntil>time?'wave':time-state.updatedAt<250&&state.moving?'walk':'idle'}))};
  }
  update(id:string,data:unknown):boolean{
    const room=this.roomFor(id),member=room?.users.get(id);if(!room||!member||!data||typeof data!=='object')return false;
    const input=data as {position:unknown;yaw:unknown},state=member.state,time=this.now();
    if(!validPosition(input.position)||typeof input.yaw!=='number'||!Number.isFinite(input.yaw)||state.seatId)return false;
    const dt=Math.max(0,(time-member.at)/1000);member.at=time;member.budget=Math.min(.65,member.budget+dt*room.layout.player.speed*1.3);
    const from=new Vector3(...state.position),to=new Vector3(...input.position),distance=from.distanceTo(to);
    if(Math.abs(to.y-from.y)>Math.max(.01,room.layout.player.maxStepHeight??0)||distance>member.budget)return false;
    const result=room.collision.move(from,to.clone().sub(from),room.layout.player.radius,room.layout.player.height);
    if(result.distanceTo(to)>.03)return false;
    member.budget-=distance;state.position=result.toArray();state.yaw=Math.atan2(Math.sin(input.yaw),Math.cos(input.yaw));state.moving=distance>.012;state.updatedAt=time;return true;
  }
  seat(id:string,seatId:string|null):string|undefined{
    const room=this.roomFor(id),member=room?.users.get(id);if(!room||!member)return '먼저 입장해 주세요.';
    const state=member.state;
    if(seatId===null){const previous=room.layout.seats.find(s=>s.id===state.seatId);if(previous)state.position=[...previous.stand];state.seatId=null;state.animation='idle';state.moving=false;member.budget=.2;member.at=this.now();state.updatedAt=this.now();return;}
    const seat=room.layout.seats.find(s=>s.id===seatId);if(!seat)return '없는 좌석입니다.';
    if([...room.users.values()].some(u=>u.state.seatId===seatId&&u.state.id!==id))return '다른 사용자가 앉아 있습니다.';
    if(new Vector3(...state.position).distanceTo(new Vector3(...seat.stand))>2.6)return '좌석 가까이 이동해 주세요.';
    state.seatId=seat.id;state.position=[...seat.position];state.yaw=seat.yaw;state.moving=false;state.animation='sit';state.waveUntil=0;state.updatedAt=this.now();return;
  }
  teleport(id:string,input:unknown):boolean{
    const room=this.roomFor(id),member=room?.users.get(id);if(!room||!member||member.state.seatId||!input||typeof input!=='object')return false;
    const data=input as {position:unknown;yaw:unknown};if(!validPosition(data.position)||typeof data.yaw!=='number'||!Number.isFinite(data.yaw)||this.now()-member.teleportAt<1200)return false;
    const from=new Vector3(...member.state.position),target=new Vector3(...data.position),policy=room.layout.teleport??{areas:room.layout.floors,maxDistance:8},p=room.layout.player;
    if(from.distanceTo(target)>policy.maxDistance||Math.abs(from.y-target.y)>Math.max(.01,room.layout.player.maxStepHeight??0)||!policy.areas.some(f=>Math.abs(target.y-f.y)<.01&&target.x-p.radius>=f.minX&&target.x+p.radius<=f.maxX&&target.z-p.radius>=f.minZ&&target.z+p.radius<=f.maxZ))return false;
    if(room.collision.move(from,target.clone().sub(from),p.radius,p.height).distanceTo(target)>.001)return false;
    member.state.position=target.toArray();member.state.yaw=Math.atan2(Math.sin(data.yaw),Math.cos(data.yaw));member.state.moving=false;member.state.updatedAt=this.now();member.teleportAt=this.now();member.at=this.now();member.budget=.1;return true;
  }
  action(id:string):boolean{const u=this.roomFor(id)?.users.get(id);if(!u)return false;const t=this.now();u.actions=u.actions.filter(n=>t-n<3000);if(u.actions.length>=4)return false;u.actions.push(t);return true;}
  wave(id:string):boolean{const u=this.user(id);if(!u||u.seatId||!this.action(id))return false;u.wave++;u.waveUntil=this.now()+WAVE_SECONDS*1000;return true;}
  chat(id:string,text:unknown):ChatMessage|undefined{
    const room=this.roomFor(id),member=room?.users.get(id),value=cleanText(text,500);if(!room||!member||!value)return;
    const now=this.now();member.chat=member.chat.filter(n=>now-n<10000);if(member.chat.length>=5)return;member.chat.push(now);
    const message={id:randomUUID(),authorId:id,nickname:member.state.nickname,text:value,time:now};room.messages.push(message);room.messages=room.messages.slice(-50);return message;
  }
}
