import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Color, Matrix4, Raycaster, Vector3 } from 'three';
import { prepareGatheringSpace } from '../src/compact-space.js';
import { GATHERING_LAYOUT as L, GATHERING_ZONES, GATHERING_ENTRY, gatheringFloorY } from '../src/gathering-layout.js';
import { collisionGeometry } from '../src/collision.js';
import { withinWalkBoundary } from '../src/entrance.js';
import { isWalkable } from '../src/prepare-space.js';
import { createTubeChairTemplate, TUBE_CUSHION_COLOR } from '../src/terrace-tube-chair.js';
import { createPillDeskParts, PILL_LEG_INSET } from '../src/terrace-pill-desk.js';
import { LOUNGE_TABLE_LENGTHS } from '../src/terrace-lounge-layout.js';
import { SMOKED_WOOD_COLOR, WOOD_PHOTO_PATH } from '../src/terrace-smoked-wood.js';
import { appearanceSnapshot } from './helpers/appearance-snapshot.mjs';
import { gatheringStepBoundary } from '../src/gathering-floor.js';

const bytes = await readFile(new URL('../public/models/space.glb', import.meta.url));
const model = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
const edited = prepareGatheringSpace(model);
const meshes = [], floors = [];
model.traverse(mesh => { if (mesh.isMesh) { meshes.push(mesh); if (isWalkable(mesh)) floors.push(mesh); } });

test('각 모임 구역에 실제 4~10개의 독립된 1인 좌석이 있고 좌석 간 여유를 확보했다', () => {
  assert.deepEqual(edited.furniture.groups.map(g => g.seats.length), [10, 8, 4, 6, 10, 6]);
  assert.equal(edited.furniture.capacity, 44);
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0), 0, 0.25);
  for (const group of edited.furniture.groups) {
    assert.ok(group.seats.length >= 4 && group.seats.length <= 10);
    let actual = 0; group.root.traverse(mesh => { if (mesh.isMesh && mesh.userData.seat) actual++; });
    assert.equal(actual, group.capacity, '좌석 수는 이름이나 메타데이터뿐 아니라 실제 모델과 일치해야 합니다.');
    for (const seat of group.seats) {
      const point = new Vector3(...seat.position).applyMatrix4(group.root.matrixWorld);
      ray.ray.origin.copy(point).add(new Vector3(0, 0.12, 0));
      const hit = ray.intersectObject(seat.mesh, false)[0];
      assert.ok(hit && Math.abs(hit.point.y - point.y) < 0.015 && hit.face.normal.y > 0.8, '실제 사람이 앉는 상면이 있어야 합니다.');
      if (seat.type !== 'forum') assert.equal(seat.position[1], 0.46, '인체 사용 높이를 유지해야 합니다.');
      assert.ok(seat.mesh.userData.seatWidth >= 0.5);
    }
    for (let i = 0; i < group.seats.length; i++) for (const b of group.seats.slice(i + 1)) {
      const a = group.seats[i].position;
      assert.ok(Math.hypot(a[0] - b.position[0], a[2] - b.position[2]) > 0.60, '서로 다른 사람의 좌석 칸이 겹치면 안 됩니다.');
    }
  }
  assert.equal(GATHERING_ZONES.length, 6);
});

test('대형 곡선 소파 중앙 좌석은 낮은 원형 테이블로 바뀌고 8석과 통로는 유지된다', () => {
  const group=edited.furniture.groups.find(g=>g.id==='grand-lounge');
  const coffee=group.root.getObjectByName('Clay_low_coffee_table');assert.ok(coffee);
  assert.equal(group.seats.length,8);
  assert.equal(group.root.getObjectByName('Clay_Clay_orange'),undefined);
  const bounds=new Box3().setFromObject(coffee),size=bounds.getSize(new Vector3()),centre=bounds.getCenter(new Vector3());
  assert.ok(Math.abs(size.x-1.56)<.001&&Math.abs(size.z-1.56)<.001);
  assert.ok(Math.abs(size.y-.42)<.001&&Math.abs(bounds.min.y-group.floorY)<.001);
  const expectedCentre=new Vector3(0,0,.1).applyMatrix4(group.root.matrixWorld);
  assert.ok(Math.abs(centre.x-expectedCentre.x)<.001&&Math.abs(centre.z-expectedCentre.z)<.001);
  const top=coffee.getObjectByName('Clay_coffee_table_top');
  assert.equal(top.material.color.getHexString(),'e99804');
  assert.equal(top.material.flatShading,false);
  const ray=new Raycaster(new Vector3(centre.x+.6,group.floorY+.8,centre.z),new Vector3(0,-1,0),0,1);
  const hit=ray.intersectObject(coffee,true)[0];
  assert.ok(hit&&Math.abs(hit.point.y-group.floorY-.42)<.001,'사용할 수 있는 평평한 실제 상판');
  ray.set(new Vector3(centre.x+.9,group.floorY+.18,centre.z),new Vector3(-1,0,0));ray.far=.3;
  assert.equal(ray.intersectObject(coffee,true).length,0,'두꺼운 원통 좌석 대신 상판 아래가 비어 있는 테이블');
});

test('낮은 노란 테이블의 8인 소파는 같은 자리에서 입구가 반대편을 향하도록 180도 회전한다',()=>{
  const group=edited.furniture.groups.find(g=>g.id==='grand-lounge');
  assert.deepEqual(group.root.position.toArray(),[-5.2,group.floorY,6]);assert.deepEqual(group.root.scale.toArray(),[1,1,1]);
  assert.equal(group.root.rotation.y,Math.PI);assert.equal(group.radius,2.35);assert.equal(group.seats.length,8);
  const opening=new Vector3(0,0,-1).transformDirection(group.root.matrixWorld);
  assert.ok(opening.z>1-1e-12&&Math.abs(opening.x)<1e-12,'기존 -Z 입구를 반대 +Z 방향으로 회전');
  const plant=new Vector3(...group.root.userData.planters[0].base).applyMatrix4(group.root.matrixWorld);
  assert.ok(Math.abs(plant.x+8.02)<1e-8&&Math.abs(plant.z-6.35)<1e-8,'옆 화분은 기존 자리에서 낮은 통로를 비워 둔다');
});

test('노란 테이블이 있는 6인 곡선 소파 입구는 중앙을 향하고 위치·크기는 유지한다', () => {
  const group=edited.furniture.groups.find(g=>g.id==='conversation-nook');
  assert.deepEqual(group.root.position.toArray(),[8,group.floorY,2.5]);
  assert.deepEqual(group.root.scale.toArray(),[1,1,1]);assert.equal(group.radius,1.85);assert.equal(group.seats.length,6);
  const opening=group.root.getWorldDirection(new Vector3());
  const inward=new Vector3(-group.x,0,-group.z).normalize();
  assert.ok(opening.dot(inward)>1-1e-12,'소파의 열린 로컬 +Z 방향이 중앙을 정확히 향해야 합니다.');
});

