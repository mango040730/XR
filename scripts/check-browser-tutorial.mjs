import assert from 'node:assert/strict';
import {writeFile,stat} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';
const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
const pending=new Map(),errors=[];let id=0;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message){const end=Date.now()+120000;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(75);}}
async function key(code,key,ms=600){await send('Input.dispatchKeyEvent',{type:'keyDown',code,key});await pause(ms);await send('Input.dispatchKeyEvent',{type:'keyUp',code,key});await pause(100);}
const click=action=>evaluate(`document.querySelector('[data-tutorial-action="${action}"]').click()`);
async function start(){await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');await finishEntryPreview(evaluate);await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','공간 입장');}
async function capture(name){await evaluate('document.fonts.ready');const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/xr-tutorial-'+name+'.png',Buffer.from(shot.data,'base64'));}
async function inspect(step){
  const view=await evaluate(`(()=>{const r=document.querySelector('.space-tutorial-overlay'),c=r.querySelector('.space-tutorial-card'),h=c.querySelector('h1'),p=c.querySelector('p'),a=c.querySelector('.space-tutorial-actions'),b=c.getBoundingClientRect(),s=getComputedStyle(c),title=getComputedStyle(h),body=getComputedStyle(p);return{step:r.dataset.tutorialStep,box:[b.width,b.height],center:[b.x+b.width/2,b.y+b.height/2],padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],background:s.backgroundColor,radius:s.borderRadius,blur:s.backdropFilter,gap:s.rowGap,copyGap:getComputedStyle(c.querySelector('.space-tutorial-copy')).rowGap,title:[title.fontFamily,title.fontWeight,title.fontSize,title.lineHeight,title.color,title.letterSpacing],body:[body.fontWeight,body.fontSize,body.lineHeight,body.color],buttons:[...a.querySelectorAll('button')].map(button=>{const q=button.getBoundingClientRect(),s=getComputedStyle(button);return{text:button.textContent,width:q.width,height:q.height,weight:s.fontWeight,color:s.color,background:s.backgroundColor,border:s.borderTopColor}}),buttonGap:getComputedStyle(a).columnGap,canvasInert:document.querySelector('canvas').inert};})()`);
  assert.equal(view.step,step);assert.deepEqual(view.box,[594,256]);assert.ok(Math.abs(view.center[0]-960)<.1&&Math.abs(view.center[1]-540)<.1);
  assert.deepEqual(view.padding,['40px','48px','40px','48px']);assert.equal(view.background,'rgba(23, 24, 26, 0.6)');assert.equal(view.radius,'12px');assert.equal(view.blur,'blur(25px)');
  assert.equal(view.gap,'24px');assert.equal(view.copyGap,'12px');assert.ok(view.title[0].includes('Wanted Sans'));
  assert.deepEqual(view.title.slice(1),['600','28px','36px','rgb(239, 238, 236)','0.04px']);assert.deepEqual(view.body,['400','18px','26px','rgb(239, 238, 236)']);
  assert.equal(view.canvasInert,true);assert.equal(view.buttonGap,'11px');
  view.buttons.forEach(b=>{assert.equal(b.height,52);assert.equal(b.weight,'500');});
  if(step==='plaza'){assert.equal(view.buttons[0].text,'작당모의가 뭐예요?');assert.equal(view.buttons[0].width,498);}
  else{assert.deepEqual(view.buttons.map(b=>b.text),['캘린더 보기','알겠어요']);assert.ok(view.buttons.every(b=>b.width===243.5));assert.equal(view.buttons[0].background,'rgba(0, 0, 0, 0)');assert.equal(view.buttons[0].border,'rgba(255, 255, 255, 0.2)');}
  await capture(step);return view;
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  assert.ok((await stat(new URL('../public/fonts/wanted-sans/WantedSansVariable.woff2',import.meta.url))).size>0);
  await start();await pause(600);assert.equal(await evaluate('Boolean(document.querySelector(".space-tutorial-overlay"))'),false,'정지한 입구에서는 안내 없음');
  await key('KeyW','w',180);assert.equal(await evaluate('Boolean(document.querySelector(".space-tutorial-overlay"))'),false,'블루레일 밖 짧은 이동에서는 안내 없음');
  await key('KeyW','w',800);await until('document.querySelector(".space-tutorial-overlay")?.dataset.tutorialStep==="plaza"','실제 블루레일 입성');
  const position=await evaluate('window.spaceVR.position');assert.ok(Math.hypot(position[0],position[2])<25.5&&Math.hypot(position[0],position[2])>20.9);
  const plaza=await inspect('plaza');await key('KeyS','s',500);assert.deepEqual(await evaluate('window.spaceVR.position'),position,'안내 중 이동 중지');
  await click('next');const gathering=await inspect('gathering');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});
  assert.equal(await evaluate('document.activeElement.dataset.tutorialAction'),'calendar','키보드 포커스는 안내 내부 유지');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(150);await capture('mobile-gathering');
  assert.ok(await evaluate(`(()=>{const b=document.querySelector('.space-tutorial-card').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight})()`));
  await click('close');assert.equal(await evaluate('Boolean(document.querySelector(".space-tutorial-overlay"))'),false);assert.equal(await evaluate('document.activeElement===document.querySelector("canvas")'),true);
  assert.equal(await evaluate('document.pointerLockElement'),null);await key('KeyS','s',250);assert.ok((await evaluate('window.spaceVR.position'))[2]>position[2]+.1,'닫은 후 클릭 없이 이동 재개');
  await key('KeyR','r',30);await key('KeyW','w',900);assert.equal(await evaluate('Boolean(document.querySelector(".space-tutorial-overlay"))'),false,'재진입 반복 없음');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});await start();await key('KeyW','w',900);await until('document.querySelector(".space-tutorial-overlay")?.dataset.tutorialStep==="plaza"','새 접속의 안내');
  await click('next');await click('calendar');assert.equal(await evaluate('document.querySelector(".space-tutorial-overlay").dataset.tutorialStep'),'calendar');
  assert.equal(await evaluate('document.querySelector("#space-tutorial-title").textContent'),'캘린더 기능은 준비 중이에요.');await capture('calendar');await click('close');
  assert.equal(await evaluate('Boolean(document.querySelector(".space-tutorial-overlay"))'),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,trigger:'real blue-rail entry',plaza,gathering,mobile:'passed',sequence:'passed',pauseAndResume:'passed',oncePerSession:'passed',calendarNotice:'passed',errors},null,2));
}finally{ws.close();}
