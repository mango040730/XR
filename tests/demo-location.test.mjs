import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_AREAS,DEMO_LOCATION_KEY,demoSelection,validDemoSelection,readDemoSelection,saveDemoSelection} from '../src/demo-location.js';
import {copyLocation,saveLocation} from '../src/location-data.js';
import {createEntryState} from '../src/entry-state.js';
test('데모는 실제 위경도 대신 가상 지도 좌표·동네·데모 표시로 저장된다',()=>{
  for(const area of DEMO_AREAS){
    const value=demoSelection(area.x,area.y);
    assert.equal(value.mode,'demo');assert.equal(value.areaId,area.id);assert.equal(value.lat,undefined);assert.equal(value.lng,undefined);
    assert.ok(validDemoSelection(value));assert.deepEqual(copyLocation(value),value);
  }
  assert.equal(demoSelection(-10,10).x,.24);assert.equal(demoSelection(-10,10).y,.76);
  assert.equal(validDemoSelection({...demoSelection(),x:NaN}),false);
});
test('API 위치와 별도 저장소를 쓰며 데모 확정 후 기존 입장이 가능하다',()=>{
  const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)??null};
  const selected={...demoSelection(.7,.64),confirmedAt:'2026-11-27T00:00:00.000Z'};
  saveDemoSelection(selected,storage);assert.ok(values.has(DEMO_LOCATION_KEY));assert.deepEqual(readDemoSelection(storage),selected);
  assert.throws(()=>saveLocation(selected,storage),'데모를 실제 위치 저장소에 넣지 않는다');
  const state=createEntryState();assert.equal(state.setLocation(selected),true);assert.equal(state.complete(),false);assert.equal(state.ready(),true);
  assert.deepEqual(state.profile.location,selected);
  values.set(DEMO_LOCATION_KEY,'{invalid');assert.deepEqual(readDemoSelection(storage),demoSelection());
});