test('중앙 계단형 라운지는 넓어진 두 층에 5석씩 배치해 총 10석을 유지한다', () => {
  const group = edited.furniture.groups.find(g => g.kind === 'forum');
  const treads = group.root.children.filter(m => m.name === 'Clay_forum_tread');
  assert.equal(treads.length, 2);
  assert.deepEqual([0, 1].map(t => group.seats.filter(s => s.tier === t).length), [5, 5]);
  assert.deepEqual([...new Set(group.seats.map(s => s.position[1]))], [0.46, 0.76]);
  assert.equal(group.seats.length, 10);
  assert.equal(group.radius, 3.4);
  const bounds = new Box3().setFromObject(group.root), size = bounds.getSize(new Vector3());
  assert.ok(size.x > 6.7 && size.x < 6.81, '지름을 기존 약 6m에서 약 6.8m로 넓힙니다.');
  const ray = new Raycaster();
  for (const seat of group.seats) {
    assert.equal(seat.mesh.userData.seatWidth, 0.84);
    const [x, y, z] = seat.position, r = Math.hypot(x, z);
    const origin = new Vector3(x / r * (r + 0.32), y + 0.1, z / r * (r + 0.32)).applyMatrix4(group.root.matrixWorld);
    ray.set(origin, new Vector3(0, -1, 0)); ray.far = 0.25;
    const hit = ray.intersectObjects(treads)[0];
    assert.ok(hit && Math.abs(hit.point.y - group.floorY - y + 0.13) < 0.001, '쿠션 뒤까지 넓은 실제 단이 이어집니다.');
  }
  const pot = group.root.userData.planters[0];
  assert.ok(-pot.base[2] - pot.depth / 2 - group.radius >= 0.119, '넓어진 등받이 뒤에 화분이 겹치지 않아야 합니다.');
});

test('중앙의 좌석·등받이·화분·돌·잎이 부드러운 실제 곡면과 클레이 재질로 구성된다', () => {
  let vertices = 0, leafMeshes = 0, coralSeats = 0;
  for (const group of edited.furniture.groups) group.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    assert.ok(mesh.userData.clay);
    assert.equal(mesh.material.flatShading, false);
    assert.ok(mesh.material.roughness >= 0.6, '클레이 표면을 과한 유광으로 만들면 안 됩니다.');
    const normal = mesh.geometry.attributes.normal;
    for (let i = 0; i < normal.count; i += 31) {
      const n = new Vector3().fromBufferAttribute(normal, i);
      assert.ok(Number.isFinite(n.lengthSq()) && Math.abs(n.length() - 1) < 0.0001);
    }
    vertices += mesh.geometry.attributes.position.count;
    if (/leaves/.test(mesh.material.name)) { leafMeshes++; assert.ok(mesh.geometry.attributes.color); }
    if (mesh.userData.seat && /coral/.test(mesh.material.name)) coralSeats++;
  });
  assert.ok(vertices > 300000);
  assert.equal(leafMeshes, 6);
  assert.equal(coralSeats, 28);
  assert.ok(!meshes.some(m => /^Lounge_Pods__|^Planting__/.test(m.name)), '성긴 원본 폴리곤 가구·식물을 남기면 안 됩니다.');
});

test('중앙 여섯 모듈은 단차 아래 3개·위 3개로 나뉘며 코랄 쿠션 계단형 가구는 아래에 있다', () => {
  const lower=edited.furniture.groups.filter(g=>Math.abs(g.floorY-L.floorY)<.001).map(g=>g.id);
  const upper=edited.furniture.groups.filter(g=>Math.abs(g.floorY-L.floorY-.28)<.001).map(g=>g.id);
  assert.deepEqual(lower,['tiered-forum','grand-lounge','reading-nook']);
  assert.deepEqual(upper,['round-meeting','s-curve-meeting','conversation-nook']);
  const ray=new Raycaster(new Vector3(),new Vector3(0,-1,0),0,3);
  for(const group of edited.furniture.groups){
    ray.ray.origin.set(group.x,L.pathY,group.z);
    const hit=ray.intersectObjects(floors,false)[0];
    assert.ok(hit&&Math.abs(hit.point.y-group.floorY)<.001,`${group.id} 실제 바닥과 가구 바닥 일치`);
  }
  for(const z of [-9,-4,-2,0,3,6,8])for(const offset of [-.15,.15]){
    const x=gatheringStepBoundary(z)+offset;
    if(Math.hypot(x,z)>L.centralRadius-.1)continue;
    ray.ray.origin.set(x,L.pathY,z);
    const hit=ray.intersectObjects(floors,false)[0];
    assert.ok(hit&&Math.abs(hit.point.y-gatheringFloorY(x,z))<.001,'단차 양쪽의 렌더링/높이 판정 일치');
  }
});

test('큰 곡선 소파와 실제 단차 윤곽 사이에는 최소 1.5m 낮은 통로가 있다',()=>{
  const p=edited.platform.geometry.attributes.position,curve=new Map();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    if(Math.abs(x-gatheringStepBoundary(z))<.003)curve.set(z,[x,z]);
  }
  const points=[...curve.values()].sort((a,b)=>a[1]-b[1]);assert.ok(points.length>400);
  const group=edited.furniture.groups.find(g=>g.id==='grand-lounge'),world=new Vector3();let clearanceSq=Infinity;
  group.root.traverse(mesh=>{
    if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      world.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
      if(world.x<-3.7||world.y>group.floorY+1.65)continue;
      for(let j=1;j<points.length;j++){
        const [ax,az]=points[j-1],[bx,bz]=points[j];
        if(world.z<az-Math.sqrt(clearanceSq)||world.z>bz+Math.sqrt(clearanceSq))continue;
        const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((world.x-ax)*dx+(world.z-az)*dz)/(dx*dx+dz*dz)));
        clearanceSq=Math.min(clearanceSq,(world.x-ax-t*dx)**2+(world.z-az-t*dz)**2);
      }
    }
  });
  assert.ok(Math.sqrt(clearanceSq)>=1.5,`소파와 단차 실제 여유: ${Math.sqrt(clearanceSq)}m`);
});

