import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gatheringEntrances,isNearGatheringEntrance} from '../src/gathering-entrances.js';
import {createRoomSelectionTutorialState,ROOM_SELECTION_DURATION_MS} from '../src/room-selection-tutorial-state.js';
const entrances=gatheringEntrances(),outside={x:0,y:3.875,z:27};
const approach=e=>({x:e.x+e.dx*(e.radius+.6),y:e.floorY+.025,z:e.z+e.dz*(e.radius+.6)});

test('여섯 모듈의 실제 회전/열린 방향과 발 높이로 입구 근접을 판정한다',()=>{
  assert.equal(entrances.length,6);
  for(const e of entrances){
    assert.equal(isNearGatheringEntrance(approach(e),e),true,e.id);
    assert.equal(isNearGatheringEntrance({x:e.x-e.dx*(e.radius+.6),y:e.floorY+.025,z:e.z-e.dz*(e.radius+.6)},e),false,'등 뒤에서 표시하지 않음');
    assert.equal(isNearGatheringEntrance({...approach(e),y:3.875},e),false,'상단 계단에서 표시하지 않음');
    assert.equal(isNearGatheringEntrance({...approach(e),x:NaN},e),false);
    assert.equal(isNearGatheringEntrance({...approach(e),x:e.x+e.dz*(e.radius+.6),z:e.z-e.dx*(e.radius+.6)},e),false,'측면에서 표시하지 않음');
  }
});
test('각 입구 접근 시 5초 표시하며 같은 모듈에서 반복하지 않고 나머지 다섯 모듈은 각각 표시한다',()=>{
  const state=createRoomSelectionTutorialState();state.observe(outside);
  for(let i=0;i<entrances.length;i++){
    const e=entrances[i],now=i*10000;
    assert.equal(state.observe(approach(e)),true,e.id);assert.equal(state.zoneId,e.id);
    assert.equal(state.tick(now),false);assert.equal(state.tick(now+ROOM_SELECTION_DURATION_MS-1),false);
    assert.equal(state.tick(now+ROOM_SELECTION_DURATION_MS),true);assert.equal(state.active,false);
    state.observe(outside);assert.equal(state.observe(approach(e)),false,'재접근 스팸 없음');
  }
});
test('앞선 안내/모달 중에는 기다리되 이미 지나간 모듈은 뒤늦게 표시하지 않는다',()=>{
  const state=createRoomSelectionTutorialState();state.observe(outside);
  assert.equal(state.observe(approach(entrances[0]),{blocked:true}),false);
  assert.equal(state.active,false);assert.equal(state.observe(outside),false);
  assert.equal(state.observe(approach(entrances[1])),true);assert.equal(state.zoneId,entrances[1].id);
  state.tick(0);state.tick(5000);
  assert.equal(state.observe(approach(entrances[0])),true,'이전 안내 중 지나간 곳은 다음 실제 접근에서 안내');
});
test('숨긴 탭 시간은 제외하고 정지·잘못된 위치·dispose 시 표시하지 않는다',()=>{
  const state=createRoomSelectionTutorialState();assert.equal(state.observe(approach(entrances[0])),false);
  state.observe(outside);state.observe(approach(entrances[0]));state.tick(1000);state.tick(2000,false);
  assert.equal(state.tick(20000),false);assert.equal(state.tick(23999),false);assert.equal(state.tick(24000),true);
  assert.equal(state.observe({x:NaN,y:0,z:0}),false);state.dispose();assert.equal(state.observe(approach(entrances[1])),false);
});
