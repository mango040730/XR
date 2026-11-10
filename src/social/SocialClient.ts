import { io } from 'socket.io-client';
import { Signal } from '../engine/core/Signal';
import type { ChatMessage, IncomingRtc, JoinRequest, JoinResult, PeerState, RoomSnapshot, RtcSignal } from '../../shared/social';

export class SocialClient {
  readonly available=!(import.meta.env.VITE_STATIC_HOST==='github-pages'&&!import.meta.env.VITE_SOCIAL_SERVER_URL);
  readonly changes=new Signal<void>(); readonly messages=new Signal<ChatMessage>(); readonly rtc=new Signal<IncomingRtc>(); readonly corrections=new Signal<PeerState>();
  readonly socket=io(import.meta.env.VITE_SOCIAL_SERVER_URL||undefined,{autoConnect:false,transports:['websocket','polling'],reconnectionDelay:500,reconnectionDelayMax:4000,timeout:5000});
  snapshot:RoomSnapshot|null=null; self:PeerState|null=null; history:ChatMessage[]=[]; iceServers:RTCIceServer[]=[];
  status='입장 전'; error=''; desired:JoinRequest|null=null; private generation=0; private disposed=false;
  constructor(){
    if(!this.available){this.status='공간 둘러보기';this.error='실시간 연결을 준비 중입니다.';}
    this.socket.on('connect',()=>{if(this.desired)void this.join(this.desired);});
    this.socket.on('connect_error',()=>{this.status='서버 연결 실패 · 재시도 중';this.error='소셜 서버 실행 상태와 주소를 확인해 주세요.';this.changes.emit();});
    this.socket.on('disconnect',()=>{++this.generation;this.self=null;this.snapshot=null;this.status=this.desired?'연결 끊김 · 재접속 중':'입장 전';this.changes.emit();});
    this.socket.on('room:snapshot',(s:RoomSnapshot)=>{if(this.snapshot?.room!==s.room)return;this.snapshot=s;this.self=s.users.find(u=>u.id===this.socket.id)??null;this.changes.emit();});
    this.socket.on('chat:message',(m:ChatMessage)=>{if(!this.self)return;this.history=[...this.history,m].slice(-50);this.messages.emit(m);});
    this.socket.on('voice:signal',(s:IncomingRtc)=>{if(this.snapshot?.room===s.room)this.rtc.emit(s);});
    this.socket.on('player:correction',(s:PeerState)=>{if(s.id===this.self?.id)this.corrections.emit(s);});
  }
  async join(input:JoinRequest):Promise<void>{
    if(!this.available){this.status='공간 둘러보기';this.error='지금은 공간 둘러보기를 이용할 수 있어요.';this.changes.emit();return;}
    this.desired=input;this.error='';this.status='연결 중';this.changes.emit();
    if(!this.socket.connected){this.socket.connect();return;}
    const request=++this.generation;this.socket.emit('room:leave');this.self=null;this.snapshot=null;this.history=[];this.changes.emit();
    try{
      const result=await this.socket.timeout(5000).emitWithAck('room:join',input) as JoinResult;
      if(this.disposed||request!==this.generation)return;
      if(result.error||!result.self||!result.snapshot)throw new Error(result.error??'입장 응답을 받지 못했습니다.');
      this.self=result.self;this.snapshot=result.snapshot;this.history=result.messages??[];this.iceServers=result.iceServers??[];this.status='연결됨';
    }catch(error){if(request!==this.generation)return;this.error=error instanceof Error?error.message:'입장 실패';this.status='입장 실패';}
    this.changes.emit();
  }
  leave(disconnect=false):void{++this.generation;this.desired=null;this.socket.emit('room:leave');this.self=null;this.snapshot=null;this.history=[];this.status='입장 전';if(disconnect)this.socket.disconnect();this.changes.emit();}
  state(position:number[],yaw:number,teleport=false):void{if(this.self&&this.socket.connected){if(teleport)this.socket.emit('player:teleport',{position,yaw});else this.socket.volatile.emit('player:state',{position,yaw});}}
  wave():void{if(this.self)this.socket.emit('player:wave');}
  async seat(id:string|null):Promise<PeerState|undefined>{
    if(!this.self)return;const generation=this.generation;
    try{const r=await this.socket.timeout(4000).emitWithAck('seat:request',id) as {error?:string;self?:PeerState};if(generation!==this.generation)return;if(r.error)throw new Error(r.error);this.error='';this.changes.emit();return r.self;}
    catch(error){this.error=error instanceof Error?error.message:'좌석 요청 실패';this.changes.emit();}
  }
  async chat(text:string):Promise<boolean>{
    if(!this.self)return false;
    try{const r=await this.socket.timeout(4000).emitWithAck('chat:send',text) as {error?:string};if(r.error)throw new Error(r.error);this.error='';this.changes.emit();return true;}
    catch(error){this.error=error instanceof Error?error.message:'메시지 전송 실패';this.changes.emit();return false;}
  }
  voice(enabled:boolean):void{if(this.self)this.socket.emit('voice:state',enabled);}
  signal(signal:RtcSignal):void{if(this.self)this.socket.emit('voice:signal',signal);}
  dispose():void{this.disposed=true;this.leave(true);this.socket.removeAllListeners();this.changes.clear();this.messages.clear();this.rtc.clear();this.corrections.clear();}
}