test('중앙 가구가 전후 바닥 단차에 접지하고 서로 또는 원형 계단과 관통하지 않는다', () => {
  const groups = [...edited.furniture.groups, { root: edited.furniture.frontPlanter, floorY: gatheringFloorY(3, 9.4) }];
  const world = new Vector3();
  for (const group of groups) {
    let contacts = 0;
    group.root.traverse(mesh => {
      if (!mesh.isMesh) return;
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        world.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
        assert.ok(Math.hypot(world.x, world.z) < L.centralRadius - 1.0, '외곽 계단 앞의 순환 공간을 비워야 합니다.');
        if (Math.abs(world.y - group.floorY) >= 0.001) continue;
        assert.ok(Math.abs(gatheringFloorY(world.x, world.z) - world.y) < 0.001, '화분과 가구가 서로 다른 바닥 높이를 가로지르면 안 됩니다.');
        contacts++;
      }
    });
    assert.ok(contacts > 50);
  }
  for (let i = 0; i < groups.length; i++) for (const b of groups.slice(i + 1)) {
    if (!new Box3().setFromObject(groups[i].root).intersectsBox(new Box3().setFromObject(b.root))) continue;
    // Enlarged curved enclosures can have intersecting rectangular bounds
    // without touching. Compare their actual rendered triangles instead.
    const parts = group => {const result=[];group.root.traverse(m=>{if(m.isMesh)result.push(m);});return result;};
    const aBody=collisionGeometry(parts(groups[i])),bBody=collisionGeometry(parts(b));
    assert.equal(aBody.geometry.boundsTree.intersectsGeometry(bBody.geometry,new Matrix4()),false,`${groups[i].root.name}/${b.root.name} 실제 메시 간섭`);
    for(const body of [aBody,bBody]){body.geometry.dispose();body.material.dispose();}
  }
});

test('원형 공간과 계단·블루길을 함께 축소하되 실제 보행 가능한 9개 단과 두 좌석 층을 유지한다', () => {
  assert.equal(L.centralRadius * 2, 25);
  assert.equal(L.outerRadius * 2, 51);
  assert.equal(L.pathWidth, 4.6);
  assert.equal(edited.stairs.userData.stepCount, 9);
  assert.ok(edited.seating.sets.length < 60 && edited.seating.sets.length > 15);
  assert.equal(edited.seating.seats.length, 37);
  assert.deepEqual([...new Set(edited.seating.sets.map(s => s.tier))], [0, 1]);
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  for (let i = 0; i < L.stepCount; i++) {
    const radius = L.centralRadius + (i + 0.5) * (L.terraceOuter - L.centralRadius) / L.stepCount;
    ray.ray.origin.set(0, L.pathY + 1, radius);
    const hit = ray.intersectObjects(floors, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - (L.floorY + (i + 1) * 0.3)) < 0.001);
  }
  assert.ok(Math.abs(edited.digitalWall.height - 4.8) < 0.001);
});

