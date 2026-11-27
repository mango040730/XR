import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRelationshipTutorialState,isInRelationshipRoom,RELATIONSHIP_DURATION_MS} from '../src/relationship-tutorial-state.js';
const layout={centralRadius:12.5,floorY:1.15};
const outside={x:0,y:1.475,z:13},inside={x:0,y:1.175,z:12.3};

test('관계의 방은 중앙 원형 바닥 두 높이를 포함하고 계단/블루레일/잘못된 위치를 제외한다',()=>{
  assert.equal(isInRelationshipRoom(inside,layout),true);
  assert.equal(isInRelationshipRoom({x:0,y:1.455,z:-8},layout),true);
  for(const p of [outside,{...inside,y:2.075},{x:0,y:3.875,z:24},{...inside,z:12.5},{...inside,y:-1},{...inside,x:NaN}])assert.equal(isInRelationshipRoom(p,layout),false);
});
test('중앙 진입 시 한 번 표시하고 읽기 5초 후 닫으며 재진입해도 반복하지 않는다',()=>{
  const state=createRelationshipTutorialState(layout);
  for(let i=0;i<10;i++)assert.equal(state.observe(outside),false);
  assert.equal(state.observe(inside),true);state.tick(1000);
  assert.equal(state.tick(1000+RELATIONSHIP_DURATION_MS-1),false);
  assert.equal(state.tick(1000+RELATIONSHIP_DURATION_MS),true);
  state.observe(outside);assert.equal(state.observe(inside),false);assert.equal(state.active,false);
});
test('앞선 교차로 안내를 기다린 시간은 관계의 방 읽기 시간에서 빼지 않는다',()=>{
  const state=createRelationshipTutorialState(layout);state.observe(outside);state.observe(inside);
  assert.equal(state.tick(10000),false);assert.equal(state.tick(14999),false);assert.equal(state.tick(15000),true);
});
test('숨겨진 탭 시간 제외·시작점 정지·정리 동작을 유지한다',()=>{
  const state=createRelationshipTutorialState(layout);assert.equal(state.observe(inside),false);
  state.observe(outside);state.observe(inside);state.tick(1000);state.tick(2000,false);
  assert.equal(state.tick(20000,true),false);assert.equal(state.tick(23999),false);assert.equal(state.tick(24000),true);
  const disposed=createRelationshipTutorialState(layout);disposed.observe(outside);disposed.observe(inside);disposed.dispose();
  assert.equal(disposed.tick(99999),false);assert.equal(disposed.active,false);
});
