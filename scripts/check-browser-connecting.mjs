// Scoped to the Figma notice: hold the real model request to inspect the
// connecting screen, then check readiness and its failure/retry transition.
import assert from 'node:assert/strict';
import {writeFile,stat} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';
const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
const pending=new Map(),errors=[];let id=0,held=null;
ws.onmessage=({data})=>{
  const m=JSON.parse(data);
  if(m.method==='Fetch.requestPaused')held=m.params.requestId;
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
  if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message,ms=120000){const end=Date.now()+ms;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(75);}}
async function start(){
  held=null;await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');
  await finishEntryPreview(evaluate,{confirmLocation:false});await until('document.querySelector(".entry-map")?.dataset.status==="ready"','좋아요 준비');
  assert.equal(await evaluate('document.querySelector(".entry-card [type=submit]").textContent'),'좋아요');
  await evaluate('document.querySelector(".entry-card").requestSubmit()');
  await until('document.querySelector(".entry-notice")?.dataset.step==="connecting"','접속중 안내');
  const deadline=Date.now()+30000;while(!held){assert.ok(Date.now()<deadline,'실제 모델 요청');await pause(50);}
}
async function inspect(width,height){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<650});await evaluate('document.fonts.ready');await pause(100);
  const notice=await evaluate(`(()=>{const c=document.querySelector('.entry-notice'),h=c.querySelector('h1'),b=c.getBoundingClientRect(),t=h.getBoundingClientRect(),s=getComputedStyle(c),f=getComputedStyle(h);return{text:h.textContent,box:[b.width,b.height],center:[b.x+b.width/2,b.y+b.height/2],padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,background:s.backgroundColor,blur:s.backdropFilter,font:f.fontFamily,size:f.fontSize,weight:f.fontWeight,lineHeight:f.lineHeight,color:f.color,tracking:f.letterSpacing,align:f.textAlign,textWidth:t.width,textHeight:t.height,buttons:c.querySelectorAll('button').length,map:!!document.querySelector('.entry-map'),ready:window.spaceVR.ready,entered:window.spaceVR.entered}})()`);
  assert.equal(notice.text,'공간에 접속하고 있어요');assert.equal(notice.buttons,0);assert.equal(notice.map,false);
  assert.equal(notice.box[1],notice.textHeight+80);assert.ok(Math.abs(notice.box[0]-notice.textWidth-96)<.1);
  assert.ok(notice.box[0]<=width-32);assert.equal(notice.textHeight,width>=390?36:72);
  assert.ok(Math.abs(notice.center[0]-width/2)<.1&&Math.abs(notice.center[1]-height/2)<.1,'서브픽셀 반올림 범위에서 중앙 정렬');assert.deepEqual(notice.padding,['40px','48px','40px','48px']);
  assert.equal(notice.radius,'12px');assert.equal(notice.background,'rgba(23, 24, 26, 0.6)');assert.equal(notice.blur,'blur(25px)');
  assert.equal(notice.size,'28px');assert.equal(notice.weight,'600');assert.equal(notice.lineHeight,'36px');assert.ok(notice.font.includes('Wanted Sans'));
  assert.equal(notice.color,'rgb(239, 238, 236)');assert.equal(notice.tracking,'0.04px');assert.equal(notice.align,'center');
  assert.equal(notice.ready,false);assert.equal(notice.entered,false);
  assert.ok(await evaluate('document.fonts.check(\'600 28px "Wanted Sans"\')'));
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`/private/tmp/xr-connecting-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
  return notice;
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*models/space.glb*',requestStage:'Request'}]});
  assert.ok((await stat(new URL('../public/fonts/wanted-sans/WantedSansVariable.woff2',import.meta.url))).size>0);
  await start();const desktop=await inspect(1920,1080),mobile=await inspect(390,844),short=await inspect(1280,600),narrow=await inspect(320,640);
  await send('Fetch.continueRequest',{requestId:held});await send('Fetch.disable');
  await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','실제 준비 완료 후 안내 닫기');
  assert.deepEqual(errors,[]);
  await send('Fetch.enable',{patterns:[{urlPattern:'*models/space.glb*',requestStage:'Request'}]});
  await start();await send('Fetch.failRequest',{requestId:held,errorReason:'Failed'});await send('Fetch.disable');
  await until('Boolean(document.querySelector("[data-action=retry-space]"))','접속 실패 재시도');
  assert.equal(await evaluate('document.querySelector(".entry-notice").getAttribute("aria-busy")'),'false');
  assert.equal(await evaluate('window.spaceVR.entered'),false);
  await evaluate('document.querySelector("[data-action=retry-space]").click()');await until('Boolean(document.querySelector("[name=email]"))','재시도 후 로그인');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({url,desktop,mobile,short,narrow,readyGate:'passed',retry:'passed',errors},null,2));
}finally{await send('Fetch.disable').catch(()=>{});ws.close();}
