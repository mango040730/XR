import { Box3,Quaternion,Vector3 } from 'three';
import type { FishSpeciesId } from './fishSpecies';

export const SWIMMING={step:1/60,maxFrameDelta:.2,maxTurn:.7,maxPitch:.1,maxBank:.12,wallBuffer:.65,separation:1.0} as const;
export interface FishSize {species:FishSpeciesId;radius:number;halfHeight:number;halfWidth:number}
export interface Swimmer {
 position:Vector3;target:Vector3;velocity:Vector3;orientation:Quaternion;limits:Box3;
 heading:number;pitch:number;bank:number;speed:number;cruise:number;animationTime:number;
 targetDue:number;restUntil:number;goals:number;phase:number;
}
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const angle=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Stateful wandering, arrival, local separation and predictive wall avoidance. No orbit formula. */
export class FishSchool {
 readonly swimmers:Swimmer[];
 private previous:number|null=null;
 private accumulator=0;
 private elapsed=0;
 private forward=new Vector3();
 private nose=new Vector3(1,0,0);
 private roll=new Quaternion();
 constructor(sizes:FishSize[],water:{width:number;depth:number;bottom:number;surface:number},private random:()=>number=Math.random){
  this.swimmers=sizes.map((size,i)=>{
   const radius=size.radius+.06;
   const vertical=size.halfHeight+size.radius*Math.sin(SWIMMING.maxPitch)+size.halfWidth*Math.sin(SWIMMING.maxBank)+.05;
   const limits=new Box3(new Vector3(-water.width/2+radius,water.bottom+vertical,-water.depth/2+radius),new Vector3(water.width/2-radius,water.surface-vertical,water.depth/2-radius));
   const base=size.species==='pomfret'?.13:size.species==='mackerel'?.22:.18,cruise=base*(.8+this.random()*.4);
   const position=new Vector3((i%3-1)*2.1+(this.random()-.5)*.5,limits.min.y+.04+this.random()*(limits.max.y-limits.min.y-.08),(i<3?-.95:.95)+(this.random()-.5)*.3).clamp(limits.min,limits.max);
   const swimmer:Swimmer={position,target:new Vector3(),velocity:new Vector3(),orientation:new Quaternion(),limits,heading:0,pitch:0,bank:0,speed:cruise*.75,cruise,animationTime:this.random()*3,targetDue:0,restUntil:0,goals:0,phase:this.random()*Math.PI*2};
   this.chooseTarget(swimmer);swimmer.targetDue*=.4+this.random()*.4;
   swimmer.heading=Math.atan2(-(swimmer.target.z-position.z),swimmer.target.x-position.x);this.pose(swimmer);return swimmer;
  });
 }
 private chooseTarget(s:Swimmer):void{
  for(let tries=0;tries<12;tries++){
   s.target.set(s.limits.min.x+.2+this.random()*(s.limits.max.x-s.limits.min.x-.4),s.limits.min.y+.025+this.random()*(s.limits.max.y-s.limits.min.y-.05),s.limits.min.z+.2+this.random()*(s.limits.max.z-s.limits.min.z-.4));
   if(Math.hypot(s.target.x-s.position.x,s.target.z-s.position.z)>1.4)break;
  }
  s.targetDue=this.elapsed+8+this.random()*13;s.goals++;
  s.restUntil=this.random()<.18?this.elapsed+.7+this.random()*1.1:this.elapsed;
 }
 private pose(s:Swimmer):void{
  const horizontal=Math.cos(s.pitch);
  this.forward.set(Math.cos(s.heading)*horizontal,Math.sin(s.pitch),-Math.sin(s.heading)*horizontal);
  s.velocity.copy(this.forward).multiplyScalar(s.speed);
  s.orientation.setFromUnitVectors(this.nose,this.forward).multiply(this.roll.setFromAxisAngle(this.nose,s.bank));
 }
 update(time:number):void{
  if(!Number.isFinite(time))return;
  const delta=this.previous===null?0:clamp(time-this.previous,0,SWIMMING.maxFrameDelta);this.previous=time;this.accumulator+=delta;
  while(this.accumulator+1e-9>=SWIMMING.step){this.step(SWIMMING.step);this.accumulator=Math.max(0,this.accumulator-SWIMMING.step);}
 }
 private step(dt:number):void{
  this.elapsed+=dt;
  // Compute all velocities before advancing positions, avoiding dependence on fish iteration order.
  for(let i=0;i<this.swimmers.length;i++){
   const s=this.swimmers[i],p=s.position;
   let tx=s.target.x-p.x,tz=s.target.z-p.z,distance=Math.hypot(tx,tz);
   if(distance<.8||this.elapsed>=s.targetDue){this.chooseTarget(s);tx=s.target.x-p.x;tz=s.target.z-p.z;distance=Math.hypot(tx,tz);}
   let dx=tx/Math.max(distance,.001),dz=tz/Math.max(distance,.001),vertical=0;
   for(let j=0;j<this.swimmers.length;j++)if(i!==j){
    const other=this.swimmers[j].position,ox=p.x-other.x,oz=p.z-other.z,dy=p.y-other.y,d=Math.hypot(ox,oz,dy*1.5);
    if(d<SWIMMING.separation&&d>.001){const strength=(1-d/SWIMMING.separation)**2*2.5/d;dx+=ox*strength;dz+=oz*strength;vertical+=dy*strength*.12;}
   }
   const px=p.x+s.velocity.x*.9,pz=p.z+s.velocity.z*.9;
   const avoid=(d:number)=>(Math.max(0,1-d/SWIMMING.wallBuffer))**2*3.5;
   dx+=avoid(px-s.limits.min.x)-avoid(s.limits.max.x-px);
   dz+=avoid(pz-s.limits.min.z)-avoid(s.limits.max.z-pz);
   const desired=Math.hypot(dx,dz)>.001?Math.atan2(-dz,dx):s.heading,error=angle(desired-s.heading);
   const turn=clamp(error,-SWIMMING.maxTurn*dt,SWIMMING.maxTurn*dt);s.heading=angle(s.heading+turn);
   let pitch=clamp((s.target.y-p.y)*.6+vertical,-SWIMMING.maxPitch,SWIMMING.maxPitch);
   if(p.y-s.limits.min.y<.065)pitch=Math.max(.04,pitch);
   if(s.limits.max.y-p.y<.065)pitch=Math.min(-.04,pitch);
   s.pitch+=clamp(pitch-s.pitch,-.22*dt,.22*dt);
   const bank=clamp(-turn/dt*.17,-SWIMMING.maxBank,SWIMMING.maxBank);s.bank+=(bank-s.bank)*(1-Math.exp(-dt*4));
   const wallDistance=Math.min(p.x-s.limits.min.x,s.limits.max.x-p.x,p.z-s.limits.min.z,s.limits.max.z-p.z);
   const pace=(this.elapsed < s.restUntil ? .28 : 1)*(1+.1*Math.sin(this.elapsed*.65+s.phase));
   const targetSpeed=s.cruise*pace*(.35+.65*Math.max(0,Math.cos(error)))*(.5+.5*smooth(.3,1.4,distance))*(.3+.7*smooth(0,.45,wallDistance));
   s.speed+=(targetSpeed-s.speed)*(1-Math.exp(-dt*2));s.animationTime+=dt*(.4+.6*s.speed/s.cruise);this.pose(s);
  }
  for(const s of this.swimmers)s.position.addScaledVector(s.velocity,dt).clamp(s.limits.min,s.limits.max);
 }
}
