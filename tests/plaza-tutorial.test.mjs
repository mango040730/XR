import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlazaTutorialState,isOnBlueRail} from '../src/plaza-tutorial-state.js';
const layout={terraceOuter:20.9,outerRadius:25.5,pathY:3.85};
const outside={x:0,y:3.875,z:26.6},inside={x:0,y:3.875,z:25.3};
test('입장/정지/입구 대기는 표시하지 않고 실제 블루레일 입성에만 표시한다',()=>{
  const state=createPlazaTutorialState(layout);
  for(let i=0;i<100;i++)assert.equal(state.observe(outside),false);
  assert.equal(state.observe({...outside,z:25.8}),false);assert.equal(state.active,false);
  assert.equal(state.observe(inside),true);assert.equal(state.phase,'plaza');assert.equal(state.active,true);
});
test('블루레일의 반경과 바닥 높이를 구분하고 중앙/계단에서 오작동하지 않는다',()=>{
  assert.equal(isOnBlueRail(inside,layout),true);
  for(const position of [{...inside,z:20.9},{...inside,z:26},{...inside,y:1.15},{...inside,x:NaN}])assert.equal(isOnBlueRail(position,layout),false);
  const state=createPlazaTutorialState(layout);state.observe(outside);
  assert.equal(state.observe({x:0,y:1.15,z:0}),false);assert.equal(state.phase,'waiting');
});
test('블루레일 위에서 시작해도 즉시 뜨지 않고 영역 밖에서 들어와야 한다',()=>{
  const state=createPlazaTutorialState(layout);
  assert.equal(state.observe(inside),false);assert.equal(state.observe({...inside,z:24}),false);
  state.observe(outside);assert.equal(state.observe(inside),true);
});
test('광장→작당모의→닫기 순서이며 같은 접속에서 재진입해도 반복하지 않는다',()=>{
  const state=createPlazaTutorialState(layout);assert.equal(state.next(),false);assert.equal(state.calendar(),false);
  state.observe(outside);state.observe(inside);assert.equal(state.calendar(),false);
  assert.equal(state.next(),true);assert.equal(state.phase,'gathering');assert.equal(state.next(),false);
  assert.equal(state.dismiss(),true);assert.equal(state.active,false);
  state.observe(outside);assert.equal(state.observe(inside),false);assert.equal(state.phase,'done');
});
test('캘린더 버튼은 실제 연결을 흉내내지 않고 준비 중 안내로 연결한다',()=>{
  const state=createPlazaTutorialState(layout);state.observe(outside);state.observe(inside);state.next();
  assert.equal(state.calendar(),true);assert.equal(state.phase,'calendar');assert.equal(state.active,true);
  state.dismiss();assert.equal(state.active,false);
});
