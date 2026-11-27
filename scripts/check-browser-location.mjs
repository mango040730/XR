import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';
import {mapsFixturePattern,mapsFixtureSource} from './helpers/maps-fixture.mjs';
const url=process.argv[2]??'http://127.0.0.1:4173/';
let missingKey=process.argv.includes('--missing-key'),searchQuery='테스트 동네';
const fixture=!missingKey&&!process.argv.includes('--live');
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
const pending=new Map(),errors=[];let id=0,failSDK=false;
ws.onmessage=({data})=>{
  const m=JSON.parse(data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
  if(m.method==='Fetch.requestPaused')void(failSDK?send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'}):send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:Buffer.from(mapsFixtureSource).toString('base64')}));
  if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message,ms=30000){const end=Date.now()+ms;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(50);}}
const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
const ready=()=>until('document.querySelector(".entry-map")?.dataset.status==="ready"','위치·주소 준비');
async function visit(){await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');await finishEntryPreview(evaluate,{confirmLocation:false});}
async function shot(name){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/xr-location-'+name+'.png',Buffer.from(r.data,'base64'));}
async function drag(){
  const b=await evaluate('document.querySelector(".entry-map").getBoundingClientRect().toJSON()');
  const x=b.x+b.width/2,y=b.y+b.height/2;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+60,y:y+20,button:'left',buttons:1});
  assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true,'드래그 중에는 확정 금지');
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+60,y:y+20,button:'left',clickCount:1});
}
async function search(){await evaluate('document.querySelector("[name=location-search]").value='+JSON.stringify(searchQuery));await click('search-location');await ready();}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.clearBrowserCache');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__geoQA={started:0,cleared:[]};const g=navigator.geolocation,w=g.watchPosition.bind(g),c=g.clearWatch.bind(g);g.watchPosition=(...args)=>{window.__geoQA.started++;return w(...args)};g.clearWatch=id=>{window.__geoQA.cleared.push(id);return c(id)};const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__locationSaveBlocked&&k==='meet-join.location.v1')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v)};`});
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Browser.grantPermissions',{origin:new URL(url).origin,permissions:['geolocation']});
  await send('Emulation.setGeolocationOverride',{latitude:37.56,longitude:126.97,accuracy:12});
  if(fixture)await send('Fetch.enable',{patterns:[mapsFixturePattern]});
  await visit();
  if(!fixture&&!missingKey){
    await until('document.querySelector(".entry-map")?.dataset.status==="ready"||document.querySelector(".entry-map")?.dataset.status==="map-error"','Google Maps 연결 상태');
    missingKey=await evaluate('document.querySelector(".entry-map")?.dataset.error==="MISSING_API_KEY"');
  }
  if(missingKey){
    await until('document.querySelector(".entry-map")?.dataset.error==="MISSING_API_KEY"','미설정 키 안내');
    assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);
    assert.equal(await evaluate('Boolean(window.spaceVR)'),false);
    assert.equal(await evaluate('document.querySelector("[data-action=retry-location]").hidden'),false);
    await shot('missing-key');console.log(JSON.stringify({url,missingKey:'correctly blocks confirmation',errors}));
  }else{
    await ready();await shot('gps');
    if(!fixture)searchQuery=await evaluate('document.querySelector(".entry-map-address").textContent');
    const dimensions=await evaluate(`(()=>{const map=document.querySelector('.entry-map').getBoundingClientRect(),marker=document.querySelector('.entry-map-marker').getBoundingClientRect(),shade=getComputedStyle(document.querySelector('.entry-map-shade')),card=document.querySelector('.entry-card').getBoundingClientRect();return{card:[card.width,card.height],delta:[marker.x+marker.width/2-map.x-map.width/2,marker.y+marker.height/2-map.y-map.height/2],mask:shade.maskImage,clip:shade.clipPath}})()`);
    assert.deepEqual(dimensions.card,[594,648]);assert.ok(dimensions.delta.every(v=>Math.abs(v)<1));assert.ok(dimensions.mask.includes('radial-gradient'));assert.ok(dimensions.clip.includes('40px'));
    await send('Emulation.setGeolocationOverride',{latitude:37.561,longitude:126.971,accuracy:10});
    if(fixture)await until('window.__mapsFixture.maps[0].center.lat===37.561','GPS 실시간 반영');
    await ready();await click('reset-location');
    assert.ok((await evaluate('window.__geoQA.cleared.length'))>0,'수동 모드에서 실제 Geolocation watch 해제');
    await drag();await ready();
    if(fixture){
      const manual=await evaluate('window.__mapsFixture.maps[0].center');
      await send('Emulation.setGeolocationOverride',{latitude:38,longitude:127,accuracy:10});await pause(700);
      assert.deepEqual(await evaluate('window.__mapsFixture.maps[0].center'),manual,'수동 선택은 GPS로 덮어쓰지 않음');
      await evaluate('window.__mapsFixture.failGeocode=true');await drag();
      await until('document.querySelector(".entry-map")?.dataset.status==="geocode-error"','주소 오류 처리');
      assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);
      await evaluate('window.__mapsFixture.failGeocode=false');await click('retry-location');await ready();
    }
    await search();await shot('manual');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(300);await shot('mobile');
    assert.ok(await evaluate(`(()=>{const m=document.querySelector('.entry-map').getBoundingClientRect(),p=document.querySelector('.entry-map-marker').getBoundingClientRect(),c=document.querySelector('.entry-card').getBoundingClientRect();return Math.abs(p.x+p.width/2-m.x-m.width/2)<1&&Math.abs(p.y+p.height/2-m.y-m.height/2)<1&&c.left>=0&&c.right<=innerWidth&&c.bottom<=innerHeight})()`));
    await evaluate('window.__locationSaveBlocked=true;document.querySelector(".entry-card").requestSubmit()');
    await until('document.querySelector(".entry-map")?.dataset.status==="save-error"','저장 오류 처리');
    assert.equal(await evaluate('Boolean(window.spaceVR)'),false,'저장 실패 때 진입 금지');
    await evaluate('window.__locationSaveBlocked=false;document.querySelector(".entry-card").requestSubmit()');
    await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','저장 후 실제 3D 입장',120000);
    const profile=await evaluate('window.spaceVR.profile');assert.ok(Number.isFinite(profile.location.lat)&&profile.location.address);
    const stored=await evaluate('JSON.parse(localStorage.getItem("meet-join.location.v1"))');
    assert.equal(stored.lat,profile.location.lat);assert.equal(stored.lng,profile.location.lng);assert.equal(stored.address,undefined);
    if(fixture){
      await evaluate('localStorage.removeItem("meet-join.location.v1")');
      await send('Browser.setPermission',{permission:{name:'geolocation'},setting:'denied',origin:new URL(url).origin});
      await visit();await until('document.querySelector(".entry-map")?.dataset.error==="PERMISSION_DENIED"','위치 권한 거부');
      assert.equal(await evaluate('window.__mapsFixture.maps.length'),0,'권한 거부 때 기본 좌표 지도 없음');
      assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);await shot('permission-denied');
      await search();await send('Browser.grantPermissions',{origin:new URL(url).origin,permissions:['geolocation']});
      await send('Emulation.setGeolocationOverride',{latitude:37.56,longitude:126.97,accuracy:12});await click('current-location');await ready();
      failSDK=true;await visit();await until('document.querySelector(".entry-map")?.dataset.status==="map-error"','SDK 로딩 실패');
      assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);
      failSDK=false;await click('retry-location');await ready();await shot('sdk-retry');
      await evaluate('window.gm_authFailure()');
      await until('document.querySelector(".entry-map")?.dataset.error==="MAP_AUTH_FAILED"','SDK 인증 실패 처리');
      assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);
      await click('retry-location');await until('Boolean(document.querySelector("[name=email]"))','SDK 인증 오류 후 재시도');
      await finishEntryPreview(evaluate,{confirmLocation:false});await ready();
      const count=await evaluate('window.__geoQA.cleared.length');
      await evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide"))');
      assert.ok((await evaluate('window.__geoQA.cleared.length'))>count,'화면 이탈 이벤트에서 실제 watch 해제');
      assert.equal(await evaluate('[...window.__mapsFixture.maps[0].events.values()].reduce((n,set)=>n+set.size,0)'),0,'지도 이벤트 정리');
      await send('Page.navigate',{url});
      await until('Boolean(document.querySelector("[name=email]"))','화면 이탈 후 로그인');
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({url,mode:fixture?'SDK test double + native Chrome Geolocation overrides':'live Google SDK + simulated GPS',dimensions,savedProfile:!!profile.location.address,manual:'passed',permissionDenial:fixture?'passed':'not simulated',retry:'passed',storageFailure:'passed',errors},null,2));
  }
}finally{await send('Fetch.disable').catch(()=>{});await send('Browser.resetPermissions').catch(()=>{});ws.close();}
