import { Vector3 } from 'three';
import type { Camera } from 'three';
import { Signal } from '../engine/core/Signal';
import type { IncomingRtc } from '../../shared/social';
import type { SocialClient } from './SocialClient';
interface VoicePeer {pc:RTCPeerConnection;pending:RTCIceCandidateInit[];source?:MediaStreamAudioSourceNode;panner?:PannerNode;gain?:GainNode;audio?:HTMLAudioElement;offering:boolean}
export function distanceGain(distance:number):number{if(!Number.isFinite(distance))return 0;const t=Math.max(0,Math.min(1,(distance-1.5)/10.5));return 1-t*t*(3-2*t);}
export class SpatialVoice {
  readonly changes=new Signal<void>(); readonly peers=new Map<string,VoicePeer>();
  enabled=false;muted=false;error='';pending=false;
  private stream?:MediaStream;private audio?:AudioContext;private room='';private generation=0;
  private stops:Array<()=>void>;
  constructor(private client:SocialClient){this.stops=[client.changes.subscribe(()=>this.sync()),client.rtc.subscribe(s=>{void this.receive(s);})];}
  async start():Promise<void>{
    if(!this.client.self||this.pending||this.enabled)return;
    const generation=++this.generation,room=this.client.snapshot?.room;this.pending=true;this.error='';this.changes.emit();
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('음성은 HTTPS 또는 localhost에서 사용할 수 있습니다.');
      // Resume while handling the explicit button gesture, before permission awaits.
      this.audio=new AudioContext();await this.audio.resume();
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
      if(generation!==this.generation||room!==this.client.snapshot?.room){stream.getTracks().forEach(t=>t.stop());return;}
      this.stream=stream;this.room=room!;this.enabled=true;this.muted=false;this.client.voice(true);this.sync();
    }catch(error){if(generation!==this.generation)return;this.stop();this.error=error instanceof Error?error.message:'마이크를 켤 수 없습니다.';}
    finally{if(generation===this.generation){this.pending=false;this.changes.emit();}}
  }
  mute():void{if(!this.enabled)return;this.muted=!this.muted;this.stream?.getAudioTracks().forEach(t=>{t.enabled=!this.muted;});this.changes.emit();}
  private sync():void{
    if(!this.enabled)return;
    if(this.client.snapshot?.room!==this.room||!this.client.self){this.stop();return;}
    const active=new Set(this.client.snapshot.users.filter(u=>u.id!==this.client.self!.id&&u.voice).map(u=>u.id));
    for(const id of this.peers.keys())if(!active.has(id))this.remove(id);
    for(const id of active)if(!this.peers.has(id))this.create(id);
  }
  private create(id:string):VoicePeer{
    const pc=new RTCPeerConnection({iceServers:this.client.iceServers}),peer:VoicePeer={pc,pending:[],offering:false};this.peers.set(id,peer);
    for(const track of this.stream!.getTracks())pc.addTrack(track,this.stream!);
    pc.onicecandidate=e=>{if(e.candidate&&this.peers.get(id)===peer)this.client.signal({to:id,candidate:e.candidate.toJSON()});};
    pc.onnegotiationneeded=async()=>{
      // Deterministic offerer for one fixed audio track; avoids offer glare.
      if(this.client.self!.id>id||peer.offering)return;peer.offering=true;
      try{await pc.setLocalDescription();if(this.peers.get(id)===peer)this.client.signal({to:id,description:pc.localDescription!.toJSON()});}
      catch{if(this.peers.get(id)===peer)this.fail();}finally{peer.offering=false;}
    };
    pc.ontrack=e=>{
      if(!this.audio||this.peers.get(id)!==peer)return;
      peer.source?.disconnect();peer.panner?.disconnect();peer.gain?.disconnect();
      const stream=e.streams[0]??new MediaStream([e.track]);
      const audio=document.createElement('audio');audio.srcObject=stream;audio.autoplay=true;audio.muted=true;peer.audio=audio;void audio.play().catch(()=>{});
      peer.source=this.audio.createMediaStreamSource(stream);peer.panner=this.audio.createPanner();peer.panner.panningModel='HRTF';peer.panner.distanceModel='inverse';peer.panner.refDistance=1.5;peer.panner.maxDistance=12;peer.panner.rolloffFactor=.6;
      peer.gain=this.audio.createGain();peer.gain.gain.value=0;
      peer.source.connect(peer.panner).connect(peer.gain).connect(this.audio.destination);this.changes.emit();
    };
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')this.fail();this.changes.emit();};
    return peer;
  }
  private fail():void{this.error='음성 연결에 실패했습니다. 서버의 STUN/TURN 설정과 네트워크를 확인해 주세요.';this.changes.emit();}
  private async receive(signal:IncomingRtc):Promise<void>{
    if(!this.enabled||signal.room!==this.room||!this.client.snapshot?.users.some(u=>u.id===signal.from&&u.voice))return;
    const peer=this.peers.get(signal.from)??this.create(signal.from),pc=peer.pc;
    try{
      if(signal.description){
        await pc.setRemoteDescription(signal.description);
        for(const candidate of peer.pending.splice(0))await pc.addIceCandidate(candidate);
        if(signal.description.type==='offer'){await pc.setLocalDescription();if(this.peers.get(signal.from)===peer)this.client.signal({to:signal.from,description:pc.localDescription!.toJSON()});}
      }else if(signal.candidate){if(pc.remoteDescription)await pc.addIceCandidate(signal.candidate);else if(peer.pending.length<64)peer.pending.push(signal.candidate);}
    }catch{if(this.peers.get(signal.from)===peer)this.fail();}
  }
  update(camera:Camera,positions:Map<string,Vector3>):void{
    if(!this.audio||!this.enabled)return;
    const time=this.audio.currentTime,listener=this.audio.listener,p=camera.getWorldPosition(new Vector3()),forward=camera.getWorldDirection(new Vector3());
    listener.positionX.value=p.x;listener.positionY.value=p.y;listener.positionZ.value=p.z;
    listener.forwardX.value=forward.x;listener.forwardY.value=forward.y;listener.forwardZ.value=forward.z;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;
    for(const [id,peer] of this.peers){const position=positions.get(id);if(!position||!peer.panner||!peer.gain)continue;
      peer.panner.positionX.value=position.x;peer.panner.positionY.value=position.y+1.5;peer.panner.positionZ.value=position.z;
      // Body-to-body distance controls range; camera orbit never changes who can hear.
      const self=this.client.self;const distance=self?position.distanceTo(new Vector3(...self.position)):Infinity;
      peer.gain.gain.setTargetAtTime(distanceGain(distance),time,.08);
    }
  }
  async diagnostics(){return Promise.all([...this.peers].map(async([id,p])=>{let received=0;for(const s of (await p.pc.getStats()).values())if(s.type==='inbound-rtp'&&s.kind==='audio')received+=s.bytesReceived??0;return {id,state:p.pc.connectionState,received,gain:p.gain?.gain.value??0,tracks:p.pc.getReceivers().filter(r=>r.track.kind==='audio').length};}));}
  private remove(id:string):void{const p=this.peers.get(id);if(!p)return;this.peers.delete(id);p.pc.ontrack=null;p.pc.onicecandidate=null;p.pc.onnegotiationneeded=null;p.pc.close();p.source?.disconnect();p.panner?.disconnect();p.gain?.disconnect();if(p.audio){p.audio.pause();p.audio.srcObject=null;}}
  stop():void{++this.generation;this.pending=false;this.enabled=false;this.muted=false;this.client.voice(false);for(const id of this.peers.keys())this.remove(id);this.stream?.getTracks().forEach(t=>t.stop());this.stream=undefined;void this.audio?.close().catch(()=>{});this.audio=undefined;this.room='';this.changes.emit();}
  dispose():void{this.stop();this.stops.forEach(s=>s());this.changes.clear();}
}
