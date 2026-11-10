import { BufferGeometry, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, RingGeometry, SphereGeometry, Vector3 } from 'three';
import { contactShadows } from './contactShadows';
import { Kit } from './geometry';
import { palette as c, seats } from './layout';
import type { FishingSeat } from './layout';
export function action(root: Group, id:string,label:string){
  root.traverse(n=>{if(n instanceof Mesh)Object.assign(n.userData,{interaction:'action',interactionId:id,interactionLabel:label,interactionDistance:3});});
}
export function chair(kit: Kit, seat:FishingSeat):Group{
  const g=new Group();g.name=`chair:${seat.id}`;g.position.fromArray(seat.position);g.rotation.y=seat.yaw;
  kit.box(g,[.58,.09,.57],[0,.45,0],c.plank);kit.box(g,[.51,.035,.47],[0,.51,-.025],c.olive);
  for(const x of [-.24,.24])for(const z of [-.23,.23])kit.box(g,[.075,.45,.075],[x,.225,z],c.wood);
  for(const x of [-.25,.25])kit.box(g,[.075,.57,.075],[x,.76,.23],c.wood);
  for(const x of [-.17,0,.17])kit.box(g,[.145,.39,.055],[x,.85,.25],c.plank);
  kit.box(g,[.6,.075,.08],[0,1.07,.25],c.wood);
  kit.box(g,[.52,.07,.06],[0,.2,.23],c.edge);
  kit.batch(g);
  action(g,`seat:${seat.id}`,`${seat.id}번 자리 · 앉기`);return g;
}
export interface FishingRig {root:Group; line:Line; float:Group; rings:Mesh[]; update(time:number,cast:boolean,biting?:boolean):void}
export function rod(root:Group,kit:Kit,seat:FishingSeat):FishingRig{
  const g=new Group();g.name=`rod:${seat.id}`;g.position.fromArray(seat.position);g.rotation.y=seat.yaw;root.add(g);
  kit.beam(g,[.2,.76,-.2],[.2,1.05,-.75],.026,c.charcoal,true);
  kit.beam(g,[.2,1.05,-.75],[.2,1.28,-1.35],.014,c.walnut,true);
  kit.beam(g,[.2,1.28,-1.35],[.17,1.2,-1.9],.008,c.honey,true);
  kit.box(g,[.07,.1,.07],[.2,.8,-.3],c.brass);
  action(g,`rod:${seat.id}`,`${seat.id} 낚싯대 · 투입 / 회수`);
  const float=new Group();float.position.fromArray(seat.cast);root.add(float);
  const b=new Mesh(new SphereGeometry(.042,6,4),kit.mat(c.ivory));b.scale.y=.75;float.add(b);
  const top=new Mesh(new SphereGeometry(.027,6,4),kit.mat(c.floatAccent));top.position.y=.045;top.scale.y=1.5;float.add(top);
  kit.beam(float,[0,.03,0],[0,.14,0],.007,c.floatAccent,true);
  const tip=new Vector3(.17,1.2,-1.9).applyAxisAngle(new Vector3(0,1,0),seat.yaw).add(new Vector3(...seat.position));
  const line=new Line(new BufferGeometry().setFromPoints([tip,new Vector3(...seat.cast)]),new LineBasicMaterial({color:c.line,transparent:true,opacity:.7}));line.renderOrder=3;root.add(line);
  const rings:Mesh[]=[];
  for(let i=0;i<2;i++){
    const ring=new Mesh(new RingGeometry(.16,.175,32),new MeshBasicMaterial({color:c.ripple,transparent:true,opacity:.25,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.fromArray(seat.cast);ring.position.y=.405;ring.renderOrder=2;root.add(ring);rings.push(ring);
  }
  for(const o of [g,float,line,...rings])o.traverse(n=>n.userData.dynamic=true);
  return {root:g,line,float,rings,update(time,cast,biting=false){
    g.visible=true;line.visible=float.visible=cast;rings.forEach(r=>r.visible=cast);
    const bob=Math.sin(time*1.35+seat.position[0])*.013;
    float.position.y=seat.cast[1]+bob-(biting?(Math.sin(time*14)*.025+.035):0);
    const attr=line.geometry.getAttribute('position');attr.setY(1,float.position.y+.015);attr.needsUpdate=true;
    rings.forEach((r,i)=>{const phase=(time*.3+i*.5)%1;r.scale.setScalar(.6+phase*1.2);(r.material as MeshBasicMaterial).opacity=(1-phase)*.14;});
    g.rotation.x=cast?Math.sin(time*.75)*.004:0;
  }};
}
export function equipment(root:Group,kit:Kit){
  contactShadows(root,[
    ...seats.map(s=>({x:s.position[0],z:s.position[2],width:.94,depth:.94})),
    ...[-5.5,5.5].map(x=>({x,z:-4.98,width:2.1,depth:1.0})),
  ]);
  for(const x of [-5.5,5.5]){
    const z=-4.98;
    for(const dx of [-.82,.82])kit.box(root,[.11,1.65,.11],[x+dx,.825,z],c.wood);
    for(const y of [.18,.78,1.36])kit.box(root,[1.8,.09,.6],[x,y,z],c.plank);
    for(const y of [.39,.98,1.54])for(const dx of [-.43,.43])toolbox(root,kit,[x+dx,y,z],y>1.4?c.ivory:c.deepTeal,.65);
  }
  for(const side of [-1,1]){
    const rack=new Group();rack.position.set(side*7.05,0,-2.6);rack.rotation.y=side*Math.PI/2;root.add(rack);
    kit.box(rack,[1.25,.12,.45],[0,.08,0],c.wood);kit.box(rack,[1.25,.1,.1],[0,.68,0],c.plank);
    for(let i=0;i<5;i++){const x=-.47+i*.235;kit.beam(rack,[x,.12,0],[x-.05,2.45,.15],.013,c.charcoal,true);kit.beam(rack,[x,.14,0],[x,.7,.04],.027,c.edge,true);}
    net(root,kit,[side*6.9,0,1.65]);net(root,kit,[side*6.9,0,2.3]);
  }
  for(const seat of seats){
    const tray=new Group();tray.position.fromArray(seat.position);tray.rotation.y=seat.yaw;root.add(tray);
    kit.box(tray,[.32,.06,.2],[.5,.58,-.57],c.deepTeal);
    for(let i=0;i<3;i++)kit.box(tray,[.07,.025,.11],[.4+i*.08,.625,-.57],i%2?c.honey:c.ivory);
    if(seat.npc)toolbox(tray,kit,[-.52,.18,.15],c.olive,.45);
  }
}
function toolbox(root:Group,kit:Kit,at:[number,number,number],color:string,w:number){
  kit.box(root,[w,.28,w*.55],at,color);kit.box(root,[w+.025,.035,w*.55+.025],[at[0],at[1]+.15,at[2]],color);
  kit.box(root,[.05,.075,.025],[at[0],at[1]+.055,at[2]+w*.28],c.brass);
  kit.box(root,[.2,.04,.04],[at[0],at[1]+.21,at[2]],c.edge);
}
function net(root:Group,kit:Kit,at:[number,number,number]){
  const g=new Group();g.position.fromArray(at);g.rotation.z=-.08;root.add(g);
  kit.beam(g,[0,.1,0],[0,1.5,0],.025,c.edge,true);
  const rim=new Mesh(new RingGeometry(.23,.255,12),kit.mat(c.charcoal));rim.position.y=1.72;g.add(rim);
  const points:Vector3[]=[];
  for(let i=-3;i<=3;i++){const a=i*.062,h=Math.sqrt(.23*.23-a*a);points.push(new Vector3(a,1.72-h,0),new Vector3(a,1.72+h,0));points.push(new Vector3(-h,1.72+a,0),new Vector3(h,1.72+a,0));}
  for(let i=0;i<points.length;i+=2)g.add(new Line(new BufferGeometry().setFromPoints(points.slice(i,i+2)),new LineBasicMaterial({color:c.charcoal})));
}