test('실제 병합 충돌 장면에서 새 입구·계단·중앙 통로를 연속해 이동할 수 있다', () => {
  const body = collisionGeometry(meshes), floor = collisionGeometry(floors);
  const ray = new Raycaster();
  try {
    const path = [[0, GATHERING_ENTRY.position[2]], [0, 11], [-0.4, 8.6], [-0.8, 5.6], [-1.8, 4.5], [-2.4, 1.2], [-0.5, -3.5], [0, -5]];
    let previousY = L.pathY;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], length = Math.hypot(bx - ax, bz - az);
      const direction = new Vector3(bx - ax, 0, bz - az).normalize(), side = new Vector3(direction.z, 0, -direction.x);
      for (let d = 0; d <= length; d += 0.06) {
        const x = ax + direction.x * d, z = az + direction.z * d;
        assert.ok(withinWalkBoundary(x, z, L.walkRadius, GATHERING_ENTRY));
        ray.set(new Vector3(x, previousY + 0.36, z), new Vector3(0, -1, 0)); ray.far = 0.96;
        const hit = ray.intersectObject(floor)[0];
        assert.ok(hit && hit.point.y - previousY < 0.34 && previousY - hit.point.y < 0.6, `연속 보행 바닥이 필요합니다: ${x},${z}`);
        previousY = hit.point.y;
        for (const h of [0.4, 0.95, 1.5]) for (const offset of [-0.22, 0, 0.22]) {
          const start = new Vector3(x, previousY + h + 0.025, z).addScaledVector(side, offset);
          ray.set(start, direction); ray.far = 0.27;
          assert.equal(ray.intersectObject(body).length, 0, `몸통 통로가 필요합니다: ${x},${z}, 높이 ${h}`);
        }
      }
    }
    assert.equal(body.geometry.index.count / 3, meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0));
    const lanePoint=z=>{
      const x=gatheringStepBoundary(z),slope=(gatheringStepBoundary(z+.001)-gatheringStepBoundary(z-.001))/.002,n=Math.hypot(1,slope);
      return new Vector3(x-.72/n,0,z+.72*slope/n);
    };
    for(let z=3;z<=6;z+=.04){
      const centre=lanePoint(z),direction=lanePoint(z+.01).sub(centre).normalize(),side=new Vector3(-direction.z,0,direction.x);
      for(const offset of [-.6,0,.6]){
        const point=centre.clone().addScaledVector(side,offset);
        ray.set(point.clone().setY(L.floorY+.5),new Vector3(0,-1,0));ray.far=.6;
        const hit=ray.intersectObject(floor)[0];assert.ok(hit&&Math.abs(hit.point.y-L.floorY)<.001,'소파 옆 1.2m 폭 통로 전체가 낮은 바닥');
        for(const h of [.4,.95,1.5]){
          ray.set(point.clone().setY(L.floorY+h+.025),direction);ray.far=.27;
          assert.equal(ray.intersectObject(body).length,0,'단차 아래 통로에 몸통·어깨·머리 충돌 없음');
        }
      }
    }
    for(const sign of [1,-1]){
      let previous=gatheringFloorY(sign===1?-1.3:.1,-10);
      for(let i=0;i<=35;i++){
        const x=(sign===1?-1.3:.1)+sign*i*.04;
        ray.set(new Vector3(x,previous+.36,-10),new Vector3(0,-1,0));ray.far=.96;
        const hit=ray.intersectObject(floor)[0];assert.ok(hit&&hit.point.y-previous<=.34&&previous-hit.point.y<=.6,'새 단차를 양방향 보행');
        for(const h of [.4,.95,1.5])for(const side of [-.22,0,.22]){
          ray.set(new Vector3(x,Math.max(previous,hit.point.y)+h+.025,-10+side),new Vector3(sign,0,0));ray.far=.27;
          assert.equal(ray.intersectObject(body).length,0,'새 단차에서 몸통 충돌 없이 양방향 통과');
        }
        previous=hit.point.y;
      }
    }
    for (const seat of edited.seating.seats) {
      const outward = new Vector3(seat.position[0], 0, seat.position[2]).normalize();
      const along = new Vector3(outward.z, 0, -outward.x);
      const point = new Vector3(...seat.position).addScaledVector(outward, 0.8);
      ray.set(point.clone().add(new Vector3(0, 0.1, 0)), new Vector3(0, -1, 0)); ray.far = 0.15;
      const hit = ray.intersectObject(floor)[0];
      assert.ok(hit && Math.abs(hit.point.y - seat.position[1]) < 0.001, '의자 뒤쪽 이동 공간은 해당 평평한 단 위여야 합니다.');
      for (const h of [0.4, 0.95, 1.5]) for (const sign of [-1, 1]) {
        ray.set(point.clone().add(new Vector3(0, h, 0)), along.clone().multiplyScalar(sign)); ray.far = 0.5;
        assert.equal(ray.intersectObject(body).length, 0, '의자 뒤로 물러나고 옆으로 이동할 공간이 필요합니다.');
      }
    }
    for (const a of edited.seating.sets) {
      const b = edited.seating.sets.find(s => s.cluster === a.cluster && s.start > a.end);
      if (!b) continue;
      const angle = (a.end + b.start) / 2, tier = edited.tiers[a.tier];
      const inward = new Vector3(-Math.cos(angle), 0, -Math.sin(angle)), side = new Vector3(-inward.z, 0, inward.x);
      for (let r = tier.inner + 2.1; r >= tier.inner + 1.0; r -= 0.1) for (const offset of [-0.22, 0, 0.22]) {
        for (const h of [0.4, 0.95, 1.5]) {
          const point = new Vector3(Math.cos(angle) * r, tier.height + h, Math.sin(angle) * r).addScaledVector(side, offset);
          ray.set(point, inward); ray.far = 0.15;
          assert.equal(ray.intersectObject(body).length, 0, '모인 소형 테이블 사이로 접근할 수 있어야 합니다.');
        }
      }
    }
    for (const group of edited.furniture.groups.filter(g=>g.kind==='meeting')) {
      const {chairRadius,aisleRadius}=group.root.userData.meetingAccess;
      const chairOuter=Math.hypot(chairRadius+0.26,0.25);
      assert.ok(group.radius-0.1-chairOuter>=1.0,`${group.id} 의자 뒤 1m 이상`);
      const check=(x,z,dx,dz,width,far)=>{
        const direction=new Vector3(dx,0,dz).normalize(),side=new Vector3(direction.z,0,-direction.x);
        for(const offset of [-width/2,0,width/2])for(const h of [.4,.95,1.5]) {
          const origin=new Vector3(group.x+x,gatheringFloorY(group.x+x,group.z+z)+.025+h,group.z+z).addScaledVector(side,offset);
          ray.set(origin,direction);ray.far=far;
          assert.equal(ray.intersectObject(body).length,0,`${group.id} 실제 통로: ${x},${z}, 폭 ${width}`);
        }
      };
      // A wide front mouth connects directly to the uninterrupted rear aisle.
      for(let z=group.radius+.8;z>=aisleRadius;z-=.05)check(0,z,0,-1,1.2,.27);
      for(let i=0;i<360;i++) {
        const angle=i*Math.PI/180;
        check(Math.sin(angle)*aisleRadius,Math.cos(angle)*aisleRadius,Math.cos(angle),-Math.sin(angle),1.0,.15);
      }
    }
    const conversation=edited.furniture.groups.find(g=>g.id==='conversation-nook');
    const inward=new Vector3(0,0,-1).transformDirection(conversation.root.matrixWorld);
    for(let z=conversation.radius+.7;z>=1.05;z-=.05)for(const offset of [-.5,0,.5])for(const h of [.4,.95,1.5]) {
      const point=new Vector3(offset,h+.025,z).applyMatrix4(conversation.root.matrixWorld);
      ray.set(point,inward);ray.far=.27;
      assert.equal(ray.intersectObject(body).length,0,'중앙에서 회전한 소파 입구까지 1m 폭 통로');
    }
  } finally { for (const mesh of [body, floor]) { mesh.geometry.dispose(); mesh.material.dispose(); } }
});

