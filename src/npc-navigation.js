import {Vector3,Raycaster} from 'three';
import {GATHERING_LAYOUT as L} from './gathering-layout.js';

export const NPC_HEIGHT=1.35;
export const NPC_RADIUS=.4;
export const NPC_LANE_RADII=[L.centralRadius+L.tierDepth-.55,L.centralRadius+L.tierDepth*2-.55,L.terraceOuter-.55,L.walkRadius-.8];
const TAU=Math.PI*2,SEGMENTS=192;

// Only the existing rear walking lanes and cardinal access stairs participate.
// Every edge is checked against the final rendered floor and body collider.
export function createNpcNavigation({floor,collider}){
  const nodes=[],rings=[],ray=new Raycaster(),down=new Vector3(0,-1,0);ray.firstHitOnly=true;
  function floorAt(x,z){
    ray.set(new Vector3(x,L.pathY+1,z),down);ray.near=0;ray.far=L.pathY-L.floorY+2;
    const hit=ray.intersectObject(floor,false)[0];return hit&&hit.face.normal.y>.7?hit.point.y:null;
  }
  function clearSegment(a,b){
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(!length)return true;
    const side=new Vector3(-dz/length,0,dx/length),direction=new Vector3(dx/length,0,dz/length);
    const steps=Math.ceil(length/.18);let previous=a.y;
    for(let i=1;i<=steps;i++){
      const t=i/steps,x=a.x+dx*t,z=a.z+dz*t,y=floorAt(x,z);
      if(y===null||Math.hypot(x,z)<L.centralRadius+.8||Math.hypot(x,z)>L.walkRadius-NPC_RADIUS||Math.abs(y-previous)>.32)return false;
      const startT=(i-1)/steps;
      for(const offset of [-NPC_RADIUS,0,NPC_RADIUS])for(const h of [.4,.85,1.2]){
        ray.set(new Vector3(a.x+dx*startT+side.x*offset,Math.max(previous,y)+h,a.z+dz*startT+side.z*offset),direction);ray.near=.001;ray.far=length/steps+.06;
        if(ray.intersectObject(collider,false).length)return false;
      }
      // Keep the whole footprint on the same tread, except normal 30cm risers.
      for(const sign of [-1,1]){
        const support=floorAt(x+side.x*NPC_RADIUS*sign,z+side.z*NPC_RADIUS*sign);
        if(support===null||Math.abs(support-y)>.32)return false;
      }
      previous=y;
    }
    return true;
  }
  function node(x,z,ring){const y=floorAt(x,z);if(y===null)throw new Error('NPC 경로 바닥을 찾지 못했습니다.');const n={id:nodes.length,x,y,z,ring,edges:[]};nodes.push(n);return n;}
  function connect(a,b,both=false){if(!clearSegment(a,b))return false;const cost=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);a.edges.push({to:b.id,cost});if(both)b.edges.push({to:a.id,cost});return true;}
  for(const [index,radius]of NPC_LANE_RADII.entries()){
    const ring=Array.from({length:SEGMENTS},(_,i)=>node(Math.cos(i/SEGMENTS*TAU)*radius,Math.sin(i/SEGMENTS*TAU)*radius,index));rings.push(ring);
    // One circulation direction avoids two broad characters meeting head-on
    // in a narrow rear lane; destinations, pauses and tier changes still vary.
    ring.forEach((a,i)=>connect(a,ring[(i+1)%SEGMENTS]));
  }
  for(let r=0;r<rings.length-1;r++)for(let cardinal=0;cardinal<4;cardinal++){
    const a=rings[r][cardinal*SEGMENTS/4],b=rings[r+1][cardinal*SEGMENTS/4],count=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.24);let previous=a;
    for(let i=1;i<=count;i++){
      const n=i===count?b:node(a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count,-1);
      connect(previous,n,true);previous=n;
    }
  }
  function path(start,end,avoid=[]){
    const costs=new Float64Array(nodes.length).fill(Infinity),parent=new Int32Array(nodes.length).fill(-1),done=new Uint8Array(nodes.length);costs[start]=0;
    for(let step=0;step<nodes.length;step++){
      let current=-1,min=Infinity;for(let i=0;i<nodes.length;i++)if(!done[i]&&costs[i]<min){min=costs[i];current=i;}
      if(current<0)break;if(current===end)break;done[current]=1;
      for(const edge of nodes[current].edges){const n=nodes[edge.to],penalty=avoid.some(p=>Math.abs(n.y-p.y)<.55&&Math.hypot(n.x-p.x,n.z-p.z)<1.2)?5:0,weight=min+edge.cost+penalty;if(weight<costs[n.id]){costs[n.id]=weight;parent[n.id]=current;}}
    }
    if(!Number.isFinite(costs[end]))return [];
    const result=[];for(let i=end;i!==start;i=parent[i]){if(i<0)return [];result.push(nodes[i]);}return result.reverse();
  }
  return {nodes,rings,floorAt,clearSegment,path};
}

export function createNpcWalker(navigation,index,{random=Math.random}={}){
  const spawn=navigation.rings[index][[56,106,154,24][index]],position=new Vector3(spawn.x,spawn.y,spawn.z),v=new Vector3();
  let current=spawn,route=[],pause=index*.55,travelled=0,blocked=0,targetRing=index;
  const speed=.74+index*.055;
  function choose(others){
    // Staggered, bounded roaming rather than a repeated animation loop.
    targetRing=random()<.42?(current.ring>=0?(current.ring+1)%4:targetRing):Math.floor(random()*4);
    const ring=navigation.rings[targetRing],angle=Math.atan2(position.z,position.x),ahead=(angle+(.35+random()*.8)+Math.PI*2)%(Math.PI*2);
    const end=ring[Math.floor(ahead/(Math.PI*2)*ring.length)%ring.length];route=navigation.path(current.id,end.id,others);pause=1+random()*2.5;
  }
  return {
    position,get current(){return current;},get route(){return route;},get distance(){return travelled;},moving:false,yaw:Math.atan2(-spawn.z,spawn.x),
    update(delta,{player,others=[],active=true}={}){
      this.moving=false;if(!active)return;
      if(!route.length){pause-=delta;if(pause<=0)choose(others);return;}
      const next=route[0],dx=next.x-position.x,dz=next.z-position.z,length=Math.hypot(dx,dz),step=Math.min(speed*delta,length);
      const candidate=v.copy(position);if(length>.000001){candidate.x+=dx/length*step;candidate.z+=dz/length*step;}
      const obstructs=p=>Math.abs(position.y-p.y)<.65&&Math.hypot(candidate.x-p.x,candidate.z-p.z)<(p===player ? .9 : NPC_RADIUS*2+.12)&&Math.hypot(candidate.x-p.x,candidate.z-p.z)<Math.hypot(position.x-p.x,position.z-p.z)+.00001;
      if((player&&obstructs(player))||others.some(obstructs)){blocked+=delta;if(blocked>3){route=[];pause=.4;blocked=0;}return;}
      blocked=0;position.x=candidate.x;position.z=candidate.z;
      const surface=navigation.floorAt(position.x,position.z);position.y+=(surface-position.y)*(1-Math.exp(-18*delta));
      travelled+=step;this.moving=step>.00001;
      if(length>.000001){const target=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(target-this.yaw),Math.cos(target-this.yaw));this.yaw+=diff*(1-Math.exp(-10*delta));}
      if(length<.025){current=next;route.shift();if(!route.length)pause=1.8+random()*3;}
    },
  };
}
