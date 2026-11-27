import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';
const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
let id=0;const pending=new Map(),errors=[],externalMapRequests=[];
ws.onmessage=({data})=>{
  const m=JSON.parse(data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
  if(m.method==='Network.requestWillBeSent'&&/maps\.google|maps\.gstatic|maps\.googleapis/.test(m.params.request.url))externalMapRequests.push(m.params.request.url);
  if(m.method==='Fetch.requestPaused')void send('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'});
  if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message,ms=30000){const end=Date.now()+ms;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(50);}}
const ready=()=>until('document.querySelector(".entry-map")?.dataset.status==="ready"','데모 지도 준비');
const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
async function visit(){await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');await finishEntryPreview(evaluate,{confirmLocation:false});}
async function capture(name){const r=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/xr-demo-'+name+'.png',Buffer.from(r.data,'base64'));}
async function drag(dx=60,dy=20){
  const b=await evaluate('document.querySelector(".entry-map").getBoundingClientRect().toJSON()'),x=b.x+b.width/2,y=b.y+b.height/2;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+dx,y:y+dy,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+dx,y:y+dy,button:'left',clickCount:1});
}
async function checkCenter(){assert.ok(await evaluate(`(()=>{const m=document.querySelector('.entry-map').getBoundingClientRect(),p=document.querySelector('.entry-map-marker').getBoundingClientRect(),i=document.querySelector('.entry-demo-map-image').getBoundingClientRect();return Math.abs(p.x+p.width/2-m.x-m.width/2)<1&&Math.abs(p.y+p.height/2-m.y-m.height/2)<1&&i.left<=m.left&&i.right>=m.right&&i.top<=m.top&&i.bottom>=m.bottom})()`),'아이콘 중앙 정렬·지도 빈 가장자리 없음');}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.clearBrowserCache');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__geoCalls=0;const g=navigator.geolocation;for(const method of ['watchPosition','getCurrentPosition']){const original=g[method].bind(g);g[method]=(...args)=>{window.__geoCalls++;return original(...args)}}const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.__blockDemoSave&&k==='meet-join.demo-location.v1')throw new DOMException('Test quota','QuotaExceededError');return original.call(this,k,v)};`});
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await visit();await ready();
  assert.equal(await evaluate('document.querySelector(".entry-map").dataset.provider'),'demo');
  assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),false);
  assert.equal(await evaluate('document.querySelector(".entry-card").getBoundingClientRect().height'),648);
  await checkCenter();await capture('default');
  await click('reset-location');const before=await evaluate('document.querySelector(".entry-map").dataset.x');await drag();
  assert.notEqual(await evaluate('document.querySelector(".entry-map").dataset.x'),before);await checkCenter();
  await evaluate('document.querySelector(".entry-demo-viewport").focus()');
  const x=await evaluate('Number(document.querySelector(".entry-map").dataset.x)');
  await send('Input.dispatchKeyEvent',{type:'keyDown',code:'ArrowRight',key:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'ArrowRight',key:'ArrowRight'});
  assert.ok(await evaluate('Number(document.querySelector(".entry-map").dataset.x)')>x);
  await evaluate('document.querySelector("[data-demo-area=dodam]").click()');
  assert.ok((await evaluate('document.querySelector(".entry-map-address").textContent')).includes('도담동'));
  await capture('editing');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});await checkCenter();
  const b=await evaluate('document.querySelector(".entry-map").getBoundingClientRect().toJSON()'),tx=b.x+b.width/2,ty=b.y+b.height/2;
  const touchBefore=await evaluate('document.querySelector(".entry-map").dataset.x');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+35,y:ty+15}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await evaluate('document.querySelector(".entry-map").dataset.x'),touchBefore);await checkCenter();await capture('mobile');
  await send('Emulation.setTouchEmulationEnabled',{enabled:false});await drag(5000,5000);await checkCenter();
  assert.equal(await evaluate('Number(document.querySelector(".entry-map").dataset.x)'),.24);
  await evaluate('window.__blockDemoSave=true;document.querySelector(".entry-card").requestSubmit()');
  await until('document.querySelector(".entry-map")?.dataset.status==="save-error"','저장 오류');assert.equal(await evaluate('Boolean(window.spaceVR)'),false);
  await evaluate('window.__blockDemoSave=false;document.querySelector(".entry-card").requestSubmit()');
  await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','데모 확정 후 입장',120000);
  const selected=await evaluate('window.spaceVR.profile.location');assert.equal(selected.mode,'demo');assert.equal(selected.lat,undefined);assert.equal(selected.lng,undefined);
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("meet-join.demo-location.v1"))'),selected);
  assert.equal(await evaluate('window.__geoCalls'),0);
  const start=await evaluate('window.spaceVR.position');await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyW',key:'w'});await pause(600);await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyW',key:'w'});
  assert.ok(start[2]-(await evaluate('window.spaceVR.position'))[2]>.2,'입장 후 실제 이동');
  await visit();await ready();assert.equal(await evaluate('Number(document.querySelector(".entry-map").dataset.x)'),selected.x);
  await send('Fetch.enable',{patterns:[{urlPattern:'*demo-neighborhood.svg*',requestStage:'Request'}]});await send('Network.clearBrowserCache');await visit();
  await until('document.querySelector(".entry-map")?.dataset.status==="map-error"','이미지 실패 안내');assert.equal(await evaluate('document.querySelector("[type=submit]").disabled'),true);
  await send('Fetch.disable');await click('retry-demo-location');await ready();await checkCenter();
  assert.equal(await evaluate('window.__geoCalls'),0);assert.deepEqual(externalMapRequests,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,provider:'local SVG demo',drag:'passed',keyboard:'passed',touch:'passed',saveAndEnter:'passed',movement:'passed',restore:'passed',retry:'passed',externalMapRequests:externalMapRequests.length,geolocationCalls:0,errors},null,2));
}finally{await send('Fetch.disable').catch(()=>{});ws.close();}