test('중앙 모델의 곡면을 높여도 전체 삼각형 예산을 넘지 않는다', () => {
  const count = meshes.reduce((n, m) => n + (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3, 0);
  assert.ok(count > 1500000 && count < 4600000);
  assert.ok(meshes.length < 200, '돌과 잎을 개별 드로 호출로 남기지 않아야 합니다.');
});

test('탁상·중앙·블루길의 모든 화분에 참고 이미지의 혼합 화단을 적용했다', () => {
  const roots = [...edited.furniture.groups.map(g => g.root), edited.furniture.frontPlanter, ...edited.outerPlants];
  const plants = roots.flatMap(root => root.userData.flowerBeds ?? []);
  assert.equal(plants.length, 13);
  assert.equal(plants.reduce((sum, p) => sum + p.flowers.length, 0), 125);
  for (const root of roots) {
    const finishes = new Set(); root.traverse(m => { if (m.isMesh) finishes.add(m.material.name); });
    assert.ok(finishes.has('Clay pastel garden flowers') && finishes.has('Clay garden yellow centres'));
  }
});

test('중앙 화분을 관통하던 긴 흰 곡선 블록은 제거하고 화분과 식재는 유지한다', () => {
  const root = edited.furniture.groups.find(g => g.id === 's-curve-meeting').root;
  const shell = root.children.find(m => m.isMesh && m.material.name === 'Clay warm ivory');
  const pot = root.userData.planters.find(p => p.base[0] === 2.3 && p.base[2] === 3.5);
  assert.ok(pot); assert.equal(pot.width, 1.5); assert.equal(pot.depth, 0.56);
  const bed = root.userData.flowerBeds.find(b => b.base[0] === pot.base[0] && b.base[2] === pot.base[2]);
  assert.equal(bed.flowers.length, 11); assert.equal(bed.blades.length, 8);
  const ray = new Raycaster();
  ray.set(new Vector3(pot.base[0], 0.8, pot.base[2]).applyMatrix4(root.matrixWorld), new Vector3(0, -1, 0)); ray.far = 1;
  const centre = ray.intersectObject(shell)[0];
  assert.ok(centre && centre.point.y < root.position.y + 0.1, '흙 위로 흰 블록이 지나가면 안 됩니다.');
  for (const angle of [2.35, 4.15]) {
    const point = new Vector3(-0.65 + Math.sin(angle) * 1.19, 0.8, 4.05 + Math.cos(angle) * 1.19).applyMatrix4(root.matrixWorld);
    ray.set(point, new Vector3(0, -1, 0));
    assert.equal(ray.intersectObject(shell).length, 0, '화분 양쪽으로 튀어나온 블록 끝도 제거해야 합니다.');
  }
});

test('계단 의자 37개 모두 파이프 디자인이며 파스텔 블루 천 쿠션과 테이블과 같은 무광 목재 프레임을 사용한다', () => {
  const tubeSeats = edited.seating.seats.filter(s => s.chairDesign === 'tube');
  assert.equal(tubeSeats.length, 37); assert.equal(edited.seating.seats.length, 37);
  assert.equal(edited.seating.sets.length, 20);
  assert.equal(edited.seating.root.getObjectByName('Terrace_round_chairs'), undefined, '기존 둥근 의자는 실행 장면에 남기지 않습니다.');
  for (const tier of [0, 1]) assert.deepEqual(new Set(edited.seating.seats.filter(s => s.tier === tier).map(s => s.chairDesign)), new Set(['tube']));
  const frame = edited.seating.root.getObjectByName('Terrace_tube_frames');
  const cushion = edited.seating.root.getObjectByName('Terrace_tube_cushions');
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  assert.equal(frame.material.color.getHexString(), desk.material.color.getHexString());
  assert.equal(frame.material.roughness, desk.material.roughness); assert.equal(frame.material.clearcoat, 0);
  assert.equal(frame.material.userData.woodPhoto, desk.material.userData.woodPhoto);
  assert.equal(cushion.material.color.getHexString(), TUBE_CUSHION_COLOR.slice(1).toLowerCase());
  assert.equal(cushion.material.color.getHexString(), 'a5bcd5');
  const previous = new Color('#D5A5AB').getHSL({}), current = cushion.material.color.getHSL({});
  assert.ok(current.h > 0.5 && current.h < 0.7, '블루 계열이어야 합니다.');
  assert.ok(Math.abs(previous.s - current.s) < 0.0001 && Math.abs(previous.l - current.l) < 0.0001, '이전 쿠션과 동일한 채도·명도의 파스텔 톤을 유지합니다.');
  assert.equal(cushion.material.sheenColor.getHexString(), 'a5bcd5');
  assert.ok(cushion.material.roughness > 0.85 && cushion.material.sheen > 0.2 && cushion.material.bumpMap);
  assert.equal(cushion.material.clearcoat, 0); assert.equal(cushion.material.metalness, 0);
  assert.ok(cushion.geometry.attributes.uv);
  const template = createTubeChairTemplate(), local = new Box3();
  for (const part of template) { part.geometry.computeBoundingBox(); local.union(part.geometry.boundingBox); }
  assert.ok(Math.abs(local.min.y) < 0.00001 && Math.abs(local.max.y - 0.8) < 0.001);
  assert.ok(local.getSize(new Vector3()).x < 0.57);
  for (const mesh of [frame, cushion]) {
    const count = template.filter(p => p.material.name === mesh.material.name).reduce((n, p) => n + p.geometry.index.count, 0);
    assert.equal(mesh.geometry.index.count, count * tubeSeats.length, '프레임과 쿠션의 실제 모델 수가 배치 좌석 수와 일치해야 합니다.');
  }
  const ray = new Raycaster();
  for (const seat of tubeSeats) {
    const [x, y, z] = seat.position, direction = new Vector3(x, 0, z).normalize();
    ray.set(new Vector3(x, y + 0.6, z), new Vector3(0, -1, 0)); ray.far = 0.3;
    const hit = ray.intersectObject(cushion)[0];
    assert.ok(hit && Math.abs(hit.point.y - y - 0.46) < 0.012 && hit.face.normal.y > 0.9);
    ray.set(new Vector3(x, y + 0.78, z), direction); ray.far = 0.35;
    assert.ok(ray.intersectObject(frame).length, '곡선 등받이는 바깥쪽에 있어야 합니다.');
    ray.set(new Vector3(x, y + 0.65, z), direction.clone().negate()); ray.far = 0.4;
    assert.equal(ray.intersectObject(frame).length, 0, '앞쪽은 열려 있어야 합니다.');
    assert.ok(edited.tiers[seat.tier].outer - Math.hypot(x, z) - local.max.z > 1.2);
  }
  const materials = new Set(template.map(p => p.material)); template.forEach(p => p.geometry.dispose());
  for (const material of materials) { material.bumpMap?.dispose(); material.dispose(); }
});

test('1·2인 중심의 작은 모임·독립석·넓은 여백을 두 층에 서로 다르게 구성했다', () => {
  const sets = edited.seating.sets;
  assert.deepEqual([1, 2, 3, 4].map(n => sets.filter(s => s.capacity === n).length), [9, 7, 2, 2]);
  assert.deepEqual([0, 1].map(t => sets.filter(s => s.tier === t).length), [11, 9]);
  assert.equal(sets.reduce((n, s) => n + s.capacity, 0), 37);
  for (const set of sets) {
    assert.equal(set.layout, 'lounge');
    assert.ok(Math.abs(set.width - LOUNGE_TABLE_LENGTHS[set.capacity - 1]) < 0.00001);
    assert.ok(Math.abs(set.seatSpan - (0.45 + set.capacity * 0.70)) < 0.00001, '상판을 늘려도 의자 줄 간격은 함께 벌리지 않습니다.');
    assert.equal(edited.seating.seats.filter(s => s.setId === set.id).length, set.capacity);
    assert.ok(set.width / set.capacity > 0.8, '좌석 수에 맞는 실사용 상판 폭이 필요합니다.');
  }
  const longestGaps = [];
  for (const tierIndex of [0, 1]) {
    const tier = edited.tiers[tierIndex], radius = tier.inner + 0.49;
    const tables = sets.filter(s => s.tier === tierIndex).sort((a, b) => a.start - b.start);
    const gaps = [];
    for (const [a, b] of edited.seating.clearIntervals[tierIndex]) {
      let cursor = a;
      for (const table of tables.filter(s => s.start >= a && s.end <= b)) {
        gaps.push((table.start - cursor) * radius); cursor = table.end;
      }
      gaps.push((b - cursor) * radius);
    }
    assert.ok(gaps.filter(g => g > 5.5).length >= 2, '가구 없는 연속 구간이 층마다 여러 곳에 있어야 합니다.');
    assert.ok(Math.max(...gaps) > 7.5);
    longestGaps.push(Math.max(...gaps));
    const available = edited.seating.clearIntervals[tierIndex].reduce((n, [a, b]) => n + (b - a) * radius, 0);
    assert.ok(tables.reduce((n, t) => n + t.width, 0) / available < 0.35);
    for (const table of tables) {
      assert.ok(edited.seating.clearIntervals[tierIndex].some(([a, b]) => table.start >= a && table.end <= b), '좁은 이동 계단 구간을 침범하면 안 됩니다.');
    }
    for (let i = 1; i < tables.length; i++) {
      const a = tables[i - 1], b = tables[i], gap = (b.start - a.end) * radius;
      assert.ok(gap >= 0.9, '모든 인접 테이블 사이에 실제 통행 간격이 필요합니다.');
      if (a.cluster === b.cluster) {
        assert.ok(gap <= 1.15 && a.capacity <= 2 && b.capacity <= 2, '가까운 포켓은 소형 테이블로 구성합니다.');
      }
    }
    for (const table of tables.filter(s => s.mode === 'isolated')) {
      const others = tables.filter(s => s !== table);
      assert.ok(others.every(o => Math.min(...[-Math.PI * 2, 0, Math.PI * 2].map(w => Math.max(o.start + w - table.end, table.start - o.end - w))) * radius >= 3));
    }
  }
  assert.ok(longestGaps[1] > 12);
  let union = 0, intersection = 0;
  for (let i = 0; i < 3600; i++) {
    const angle = i / 3600 * Math.PI * 2;
    const occupied = [0, 1].map(t => sets.some(s => s.tier === t && angle >= s.start && angle <= s.end));
    if (occupied.some(Boolean)) union++;
    if (occupied.every(Boolean)) intersection++;
  }
  assert.ok(intersection / union < 0.20, '위아래 테이블과 빈 구간을 같은 각도에 반복 정렬하지 않습니다.');
});

test('계단 책상 20개의 캡슐 상판·두 판형 다리·높이·무릎 공간을 유지하며 무광 우드만 적용한다', () => {
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  assert.ok(desk && !edited.seating.root.getObjectByName('Terrace_wood_desks'));
  assert.equal(desk.material.color.getHexString(), SMOKED_WOOD_COLOR.slice(1).toLowerCase());
  assert.ok(desk.material.roughness >= 0.85 && desk.material.userData.smokedWood);
  assert.equal(desk.material.clearcoat, 0); assert.equal(desk.material.displacementMap, null);
  assert.equal(desk.material.map, null); assert.equal(desk.material.bumpMap, null);
  const ray = new Raycaster(), down = new Vector3(0, -1, 0);
  let indices = 0;
  for (const set of edited.seating.sets) {
    assert.equal(set.deskStyle, 'pill');
    const inner = edited.tiers[set.tier].inner, angle = (set.start + set.end) / 2, floorY = set.center[1];
    const radius = inner + 0.49, direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
    const parts = createPillDeskParts({ inner, start: set.start, end: set.end, floorY });
    assert.equal(parts.length, 3);
    for (const part of parts) { indices += part.index?.count ?? part.attributes.position.count; part.computeBoundingBox(); }
    for (const part of parts) {
      const p = part.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i));
        assert.ok(r > inner + 0.10 && r < edited.tiers[set.tier].outer - 0.10, '상판과 받침은 평평한 단 안에 있어야 합니다.');
      }
    }
    for (const leg of parts.slice(1)) {
      assert.ok(Math.abs(leg.boundingBox.min.y - floorY) < 0.00001, '두 다리 모두 바닥에 접지해야 합니다.');
      const p = leg.attributes.position;
      const index = Array.from({length:p.count},(_,i)=>i).find(i=>Math.abs(p.getY(i)-floorY)<0.00001);
      ray.set(new Vector3(p.getX(index),floorY+0.05,p.getZ(index)),down);ray.far=0.1;
      const hit=ray.intersectObjects(floors)[0];
      assert.ok(hit && Math.abs(hit.point.y-floorY)<0.00001, '다리가 실제 계단 디딤면에 놓여야 합니다.');
    }
    ray.set(direction.clone().multiplyScalar(radius).setY(floorY + 1.2), down); ray.far = 0.5;
    const top = ray.intersectObject(desk)[0];
    assert.ok(top && Math.abs(top.point.y - floorY - 0.79) < 0.001, '실제 책상 상면은 기존 높이를 유지해야 합니다.');
    for (const fraction of [-0.32, 0, 0.32]) for (const offset of [-0.20, 0.20]) {
      const a = angle + fraction * set.width / radius;
      ray.set(new Vector3(Math.cos(a) * (radius + offset), floorY + 1.1, Math.sin(a) * (radius + offset)), down); ray.far = 0.4;
      const hit = ray.intersectObject(desk)[0];
      assert.ok(hit && Math.abs(hit.point.y - floorY - 0.79) < 0.001 && hit.face.normal.y > 0.99,
        '긴 곡선 상판도 전체 폭에서 윗면이 채워지고 노멀이 위를 향해야 합니다.');
    }
    ray.set(direction.clone().multiplyScalar(inner + 0.05).setY(floorY + 0.52), direction); ray.far = 0.85;
    assert.equal(ray.intersectObject(desk).length, 0, '상판 아래 중앙은 막힌 앞판 없이 열려 있어야 합니다.');
    const a = angle + (set.width / 2 - 0.018) / radius;
    ray.set(new Vector3(Math.cos(a) * (radius + 0.31), floorY + 1, Math.sin(a) * (radius + 0.31)), down); ray.far = 0.3;
    assert.equal(ray.intersectObject(desk).length, 0, '상판의 양끝은 사각형이 아닌 둥근 캡슐 윤곽이어야 합니다.');
    parts.forEach(p => p.dispose());
  }
  assert.equal(desk.geometry.index.count, indices, '기존 앞판·턱·지지판 부품이 중복으로 남으면 안 됩니다.');
});

