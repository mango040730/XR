import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Group,Mesh,Box3,Vector3} from 'three';
import {acceleratedRaycast} from 'three-mesh-bvh';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {prepareGatheringSpace} from '../src/compact-space.js';
import {isWalkable} from '../src/prepare-space.js';
import {collisionGeometry} from '../src/collision.js';
import {createNpcNavigation,createNpcWalker,NPC_HEIGHT,NPC_LANE_RADII} from '../src/npc-navigation.js';
import {prepareNpcAppearance} from '../src/npc-appearance.js';
import {AVATARS} from '../src/entry-state.js';

Mesh.prototype.raycast=acceleratedRaycast;
const bytes=await readFile(new URL('../public/models/space.glb',import.meta.url));
const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
prepareGatheringSpace(model);const meshes=[],floors=[];
model.traverse(m=>{if(m.isMesh){meshes.push(m);if(isWalkable(m))floors.push(m);}});
const navigation=createNpcNavigation({floor:collisionGeometry(floors),collider:collisionGeometry(meshes)});

test('실제 바닥과 가구 충돌을 검사한 NPC 경로는 중앙으로 들어가지 않고 모든 외곽 층을 연결한다',()=>{
  assert.equal(navigation.rings.length,4);
  for(const node of navigation.nodes){
    assert.ok(Math.hypot(node.x,node.z)>12.5+.8);
    assert.ok(Math.abs(navigation.floorAt(node.x,node.z)-node.y)<.0001);
    for(const edge of node.edges)assert.equal(navigation.clearSegment(node,navigation.nodes[edge.to]),true,`몸통 여유 ${node.id} -> ${edge.to}`);
  }
  for(const from of navigation.rings)for(const to of navigation.rings){
    const route=navigation.path(from[23].id,to[80].id);assert.ok(route.length>0);
    assert.equal(route.at(-1).id,to[80].id);
    assert.ok(route.every(n=>Math.hypot(n.x,n.z)>=NPC_LANE_RADII[0]-.002));
  }
});

test('10분 동안 네 NPC가 서로를 피해 실제 통로·계단에서 이동하고 중앙 경계를 넘지 않는다',()=>{
  let seed=78;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const actors=[0,1,2,3].map(i=>createNpcWalker(navigation,i,{random})),heights=new Set();
  for(let tick=0;tick<12000;tick++)for(const actor of actors){
    actor.update(.05,{others:actors.filter(a=>a!==actor).map(a=>a.position)});
    const p=actor.position;heights.add(Math.round(p.y*10));
    assert.ok(Math.hypot(p.x,p.z)>=NPC_LANE_RADII[0]-.003&&Math.hypot(p.x,p.z)<=NPC_LANE_RADII[3]+.001);
    assert.ok(Math.abs(p.y-navigation.floorAt(p.x,p.z))<.31,'실제 바닥에서 계단 한 단 이상 뜨거나 빠지지 않음');
    for(const other of actors.filter(a=>a!==actor))if(Math.abs(p.y-other.position.y)<.65)assert.ok(Math.hypot(p.x-other.position.x,p.z-other.position.z)>.86,'같은 층에서 서로 관통하지 않음');
  }
  actors.forEach(a=>assert.ok(a.distance>30,'각 NPC가 실제 경로를 이동'));
  assert.ok(heights.size>5,'넓은 단만 맴돌지 않고 연결 계단에서도 활동');
});

test('사용자 앞에서는 멈추며 숨김·입장 전에는 NPC 이동을 중단한다',()=>{
  const actor=createNpcWalker(navigation,0,{random:()=>.3});actor.update(1);actor.update(.1);assert.ok(actor.route.length);
  const next=actor.route[0],player=new Vector3(next.x,actor.position.y,next.z),before=actor.position.clone();actor.update(.1,{player});assert.deepEqual(actor.position.toArray(),before.toArray());
  actor.update(10,{active:false});assert.deepEqual(actor.position.toArray(),before.toArray());
  actor.update(.1);assert.ok(actor.position.distanceTo(before)>.01);
});

test('첨부 캐릭터 이름은 수정된 아바타 순서와 일치하며 원본 GLB와 재질을 유지한다',async()=>{
  assert.deepEqual(AVATARS.map(a=>a.nickname),['롤리','마이','시론','뮤티']);
  const manifest=JSON.parse(await readFile(new URL('../public/models/npcs/source.json',import.meta.url)));
  for(const avatar of AVATARS){
    const bytes=await readFile(new URL(`../public/models/npcs/${avatar.nickname}.glb`,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest[avatar.nickname].sha256);
    const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.equal(json.skins?.length??0,0);assert.equal(json.animations?.length??0,0);
    if(json.images?.length){assert.ok(json.images.every(image=>image.bufferView!==undefined),'뮤티 원본 내장 텍스처 보존');continue;}
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    const materials=[],positions=[],sourceGeometries=[];gltf.scene.traverse(m=>{if(m.isMesh){materials.push(m.material);sourceGeometries.push(m.geometry);positions.push(m.geometry.attributes.position.array.slice());}});
    const appearance=prepareNpcAppearance(gltf.scene),bounds=new Box3().setFromObject(appearance.root,true);assert.ok(Math.abs(bounds.min.y)<1e-8&&Math.abs(bounds.max.y-NPC_HEIGHT)<1e-8);
    assert.ok(appearance.triangles.far<appearance.triangles.near*.15,'원본 근접 모델은 보존하고 먼 캐릭터만 부드러운 경량 메시 사용');
    assert.ok(appearance.width>.8&&appearance.width<1.2);appearance.update(3,true,.1);assert.ok(appearance.uniforms.npcStride.value>0);appearance.update(3,false,1);assert.ok(appearance.uniforms.npcStride.value<.001);
    let i=0;gltf.scene.traverse(m=>{if(m.isMesh){assert.equal(m.material,materials[i]);assert.equal(m.geometry.index,sourceGeometries[i].index,'근접 모델 원본 삼각형과 UV/재질 유지');assert.deepEqual(sourceGeometries[i].attributes.position.array,positions[i],'원본 버퍼는 수정하지 않고 별도 포즈 버퍼 사용');i++;}});
  }
});
