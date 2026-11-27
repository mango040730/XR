import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { finishEntryPreview } from './helpers/entry-flow.mjs';
import { mapsFixturePattern, mapsFixtureSource } from './helpers/maps-fixture.mjs';
const url=process.argv[2]??'http://127.0.0.1:4173/', fixture=process.argv.includes('--maps-fixture');
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
const pending=new Map(),errors=[];let id=0;
ws.onmessage=({data})=>{
  const m=JSON.parse(data);
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
  if(m.method==='Fetch.requestPaused')void send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'}],body:Buffer.from(mapsFixtureSource).toString('base64')});
  if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message){const end=Date.now()+30000;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(50);}}
const submit=()=>evaluate('document.querySelector(".entry-card").requestSubmit()');
const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
async function fill(values){await evaluate(`(()=>{const f=document.querySelector('.entry-card');for(const [k,v] of Object.entries(${JSON.stringify(values)})){f.elements[k].value=v;f.elements[k].dispatchEvent(new Event('input',{bubbles:true}));}})()`);}
async function visit(){await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');}
async function capture(name){await evaluate('document.fonts.ready');await evaluate(`Promise.all([...document.querySelectorAll('#entry-root img')].filter(i=>!i.closest('[hidden],.entry-google-map')).map(i=>i.decode()))`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/xr-fields-'+name+'.png',Buffer.from(shot.data,'base64'));}
async function checkError(name,expected=true){
  const data=await evaluate(`(()=>{const i=document.querySelector('[name="${name}"]'),e=i.closest('.entry-field').querySelector('.entry-field-error'),s=getComputedStyle(i);return{invalid:i.getAttribute('aria-invalid'),message:e.textContent,hidden:e.hidden,border:s.borderTopColor,color:getComputedStyle(e).color,described:i.getAttribute('aria-describedby'),id:e.id,below:e.getBoundingClientRect().top>=i.getBoundingClientRect().bottom};})()`);
  assert.equal(data.invalid,expected?'true':'false');assert.equal(data.hidden,!expected);
  if(expected){assert.ok(data.message&&data.below);assert.equal(data.border,'rgb(255, 54, 54)');assert.equal(data.color,'rgb(255, 54, 54)');assert.equal(data.described,data.id);}
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.clearBrowserCache');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  if(fixture){await send('Fetch.enable',{patterns:[mapsFixturePattern]});await send('Browser.grantPermissions',{origin:new URL(url).origin,permissions:['geolocation']});await send('Emulation.setGeolocationOverride',{latitude:37.56,longitude:126.97,accuracy:12});}
  await visit();assert.equal(await evaluate('document.querySelector(".entry-card").noValidate'),true);
  await submit();await checkError('email');await checkError('password');await capture('login-empty');
  await fill({email:'invalid-email',password:'   '});await submit();await checkError('email');await checkError('password');
  await fill({email:'preview@example.com',password:'preview'});await checkError('email',false);await checkError('password',false);await submit();
  await submit();for(const name of ['name','birth','phone','code'])await checkError(name);await capture('identity-empty');
  await fill({name:'   ',birth:'20000231',phone:'abcdefghi',code:'12a'});await submit();for(const name of ['name','birth','phone','code'])await checkError(name);
  await fill({name:'미리보기',birth:'20000101',phone:'010-1234-5678',code:'123456'});for(const name of ['name','birth','phone','code'])await checkError(name,false);
  assert.equal(await evaluate('document.querySelector("[name=birth]").value'),'2000.01.01');
  await submit();await until('document.querySelector(".entry-card")?.dataset.step==="avatar"','아바타');await submit();
  assert.equal(await evaluate('document.querySelector("[name=nickname]").value'),'롤리');
  await fill({nickname:''});await submit();await checkError('nickname');await capture('nickname-empty');
  await fill({nickname:'a'.repeat(21)});await submit();await checkError('nickname');
  await fill({nickname:'내 닉네임'});await checkError('nickname',false);assert.equal(await evaluate('document.querySelector("[name=nickname]").value'),'내 닉네임');
  for(const [index,name] of ['롤리','시론','마이','뮤티'].entries()){
    await visit();await finishEntryPreview(evaluate,{avatar:index,stopAtNickname:true});
    assert.equal(await evaluate('document.querySelector("[name=nickname]").value'),name);
    const style=await evaluate(`(()=>{const s=getComputedStyle(document.querySelector('[name=nickname]'));return{background:s.backgroundColor,border:s.borderTopColor,padding:s.paddingLeft}})()`);
    assert.deepEqual(style,{background:'rgba(0, 0, 0, 0)',border:'rgba(255, 255, 255, 0.2)',padding:'16px'});
    await capture('nickname-'+(index+1));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await fill({nickname:''});await submit();await checkError('nickname');await capture('mobile-nickname-error');
  assert.ok(await evaluate(`(()=>{const i=document.querySelector('[name=nickname]').getBoundingClientRect(),e=document.querySelector('#entry-error-nickname').getBoundingClientRect(),b=document.querySelector('[type=submit]').getBoundingClientRect();return i.left>=0&&i.right<=innerWidth&&e.bottom<=b.top;})()`),'모바일에서도 오류 문구와 버튼이 겹치지 않음');
  if(fixture){
    await fill({nickname:'뮤티'});await submit();await until('document.querySelector(".entry-map")?.dataset.status==="ready"','위치 준비');await click('reset-location');
    const before=await evaluate('window.__mapsFixture.requests.length');await click('search-location');await checkError('location-search');
    assert.equal(await evaluate('window.__mapsFixture.requests.length'),before,'빈 검색어는 API 요청하지 않음');
    await fill({'location-search':'동네 검색'});await checkError('location-search',false);await click('search-location');await until('document.querySelector(".entry-map")?.dataset.status==="ready"','검색 성공');
    await evaluate('window.__mapsFixture.failGeocode=true');await click('search-location');await until('document.querySelector(".entry-map")?.dataset.error==="SEARCH_FAILED"','주소 검색 실패');await checkError('location-search');await capture('map-search-error');
    await evaluate('window.__mapsFixture.failGeocode=false');await fill({'location-search':'다른 동네'});await click('search-location');await until('document.querySelector(".entry-map")?.dataset.status==="ready"','검색 오류 회복');await checkError('location-search',false);
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url,nicknames:['롤리','시론','마이','뮤티'],inlineErrors:'passed',correction:'passed',mobile:'passed',mapSearch:fixture?'test SDK passed':'not part of this run',errors},null,2));
}finally{await send('Fetch.disable').catch(()=>{});if(fixture)await send('Browser.resetPermissions').catch(()=>{});ws.close();}