test('각 책상의 모든 의자가 두 지지 다리 사이에 여유 있게 들어가고 앞쪽을 밀어 넣을 수 있다', () => {
  const template = createTubeChairTemplate(), bounds = new Box3();
  for (const part of template) { part.geometry.computeBoundingBox(); bounds.union(part.geometry.boundingBox); }
  const point = new Vector3();
  for (const set of edited.seating.sets) {
    const radius = edited.tiers[set.tier].inner + 0.49, middle = (set.start + set.end) / 2;
    const legOffset = (set.width / 2 - PILL_LEG_INSET) / radius;
    const planes = [-1, 1].map(sign => {
      const a = middle + sign * legOffset;
      return { centre: new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius),
        inward: new Vector3(Math.sin(a) * sign, 0, -Math.cos(a) * sign) };
    });
    for (const seat of edited.seating.seats.filter(s => s.setId === set.id)) {
      const outward = new Vector3(seat.position[0],0,seat.position[2]).normalize();
      const along = new Vector3(outward.z,0,-outward.x), origin = new Vector3(...seat.position).addScaledVector(outward,-0.18);
      const matrix = new Matrix4().makeBasis(along,new Vector3(0,1,0),outward).setPosition(origin);
      for (const x of [bounds.min.x,bounds.max.x]) for (const z of [bounds.min.z,bounds.max.z]) {
        point.set(x,0,z).applyMatrix4(matrix).setY(0);
        for (const plane of planes) {
          assert.ok(point.clone().sub(plane.centre).dot(plane.inward) - 0.08 >= 0.06,
            '바깥쪽 좌석까지 의자 전체 폭과 지지 다리 사이에 최소 6cm 여유가 있어야 합니다.');
        }
      }
      for (const part of template) {
        const p=part.geometry.attributes.position;
        for (let i=0;i<p.count;i++) {
          if (p.getY(i)<0.715) continue;
          point.fromBufferAttribute(p,i).applyMatrix4(matrix);
          assert.ok(Math.hypot(point.x,point.z)>set.outer+0.02,'의자를 18cm 밀어 넣어도 높은 등받이와 상판이 관통하면 안 됩니다.');
        }
      }
      assert.ok(0.715-template[5].geometry.boundingBox.max.y>=0.20,'좌판 위 무릎 높이 여유를 유지합니다.');
    }
  }
  const materials=new Set(template.map(p=>p.material));template.forEach(p=>p.geometry.dispose());
  for (const material of materials) { if (!material.userData.smokedWood) material.bumpMap?.dispose();material.dispose(); }
});

