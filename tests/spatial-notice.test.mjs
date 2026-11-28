import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialNoticeState} from '../src/spatial-notice-state.js';
import {GATHERING_LAYOUT as layout} from '../src/gathering-layout.js';
import {gatheringEntrances} from '../src/gathering-entrances.js';
const blue={x:0,y:3.875,z:24},gray={x:0,y:1.475,z:13},central={x:0,y:1.175,z:11};

test('처음 보는 공간 안내로는 즉시 교체하고 역방향 재접근에서는 반복하지 않는다',()=>{
  const state=createSpatialNoticeState(layout);state.observe(blue);
  assert.equal(state.observe(gray),true);assert.equal(state.current.id,'crossroads');state.tick(0);
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');state.tick(1000);
  assert.equal(state.tick(5000),false,'이전 안내의 마감 시각으로 새 안내가 닫히지 않음');
  assert.equal(state.tick(5999),false);assert.equal(state.tick(6000),true);assert.equal(state.current,null);
  assert.equal(state.observe(gray),true);assert.equal(state.current,null,'이미 본 교차로 안내는 다시 표시하지 않음');
  assert.equal(state.observe(gray),false,'같은 공간에 계속 있으면 다시 표시하지 않음');
  assert.equal(state.observe(central),true);assert.equal(state.current,null);
});
test('선택 안내는 여섯 모듈 중 처음 접근한 입구에서만 표시하고 지나간 안내를 이어서 띄우지 않는다',()=>{
  for(const e of gatheringEntrances()){
    const state=createSpatialNoticeState(layout);state.observe(blue);state.observe(central);state.tick(0);
    const near={x:e.x+e.dx*(e.radius+.6),y:e.floorY+.025,z:e.z+e.dz*(e.radius+.6)};
    assert.equal(state.observe(near),true);assert.deepEqual(state.current,{id:'room-selection',zoneId:e.id});state.tick(100);
    assert.equal(state.observe(central),true);assert.equal(state.current,null);state.tick(200);
    assert.equal(state.observe(gray),true);assert.equal(state.current.id,'crossroads');state.tick(300);
    assert.equal(state.observe(near),true);assert.equal(state.current,null,'다시 접근해도 선택 안내 반복 없음');
    for(const other of gatheringEntrances().filter(other=>other.id!==e.id)){
      state.observe(central);
      state.observe({x:other.x+other.dx*(other.radius+.6),y:other.floorY+.025,z:other.z+other.dz*(other.radius+.6)});
      assert.equal(state.current,null,'다른 모듈에서도 같은 선택 안내를 반복하지 않음');
    }
  }
});
test('경계 접촉 오차는 화면을 비우지 않고, 공간 밖으로 나가면 이전 안내를 지운다',()=>{
  const state=createSpatialNoticeState(layout);state.observe(blue);state.observe(gray);state.tick(0);
  assert.equal(state.observe({...gray,z:12.5}),false);assert.equal(state.current.id,'crossroads');
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');
  assert.equal(state.observe({x:0,y:1.34,z:12.63}),true);assert.equal(state.current,null,'이미 본 교차로에서는 중앙 안내만 즉시 닫음');
  assert.equal(state.observe(blue),true);assert.equal(state.current,null);
});
test('숨긴 시간·모달 차단·초기 정지·잘못된 위치·해제 동작을 유지한다',()=>{
  const state=createSpatialNoticeState(layout);assert.equal(state.observe(central),false);
  state.observe(gray);state.tick(1000);state.tick(2000,false);
  assert.equal(state.tick(20000),false);assert.equal(state.tick(23999),false);assert.equal(state.tick(24000),true);
  assert.equal(state.observe(central,{blocked:true}),false);assert.equal(state.current,null);
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');
  assert.equal(state.observe({x:NaN,y:0,z:0}),false);state.dispose();assert.equal(state.current,null);
  assert.equal(state.observe(gray),false);assert.equal(state.tick(999999),false);
});

test('중단된 안내도 이미 본 것으로 처리하고 새 접속 상태에서는 다시 안내할 수 있다',()=>{
  const state=createSpatialNoticeState(layout);state.observe(blue);state.observe(gray);state.tick(0);
  state.observe(central);state.tick(100);state.observe(gray);assert.equal(state.current,null);
  state.observe(blue);state.observe(central);assert.equal(state.current,null);assert.equal(state.tick(999999),false);
  const nextConnection=createSpatialNoticeState(layout);nextConnection.observe(blue);nextConnection.observe(gray);
  assert.equal(nextConnection.current.id,'crossroads');
});
