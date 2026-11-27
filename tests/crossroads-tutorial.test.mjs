import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCrossroadsTutorialState,isOnGrayTerrace,CROSSROADS_DURATION_MS} from '../src/crossroads-tutorial-state.js';
const layout={centralRadius:12.5,terraceOuter:20.9,floorY:1.15,pathY:3.85};
const blue={x:0,y:3.875,z:21.5},gray={x:0,y:3.575,z:19.5};

test('교차로는 블루 카펫/중앙 바닥을 제외하고 회색 좌석 단과 접근 계단을 판정한다',()=>{
  assert.equal(isOnGrayTerrace(gray,layout),true);
  assert.equal(isOnGrayTerrace({x:17,y:2.975,z:0},layout),true);
  assert.equal(isOnGrayTerrace({x:14,y:2.075,z:0},layout),true);
  for(const p of [blue,{...gray,y:3.875},{...gray,y:1.15},{x:0,y:1.455,z:12},{...gray,x:NaN}])assert.equal(isOnGrayTerrace(p,layout),false);
});
test('정지 또는 회색 위 시작으로 열지 않고 실제 진입에서 한 번만 표시한다',()=>{
  const state=createCrossroadsTutorialState(layout);
  assert.equal(state.observe(gray),false);
  for(let i=0;i<10;i++)assert.equal(state.observe(blue),false);
  assert.equal(state.observe(gray),true);assert.equal(state.active,true);
  state.tick(100);assert.equal(state.tick(100+CROSSROADS_DURATION_MS-1),false);
  assert.equal(state.tick(100+CROSSROADS_DURATION_MS),true);assert.equal(state.active,false);
  state.observe(blue);assert.equal(state.observe(gray),false);
});
test('숨겨진 탭의 시간은 읽기 시간 5초에서 제외한다',()=>{
  const state=createCrossroadsTutorialState(layout);state.observe(blue);state.observe(gray);
  state.tick(1000);state.tick(2000,false);
  assert.equal(state.tick(20000,true),false);
  assert.equal(state.tick(23999),false);assert.equal(state.tick(24000),true);
});
test('정리 후 표시나 타이머가 다시 활성화되지 않는다',()=>{
  const state=createCrossroadsTutorialState(layout);state.observe(blue);state.observe(gray);state.tick(0);
  state.dispose();assert.equal(state.active,false);assert.equal(state.tick(6000),false);
  state.observe(blue);assert.equal(state.observe(gray),false);
});