test('수정 대상 가구 외 주변 가구·조명·카메라·재질과 계단 테이블 디자인은 보존된다', async () => {
  const { commit, sourceFiles, transforms, ...baseline } = JSON.parse(await readFile(new URL('./helpers/wood-material-baseline.json', import.meta.url)));
  assert.equal(commit, '767bdf9');
  const photoBaseline = JSON.parse(await readFile(new URL('./helpers/wood-photo-baseline.json', import.meta.url)));
  const planterBaseline = JSON.parse(await readFile(new URL('./helpers/open-planter-baseline.json', import.meta.url)));
  const meetingBaseline = JSON.parse(await readFile(new URL('./helpers/meeting-clearance-baseline.json', import.meta.url)));
  const coffeeBaseline = JSON.parse(await readFile(new URL('./helpers/lounge-coffee-baseline.json', import.meta.url)));
  assert.equal(edited.stairs.material[0].color.getHexString(), 'b8b8b8');
  const meetingExclusions=['Gathering_round-meeting','Gathering_s-curve-meeting'];
  const tableExclusions=['Clay_Clay_orange','Clay_low_coffee_table'];
  const snapshot = appearanceSnapshot(model, { materialExclusions: [], subtreeExclusions: ['Gathering_tiered-forum',...meetingExclusions,...tableExclusions] });
  assert.equal(snapshot.meshes, coffeeBaseline.exceptOlderEdits.meshes); assert.equal(snapshot.surroundings, coffeeBaseline.exceptOlderEdits.surroundings);
  const unmodified=appearanceSnapshot(model,{materialExclusions:[],subtreeExclusions:tableExclusions});
  assert.equal(unmodified.meshes,coffeeBaseline.outsideTable.meshes);assert.equal(unmodified.surroundings,coffeeBaseline.outsideTable.surroundings);
  // CPU/V8 versions can differ at the last floating-point bit. Preserve all
  // unchanged geometry/light/camera source bytes, then compare table buffers against the
  // untouched original geometry factory in the same execution environment.
  for (const [file, hash] of Object.entries(sourceFiles)) {
    let source = await readFile(new URL('../' + file, import.meta.url));
    if (file === 'src/main.js') {
      const before = JSON.parse(await readFile(new URL('./helpers/entry-space-baseline.json', import.meta.url)));
      const text = source.toString();
      const protectedParts = {
        renderSetup: text.slice(text.indexOf('THREE.Mesh.prototype.raycast'), text.indexOf('function floorHeight')).replace('\nrenderer.domElement.inert = true;', ''),
        physics: text.slice(text.indexOf('function floorHeight'), text.indexOf('async function loadSpace')).replaceAll('!entrySession.entered || ', ''),
        modelSetup: text.slice(text.indexOf('  const loader = new GLTFLoader();'), text.indexOf('  await renderer.compileAsync')),
      };
      for (const [part, value] of Object.entries(protectedParts)) assert.equal(createHash('sha256').update(value).digest('hex'), before[part], `${part} 공간·카메라·조명·충돌 구성 보존`);
      continue;
    }
    if (file === 'src/clay-gatherings.js') {
      let text = source.toString();
      const coffeeStart=text.indexOf('    // Keep the low table independent');
      text=text.slice(0,coffeeStart)+text.slice(text.indexOf('    const floorY =',coffeeStart));
      text=text.replace("      if (zone.id === 'grand-lounge') {\n", "      if (zone.id === 'grand-lounge') {\n        add(root, 'Clay_large_orange_ottoman', roundedCylinder(0.78, 0.38, 0.08), materials.orange, 0, 0, 0.1);\n");
      text=text.replace('    if (zone.faceCenter) root.rotation.y = Math.atan2(-zone.x, -zone.z);\n','');
      text=text.replace('    if (zone.rotationY !== undefined) root.rotation.y = zone.rotationY;\n','');
      text=text.replace('        const plantAngle = -(zone.rotationY ?? 0), plantX = -R - 0.47, plantZ = 0.35;\n        const x = plantX * Math.cos(plantAngle) + plantZ * Math.sin(plantAngle);\n        const z = -plantX * Math.sin(plantAngle) + plantZ * Math.cos(plantAngle);\n        planter(root, 1.5, 0.66, x, z, 0, 1.4);','        planter(root, 1.5, 0.66, -R - 0.47, 0.35, 0, 1.4);');
      const marker="    } else {\n      arc(root, 'Clay_meeting_partition'";
      const preserved = text.slice(0,text.indexOf(marker))+text.slice(text.indexOf('    root.userData.capacity'));
      assert.equal(createHash('sha256').update(preserved).digest('hex'), meetingBaseline.furnitureSource, '수정 대상 외 화분·중앙 가구 생성 코드 보존');
      continue;
    }
    if (file === 'src/clay-flower-bed.js') {
      const text = source.toString(), preserved = text.slice(0, text.indexOf('  for (const [px, pz,')) + text.slice(text.indexOf('  for (let i = 0; i < chosen.length; i++)'));
      assert.equal(createHash('sha256').update(preserved).digest('hex'), planterBaseline.flowerSource, '꽃·줄기·긴 잎 생성 코드 보존');
      continue;
    }
    if (file === 'src/terrace-tube-chair.js') {
      const text = source.toString(), body = text.slice(text.indexOf('  // Four slim posts;'), text.indexOf('\n  return parts;'));
      assert.equal(createHash('sha256').update(body).digest('hex'), photoBaseline.chairGeometrySource, '의자 형상 생성 코드 보존');
      continue;
    }
    if (file === 'src/terrace-pill-desk.js') source = Buffer.from(source.toString().replace('\nexport const PILL_LEG_INSET = 0.24;\n', '').replace('const inset = PILL_LEG_INSET;', 'const inset = Math.max(0.32, length * 0.13);'));
    if (file === 'src/gathering-layout.js') source = Buffer.from(source.toString().replace("z: -4.3, radius: 3.4", "z: -4.3, radius: 2.9").replace('z: -6, radius: 2.75','z: -6, radius: 2.15').replace('z: 0.4, radius: 3.05','z: 0.4, radius: 2.55').replace(', faceCenter: true','').replace(', rotationY: Math.PI','').replace("import { gatheringIsRaised } from './gathering-floor.js';","import { centralIsRaised } from './central-room.js';").replace('  return GATHERING_LAYOUT.floorY + (gatheringIsRaised(x, z) ? 0.28 : 0);','  const scale = GATHERING_LAYOUT.floorScale;\n  return GATHERING_LAYOUT.floorY + (centralIsRaised(x / scale, z / scale) ? 0.28 : 0);'));
    if (file === 'src/space-colors.js') source = Buffer.from(source.toString().replace("stairs: '#B8B8B8'", "stairs: '#CBCBCB'"));
    if (file === 'src/compact-space.js') source = Buffer.from(source.toString().replace(", layout: 'lounge'", '').replace("import { gatheringPlatformContour } from './gathering-floor.js';\n",'').replace(', contour: gatheringPlatformContour(L.centralRadius)',''));
    if (file === 'src/central-room.js') source=Buffer.from(source.toString().replace(', contour = null','').replace('new THREE.Shape(contour ?? points)','new THREE.Shape(points)'));
    assert.equal(createHash('sha256').update(source).digest('hex'), hash, `${file} 원본 보존`);
  }
  const excludedTransformNames=new Set(['Gathering_tiered-forum',...meetingExclusions,'Gathering_grand-lounge','Gathering_conversation-nook','Clay_low_coffee_table']);
  let excludedTransform=false;
  const unchangedTransforms = transforms.filter(object=>{if(object.name.startsWith('Gathering_')||object.name==='Clay_front_oval_planter')excludedTransform=excludedTransformNames.has(object.name);return !excludedTransform&&object.name!=='Clay_Clay_orange';});
  let count = 0;
  model.traverse(object => {
    for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (excludedTransformNames.has(ancestor.name)) return;
    const expected = unchangedTransforms[count++];
    assert.equal(object.name, expected.name); assert.equal(object.type, expected.type);
    for (const property of ['matrix', 'matrixWorld']) object[property].elements.forEach((v, i) => {
      assert.ok(Math.abs(v - expected[property][i]) < 1e-12, `${object.name} 위치·회전·크기 보존`);
    });
  });
  assert.equal(count, unchangedTransforms.length);
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  const originals = edited.seating.sets.flatMap(set => createPillDeskParts({ inner: edited.tiers[set.tier].inner, start: set.start, end: set.end, floorY: set.center[1] }));
  for (const part of originals) {
    part.applyMatrix4(new Matrix4()); // Same identity transform/normal normalization as the original batching path.
    part.deleteAttribute('uv');
    if (!part.index) part.setIndex(Array.from({ length: part.attributes.position.count }, (_, i) => i));
  }
  const expected = mergeGeometries(originals);
  const exact = (actual, original, label) => assert.equal(Buffer.compare(
    Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength),
    Buffer.from(original.buffer, original.byteOffset, original.byteLength)), 0, label);
  for (const property of ['position', 'normal']) exact(desk.geometry.attributes[property].array, expected.attributes[property].array, `${property} 버퍼 보존`);
  exact(desk.geometry.index.array, expected.index.array, '인덱스 보존');
  expected.dispose(); originals.forEach(p => p.dispose());
  const coordinates = desk.geometry.attributes.deskWoodCoord;
  assert.equal(coordinates.count, desk.geometry.attributes.position.count);
  for (const value of coordinates.array) assert.ok(Number.isFinite(value));
  assert.equal(desk.material.normalMap, null); assert.equal(desk.material.bumpMap, null);
});


