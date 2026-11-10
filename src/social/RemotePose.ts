import { Vector3 } from 'three';
import type { PeerState } from '../../shared/social';
interface Sample {time:number;position:Vector3;yaw:number;seat:string|null}
export class RemotePose {
  private samples:Sample[]=[];
  push(state:PeerState,time:number):void{this.samples.push({time,position:new Vector3(...state.position),yaw:state.yaw,seat:state.seatId});this.samples=this.samples.slice(-20);}
  sample(now:number):{position:Vector3;yaw:number}|null{
    if(!this.samples.length)return null;const time=now-100;
    while(this.samples.length>2&&this.samples[1].time<time)this.samples.shift();
    const a=this.samples[0],b=this.samples[1]??a;
    const alpha=b.time===a.time?1:Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time)));
    if(a.seat!==b.seat)return {position:b.position.clone(),yaw:b.yaw};
    return {position:a.position.clone().lerp(b.position,alpha),yaw:a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*alpha};
  }
}
