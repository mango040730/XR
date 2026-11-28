import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Raycaster,Vector3,Mesh} from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {prepareGatheringSpace} from '../src/compact-space.js';
import {terraceSeatData} from '../src/terrace-seat-data.js';
import {createTerraceActivityState,nearestTerraceSeat,CRAFT_IDS,SEATED_EYE_HEIGHT} from '../src/terrace-activity-state.js';
import {createTerraceCrafts} from '../src/terrace-crafts.js';

const bytes=await readFile(new URL('../public/models/space.glb',import.meta.url));
const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const prepared=prepareGatheringSpace(model),seats=terraceSeatData(prepared.seating);
Mesh.prototype.raycast=acceleratedRaycast;

test('원형 계단 37석은 같은 층에서 다가갈 때만 선택하며 중앙 좌석과 섞이지 않는다',()=>{
  assert.equal(seats.length,37);assert.equal(new Set(seats.map(s=>s.id)).size,37);
  for(const seat of seats){
    const p=new Vector3(...seat.position).addScaledVector(new Vector3(...seat.facing),-1);p.y+=.025;
    assert.equal(nearestTerraceSeat(seats,p).id,seat.id);
    assert.equal(nearestTerraceSeat([seat],{...p,y:p.y+.8}),null);
    assert.equal(nearestTerraceSeat([seat],{x:p.x+100,y:p.y,z:p.z}),null);
  }
});
test('앉기 안내→앉는 전환→내용 안내 5초→세 공예품→한 가지 선택의 순서를 보장한다',()=>{
  for(const id of CRAFT_IDS){
    const state=createTerraceActivityState();state.approach(seats[0]);assert.equal(state.hintVisible,true);state.tick(0);
    assert.equal(state.choose(id),false);assert.equal(state.sit(seats[0]),true);assert.equal(state.hintVisible,false);
    assert.equal(state.phase,'seating');assert.equal(state.settle(),true);assert.equal(state.phase,'guide');
    assert.equal(state.choose(id),false);state.tick(1000);assert.equal(state.tick(5999),false);
    assert.equal(state.tick(6000),true);assert.equal(state.phase,'choices');assert.equal(state.choose(id),true);
    assert.equal(state.choice,id);assert.equal(state.phase,'selected');assert.equal(state.choose(CRAFT_IDS.find(v=>v!==id)),false);
    state.stand();assert.equal(state.seated,false);state.approach(seats[1]);assert.equal(state.hintVisible,false);
    state.sit(seats[0]);state.settle();assert.equal(state.phase,'selected');assert.equal(state.choice,id);
    state.stand();state.sit(seats[1]);state.settle();assert.equal(state.phase,'choices','앉은 뒤 내용 안내도 접속 중 한 번만');
  }
});
test('자리 이탈·중단·숨겨진 안내·정리 때 공예품이 조기에 표시되지 않는다',()=>{
  const state=createTerraceActivityState();state.approach(seats[0]);state.approach(null);assert.equal(state.hintVisible,false);
  state.approach(seats[1]);assert.equal(state.hintVisible,false);
  state.sit(seats[0]);state.settle();state.tick(1000);state.tick(2000,false);
  assert.equal(state.tick(20000),false);assert.equal(state.tick(23999),false);assert.equal(state.tick(24000),true);
  assert.equal(state.choose('fake'),false);state.stand();assert.equal(state.choose('blocks'),false);
  state.sit(seats[1]);state.stand();assert.equal(state.settle(),false);
  state.dispose();assert.equal(state.sit(seats[0]),false);assert.equal(state.choose('beads'),false);
});
test('모든 의자의 작업 위치는 실제 기존 상판 위이고 공예품 받침이 상판 밖으로 나가지 않는다',()=>{
  const desks=prepared.seating.root.getObjectByName('Terrace_gloss_desks');
  desks.geometry.boundsTree=new MeshBVH(desks.geometry,{indirect:true});
  const crafts=createTerraceCrafts(),ray=new Raycaster(new Vector3(),new Vector3(0,-1,0),0,.08);ray.firstHitOnly=true;
  for(const seat of seats){
    assert.ok(SEATED_EYE_HEIGHT>.46+.65&&SEATED_EYE_HEIGHT<1.4);
    crafts.place(seat);crafts.show();
    for(const g of crafts.groups){
      const bounds=new Box3().setFromObject(g,true);assert.ok(Math.abs(bounds.min.y-seat.work[1])<.0001,'모델 받침이 상판에 접지');
      g.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;
        for(let i=0;i<p.count;i+=3){
          const point=new Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);
          if(point.y>seat.work[1]+.0001)continue;
          ray.ray.origin.copy(point).add(new Vector3(0,.04,0));const hit=ray.intersectObject(desks)[0];
          assert.ok(hit&&Math.abs(hit.point.y-seat.work[1])<.001&&hit.face.normal.y>.9,`${seat.id} ${g.name} 실제 상판 안쪽`);
        }
      });
    }
  }
  crafts.dispose();
});
test('실제 세 공예품은 부드러운 클레이 입체이고 선택하면 두 모델은 숨겨진다',()=>{
  const crafts=createTerraceCrafts();crafts.place(seats[0]);crafts.show();
  assert.deepEqual(crafts.groups.map(g=>g.userData.craftId),CRAFT_IDS);
  let triangles=0;
  for(const g of crafts.groups){
    const bounds=new Box3().setFromObject(g,true),size=bounds.getSize(new Vector3());
    assert.ok(size.x>.1&&size.x<.23&&size.z>.1&&size.y>.03,'인식 가능한 소형 탁상 입체');
    const eye=new Vector3(...seats[0].position).add(new Vector3(0,SEATED_EYE_HEIGHT,0)),target=g.localToWorld(new Vector3(...g.userData.pickPoint));
    const ray=new Raycaster(eye,target.clone().sub(eye).normalize(),0,2);assert.ok(ray.intersectObject(g,true).length,`${g.name} 실제 메시를 포인터로 고를 수 있음: ${eye.toArray()} -> ${target.toArray()}`);
    g.traverse(m=>{if(!m.isMesh)return;triangles+=m.geometry.index.count/3;assert.ok(m.material.name.startsWith('Clay craft'));
      assert.equal(m.material.flatShading,false);assert.ok(m.material.roughness>.6);
      for(const x of m.geometry.attributes.position.array)assert.ok(Number.isFinite(x));
    });
  }
  assert.ok(triangles>10000&&triangles<100000);
  for(const id of CRAFT_IDS){crafts.show(id);assert.deepEqual(crafts.groups.filter(g=>g.visible).map(g=>g.userData.craftId),[id]);}
  crafts.hide();assert.equal(crafts.root.visible,false);crafts.dispose();
});
