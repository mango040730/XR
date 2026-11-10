import { BufferGeometry, ConeGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh } from 'three';
import { palette as c } from './style';
import { Kit } from './geometry';
import type { FishingSeat } from './layout';

/** Six planar faces: broad shoulders and a narrower waist, without rounded capsule limbs. */
function shirtGeometry():BufferGeometry {
  const bottom=.16,top=.215,depth=.135,low=-.245,high=.245;
  const corners=[[-bottom,low,-depth],[bottom,low,-depth],[bottom,low,depth],[-bottom,low,depth],[-top,high,-depth],[top,high,-depth],[top,high,depth],[-top,high,depth]];
  const faces=[[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0],[4,7,6,5],[0,1,2,3]];
  const positions:number[]=[];
  for(const [a,b,c,d] of faces)for(const i of [a,b,c,a,c,d])positions.push(...corners[i]);
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(new Float32Array(positions.length/3*2),2));geometry.computeVertexNormals();return geometry;
}
export function avatar(root:Group,kit:Kit,seat:FishingSeat,index:number):Group {
  const g=new Group();g.name=`sample-npc:${seat.id}`;g.position.fromArray(seat.position);g.rotation.y=seat.yaw;root.add(g);
  const shirt=c.clothes[index%5];
  const pants=index===1?c.lightPants:c.pants,hairColor=index%2?c.hairLight:c.hair;
  const skin=kit.mat(c.skin),hair=kit.mat(hairColor);
  const torso=new Mesh(shirtGeometry(),kit.mat(shirt));torso.position.set(0,.82,.005);torso.rotation.x=.11;g.add(torso);
  kit.beam(g,[0,1.025,-.02],[0,1.12,-.035],.09,c.skin,true);
  // A cream undershirt and two lapels give the seated silhouettes recognisable clothing.
  kit.box(g,[.12,.25,.015],[0,.94,-.144],c.ivory);
  for(const side of [-1,1]) {
    const collar=kit.box(g,[.065,.17,.025],[side*.085,1.005,-.155],shirt);collar.rotation.z=side*.3;
    for(const y of [.78,.9])kit.box(g,[.012,.015,.012],[side*.055,y,-.153],c.ivory);
  }
  const head=new Mesh(new IcosahedronGeometry(.155,1),skin);head.position.set(0,1.205,-.05);head.scale.set(.87,1.12,.94);g.add(head);
  const cap=new Mesh(new IcosahedronGeometry(.165,0),hair);cap.position.set(0,1.302,-.035);cap.scale.set(.96,.69,1.02);cap.rotation.z=-.15;g.add(cap);
  for(const side of [-1,1]) {
    kit.box(g,[.037,.09,.085],[side*.122,1.25,-.015],hairColor);
    const fringe=new Mesh(new ConeGeometry(.057,.115,3),hair);fringe.position.set(side*.052,1.295,-.166);fringe.rotation.z=Math.PI+side*.4;g.add(fringe);
    const ear=new Mesh(new IcosahedronGeometry(.032,0),skin);ear.position.set(side*.139,1.196,-.025);ear.scale.set(.65,1,.75);g.add(ear);
  }
  if(index===1) {
    const ponytail=new Mesh(new IcosahedronGeometry(.075,0),hair);ponytail.position.set(.02,1.15,.113);ponytail.scale.set(.8,1.45,.8);g.add(ponytail);
  }
  for(const x of [-.145,.145]) {
    kit.beam(g,[x,.53,-.015],[x,.49,-.36],.16,pants);
    kit.beam(g,[x,.49,-.36],[x,.13,-.43],.13,pants);
    kit.box(g,[.16,.115,.27],[x,.073,-.49],c.walnut);
  }
  const arms=new Group();arms.name='fishing-arms';g.add(arms);
  for(const side of [-1,1]) {
    const elbow:[number,number,number]=[side*.235,.78,-.16];
    const hand:[number,number,number]=[side===1?.2:.1,.85,side===1?-.4:-.36];
    kit.beam(arms,[side*.195,.985,-.005],elbow,.12,shirt);
    kit.beam(arms,elbow,hand,.092,index===1?shirt:c.skin,true);
    const palm=new Mesh(new IcosahedronGeometry(.046,0),skin);palm.position.fromArray(hand);palm.scale.set(.8,.75,1.2);arms.add(palm);
  }
  kit.batch(arms);arms.traverse(n=>n.userData.dynamic=true);
  for(const x of [-.048,.048]) {
    kit.box(g,[.016,.022,.014],[x,1.213,-.187],c.charcoal);
    const brow=kit.box(g,[.035,.008,.012],[x,1.245,-.184],hairColor);brow.rotation.z=x>0?.08:-.08;
  }
  kit.box(g,[.028,.042,.036],[0,1.185,-.189],c.skinShade);
  if(index===4) {
    // Simple spectacles, like the angler at the left of the reference.
    for(const x of [-.051,.051])for(const y of [1.192,1.232])kit.box(g,[.076,.009,.014],[x,y,-.198],c.charcoal);
    for(const x of [-.086,-.014,.014,.086])kit.box(g,[.009,.04,.014],[x,1.212,-.198],c.charcoal);
    kit.box(g,[.035,.009,.014],[0,1.217,-.198],c.charcoal);
  }
  if(index===3) {
    const brim=new Mesh(new ConeGeometry(.26,.035,6),kit.mat(c.honey));brim.position.set(0,1.32,-.025);g.add(brim);
    const crown=new Mesh(new ConeGeometry(.145,.17,5),kit.mat(c.honey));crown.position.set(0,1.41,-.025);g.add(crown);
  }
  kit.batch(g);g.traverse(n=>n.userData.dynamic=true);return g;
}
