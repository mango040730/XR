import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createLocationController} from '../src/location-controller.js';
import {saveLocation,readSavedLocation,LOCATION_STORAGE_KEY} from '../src/location-data.js';
const point={lat:37.56,lng:126.97}, moved={lat:37.57,lng:126.98};
const result=(p=point,address='테스트 주소')=>({results:[{formatted_address:address,place_id:'test-id',geometry:{location:{lat:()=>p.lat,lng:()=>p.lng}}}]});
const pause=()=>new Promise(r=>setTimeout(r,8));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function setup(t,options={}) {
  const watches=[],cleared=[],saved=[],requests=[];
  const geo={watchPosition(success,error,opts){watches.push({success,error,opts});return watches.length-1;},clearWatch(id){cleared.push(id);}};
  const provider={geocode:async query=>{requests.push(query);return result(query.location??point);}};
  const c=createLocationController({loadProvider:async()=>provider,geolocation:geo,onChange:()=>{},save:async value=>saved.push(value),debounce:0,...options});
  t.after(()=>c.dispose());
  return {c,watches,cleared,saved,requests,provider,fix:(p=point)=>watches.at(-1).success({coords:{latitude:p.lat,longitude:p.lng,accuracy:12}})};
}
test('GPS 중심·주소 확인 전에는 확정할 수 없으며 실시간 위치를 반영한다',async t=>{
  const {c,fix,requests}=setup(t);await c.start();
  assert.equal(c.snapshot.status,'locating'); assert.equal(await c.confirm(),null);
  fix();assert.equal(c.snapshot.canConfirm,false);await pause();
  assert.deepEqual(c.snapshot.center,point);assert.equal(c.snapshot.location.address,'테스트 주소');
  assert.equal(c.snapshot.canConfirm,true);assert.equal(c.snapshot.location.accuracy,12);
  fix(moved);assert.equal(c.snapshot.canConfirm,false);await pause();
  assert.deepEqual(requests.at(-1).location,moved);assert.equal(c.snapshot.location.lat,moved.lat);
});
test('수동 드래그는 GPS와 이전 주소 응답을 차단하고 idle 후에만 주소를 갱신한다',async t=>{
  const pending=deferred();const {c,fix,watches,provider,cleared}=setup(t);
  provider.geocode=()=>pending.promise;await c.start();fix();await pause();
  c.beginManual();c.previewManualCenter(moved);
  assert.ok(cleared.includes(0));assert.equal(c.snapshot.canConfirm,false);
  pending.resolve(result(point,'이전 주소'));await pause();assert.equal(c.snapshot.location,null);
  watches[0].success({coords:{latitude:1,longitude:2}});assert.deepEqual(c.snapshot.center,moved);
  provider.geocode=async()=>result(moved,'새 주소');c.settleManualCenter(moved);await pause();
  assert.equal(c.snapshot.location.address,'새 주소');assert.equal(c.snapshot.location.source,'manual');
});
test('주소 응답 순서가 바뀌어도 최신 선택을 유지한다',async t=>{
  const a=deferred(),b=deferred();const {c,provider}=setup(t);await c.start();c.beginManual();
  let n=0;provider.geocode=()=>++n===1?a.promise:b.promise;
  c.settleManualCenter(point);await pause();c.previewManualCenter(moved);c.settleManualCenter(moved);await pause();
  b.resolve(result(moved,'최신 주소'));await pause();a.resolve(result(point,'과거 주소'));await pause();
  assert.equal(c.snapshot.location.address,'최신 주소');assert.equal(c.snapshot.location.lat,moved.lat);
});
test('위치 권한 거부 시 하드코딩 중심 없이 주소 검색으로 수동 설정한다',async t=>{
  const {c,watches,cleared}=setup(t);await c.start();watches[0].error({code:1});
  assert.equal(c.snapshot.error,'PERMISSION_DENIED');assert.equal(c.snapshot.center,null);assert.equal(c.snapshot.mode,'manual');
  assert.equal(c.snapshot.canConfirm,false);assert.ok(cleared.includes(0));
  await c.search('테스트 동네');assert.equal(c.snapshot.canConfirm,true);assert.equal(c.snapshot.location.source,'manual');
});
test('GPS 오류 후 재시도는 새 추적을 시작하고 이전 콜백을 무시한다',async t=>{
  const {c,watches,fix}=setup(t);await c.start();watches[0].error({code:2});
  assert.equal(c.snapshot.error,'GPS_FAILED');await c.retry();assert.equal(watches.length,2);
  watches[0].success({coords:{latitude:1,longitude:2}});assert.equal(c.snapshot.center,null);
  fix();await pause();assert.equal(c.snapshot.canConfirm,true);
});
test('일시적 GPS 실패 뒤 다음 기기 위치는 같은 watch에서 자동 회복한다',async t=>{
  const {c,watches,fix,cleared}=setup(t);await c.start();fix();await pause();
  watches[0].error({code:2});assert.equal(c.snapshot.canConfirm,false);assert.equal(c.snapshot.mode,'gps');
  assert.deepEqual(cleared,[]);fix(moved);await pause();
  assert.equal(c.snapshot.status,'ready');assert.equal(c.snapshot.location.lat,moved.lat);
});
test('SDK 오류·키 누락에는 재시도가 있고 가짜 지도를 만들지 않는다',async t=>{
  let attempts=0;const {c}=setup(t,{loadProvider:async()=>{if(++attempts===1)throw new Error('MISSING_API_KEY');return{geocode:async()=>result()};}});
  await c.start();assert.equal(c.snapshot.error,'MISSING_API_KEY');assert.equal(c.snapshot.center,null);assert.equal(c.snapshot.canConfirm,false);
  await c.retry();assert.equal(c.snapshot.status,'locating');
});
test('역지오코딩 실패·주소 없는 결과는 확정을 막고 재시도한다',async t=>{
  const {c,provider,fix}=setup(t);await c.start();provider.geocode=async()=>({results:[]});fix();await pause();
  assert.equal(c.snapshot.status,'geocode-error');assert.equal(await c.confirm(),null);
  provider.geocode=async()=>result();await c.retry();assert.equal(c.snapshot.canConfirm,true);
});
test('검색 실패 재시도는 이전 지도 위치 대신 입력한 주소를 다시 검색한다',async t=>{
  const {c,provider}=setup(t);await c.start();let query;
  provider.geocode=async value=>{query=value;throw new Error('ZERO_RESULTS');};
  await c.search('없는 주소');assert.equal(c.snapshot.canConfirm,false);
  provider.geocode=async value=>{query=value;return result();};await c.retry();
  assert.equal(query.address,'없는 주소');assert.equal(c.snapshot.canConfirm,true);
});
test('저장 성공 전에는 다음 단계로 진행하지 않고 중복 확정과 GPS 덮어쓰기를 막는다',async t=>{
  const gate=deferred();let count=0;const {c,fix,cleared}=setup(t,{save:()=>{count++;return gate.promise;}});
  await c.start();fix();await pause();const confirm=c.confirm();
  assert.equal(c.snapshot.status,'saving');assert.equal(await c.confirm(),null);assert.ok(cleared.includes(0));
  fix(moved);assert.deepEqual(c.snapshot.center,point);gate.resolve();const selected=await confirm;
  assert.equal(count,1);assert.equal(selected.lat,point.lat);assert.equal(selected.address,'테스트 주소');assert.equal(c.snapshot.status,'confirmed');
});
test('저장 실패는 확정 성공으로 처리하지 않고 선택 위치를 유지해 다시 저장할 수 있다',async t=>{
  let fail=true;const {c,fix}=setup(t,{save:async()=>{if(fail)throw new Error('quota');}});await c.start();fix();await pause();
  assert.equal(await c.confirm(),null);assert.equal(c.snapshot.status,'save-error');assert.equal(c.snapshot.canConfirm,true);
  fail=false;assert.ok(await c.confirm());
});
test('해제 후에는 추적과 타이머·늦은 비동기 응답이 동작하지 않는다',async t=>{
  let changes=0;const gate=deferred();const {c,fix,provider,cleared}=setup(t,{onChange:()=>changes++});await c.start();provider.geocode=()=>gate.promise;fix();await pause();
  c.dispose();const before=changes;fix(moved);gate.resolve(result());await pause();assert.equal(changes,before);assert.ok(cleared.includes(0));
});
test('저장 위치는 실제 좌표만 복원하고 Google 주소를 영구 캐시하지 않으며 만료·변조를 거부한다',()=>{
  const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k)};
  const selected={...point,address:'실제 조회 주소',placeId:'test-place',source:'manual'};
  saveLocation(selected,storage,1000);assert.deepEqual(readSavedLocation(storage,2000),point);
  const raw=JSON.parse(storage.getItem(LOCATION_STORAGE_KEY));assert.equal(raw.address,undefined);assert.equal(raw.placeId,'test-place');
  assert.equal(readSavedLocation(storage,raw.expiresAt+1),null);assert.equal(storage.getItem(LOCATION_STORAGE_KEY),null);
  storage.setItem(LOCATION_STORAGE_KEY,'{bad json');assert.equal(readSavedLocation(storage),null);
  assert.throws(()=>saveLocation({...selected,lat:200},storage));
});
