import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialNoticeState} from '../src/spatial-notice-state.js';
import {GATHERING_LAYOUT as layout} from '../src/gathering-layout.js';
import {gatheringEntrances} from '../src/gathering-entrances.js';
const blue={x:0,y:3.875,z:24},gray={x:0,y:1.475,z:13},central={x:0,y:1.175,z:11};

test('교차로→중앙→교차로를 5초 이전에 이동해도 현재 공간으로 즉시 교체한다',()=>{
  const state=createSpatialNoticeState(layout);state.observe(blue);
  assert.equal(state.observe(gray),true);assert.equal(state.current.id,'crossroads');state.tick(0);
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');state.tick(1000);
  assert.equal(state.observe(gray),true);assert.equal(state.current.id,'crossroads');state.tick(1500);
  assert.equal(state.tick(5000),false,'이전 안내의 마감 시각으로 새 안내가 닫히지 않음');
  assert.equal(state.tick(6499),false);assert.equal(state.tick(6500),true);assert.equal(state.current,null);
  assert.equal(state.observe(gray),false,'같은 공간에 계속 있으면 다시 표시하지 않음');
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');
});
test('여섯 모듈 입구↔중앙↔교차로도 이전 안내를 기다리거나 다시 이어서 표시하지 않는다',()=>{
  for(const e of gatheringEntrances()){
    const state=createSpatialNoticeState(layout);state.observe(blue);state.observe(central);state.tick(0);
    const near={x:e.x+e.dx*(e.radius+.6),y:e.floorY+.025,z:e.z+e.dz*(e.radius+.6)};
    assert.equal(state.observe(near),true);assert.deepEqual(state.current,{id:'room-selection',zoneId:e.id});state.tick(100);
    assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');state.tick(200);
    assert.equal(state.observe(gray),true);assert.equal(state.current.id,'crossroads');state.tick(300);
    assert.equal(state.observe(near),true);assert.equal(state.current.zoneId,e.id,'다시 접근해도 현재 모듈 안내');
  }
});
test('경계 접촉 오차는 화면을 비우지 않고, 공간 밖으로 나가면 이전 안내를 지운다',()=>{
  const state=createSpatialNoticeState(layout);state.observe(blue);state.observe(gray);state.tick(0);
  assert.equal(state.observe({...gray,z:12.5}),false);assert.equal(state.current.id,'crossroads');
  assert.equal(state.observe(central),true);assert.equal(state.current.id,'relationship');
  assert.equal(state.observe({x:0,y:1.34,z:12.63}),true);assert.equal(state.current.id,'crossroads','첫 디딤판에 올라가는 발 높이 댐핑 중에도 빈 화면 없이 즉시 교체');
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
