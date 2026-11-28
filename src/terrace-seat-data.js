import {Vector3,Matrix4} from 'three';

export function terraceSeatData(seating){
  const slots=new Map();
  return seating.seats.map(source=>{
    const set=seating.sets.find(set=>set.id===source.setId),slot=(slots.get(source.setId)??0)+1;
    slots.set(source.setId,slot);
    const outward=new Vector3(...source.facing).negate(),along=new Vector3(outward.z,0,-outward.x);
    const work=outward.clone().multiplyScalar(set.inner+.35).setY(source.position[1]+.79);
    return {...source,id:`${source.setId}-seat-${slot}`,position:[...source.position],facing:[...source.facing],
      work:work.toArray(),workMatrix:new Matrix4().makeBasis(along,new Vector3(0,1,0),outward).setPosition(work)};
  });
}