test('실제 목재 사진만 낮은 대비로 샘플링하고 상판은 곡률을 따라 휘지 않는 판재 좌표를 사용한다', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/textures/wood-source.json', import.meta.url)));
  const bytes = await readFile(new URL('../public/' + WOOD_PHOTO_PATH, import.meta.url));
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  assert.equal(manifest.license, 'CC0-1.0');
  const desk = edited.seating.root.getObjectByName('Terrace_gloss_desks');
  const frame = edited.seating.root.getObjectByName('Terrace_tube_frames');
  for (const mesh of [desk, frame]) {
    assert.ok(mesh.geometry.attributes.deskWoodNormal);
    assert.equal(mesh.material.bumpMap, null); assert.equal(mesh.material.normalMap, null); assert.equal(mesh.material.displacementMap, null);
    assert.ok(mesh.material.roughness >= 0.85 && mesh.material.clearcoat === 0);
    const shader = { vertexShader:'#include <common>\n#include <begin_vertex>', fragmentShader:'#include <common>\n#include <color_fragment>', uniforms:{} };
    mesh.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.woodPhoto.value.userData.source, manifest.source);
    assert.ok(shader.fragmentShader.includes('texture2D(woodPhoto'));
    assert.ok(!shader.fragmentShader.includes('sin('), '나뭇결은 반복 사인파가 아니라 실제 사진에서 읽어야 합니다.');
    assert.ok(!shader.vertexShader.includes('transformed +='), '변위로 기존 형상을 바꾸면 안 됩니다.');
  }
  const source = await readFile(new URL('../src/terrace-smoked-wood.js', import.meta.url),'utf8');
  const tableMapping = source.slice(source.indexOf('export function mapSmokedWood'),source.indexOf('export function mapChairWood'));
  assert.ok(!tableMapping.includes('atan2'), '곡선 외곽을 따라 결까지 휘는 방사형 매핑을 사용하지 않습니다.');
});
