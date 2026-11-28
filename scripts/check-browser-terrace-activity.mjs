import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';

const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
let id=0;const pending=new Map(),errors=[],held=new Set();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(expression,message){const end=Date.now()+120000;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(40);}}
const snapshot=()=>evaluate('window.spaceVR.terraceActivity');
async function keys(next){
  const key=code=>code==='Escape'?'Escape':code.startsWith('Shift')?'Shift':code.slice(-1).toLowerCase();
  for(const code of [...held])if(!next.includes(code)){await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:key(code)});held.delete(code);}
  for(const code of next)if(!held.has(code)){await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:key(code)});held.add(code);}
}
async function walkTo(x,z){
  const end=Date.now()+15000;let last=null,movedAt=Date.now();
  while(true){
    const p=await evaluate('window.spaceVR.position'),dx=x-p[0],dz=z-p[2];
    if(Math.hypot(dx,dz)<.075){await keys([]);return;}
    if(!last||Math.hypot(p[0]-last[0],p[2]-last[2])>.015){last=p;movedAt=Date.now();}
    assert.ok(Date.now()<end&&Date.now()-movedAt<2500,`실제 이동 막힘 ${p} -> ${x},${z}`);
    const next=['ShiftLeft'];if(Math.abs(dx)>.03)next.push(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.03)next.push(dz>0?'KeyS':'KeyW');
    await keys(next);await pause(25);
  }
}
async function lookDirection(direction){
  const current=(await snapshot()).direction;
  const yaw=Math.atan2(-direction[0],-direction[2]),pitch=Math.asin(direction[1]);
  const oldYaw=Math.atan2(-current[0],-current[2]),oldPitch=Math.asin(current[1]);
  const delta=Math.atan2(Math.sin(yaw-oldYaw),Math.cos(yaw-oldYaw));
  const x=960-delta/.0022,y=540+(oldPitch-pitch)/.0022;
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:960,y:540,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});await pause(80);
}
async function lookAt(point){const eye=(await snapshot()).eye,d=point.map((v,i)=>v-eye[i]),l=Math.hypot(...d);await lookDirection(d.map(v=>v/l));}
async function click(point){const [x,y]=point;assert.ok(x>0&&x<1920&&y>0&&y<1080,`화면 안 클릭 위치 ${point}`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}
async function shot(name){await evaluate('document.fonts.ready');const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`/private/tmp/xr-terrace-${name}.png`,Buffer.from(r.data,'base64'));}
const angle=s=>Math.atan2(s.position[2],s.position[0]);
async function approach(seat){
  await lookDirection([0,-Math.sin(.12),-Math.cos(.12)]);
  const p=await evaluate('window.spaceVR.position'),from=Math.atan2(p[2],p[0]),to=angle(seat),count=Math.ceil(Math.abs(to-from)/.035),radius=Math.hypot(seat.position[0],seat.position[2])+1.25;
  for(let i=1;i<=Math.max(1,count);i++){const a=from+(to-from)*i/Math.max(1,count);await walkTo(Math.cos(a)*radius,Math.sin(a)*radius);}
  await lookAt([seat.position[0],seat.position[1]+.46,seat.position[2]]);
  assert.equal((await snapshot()).phase,'standing','시점 드래그만으로 앉지 않음');
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');await finishEntryPreview(evaluate);
  await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','공간 입장');
  await keys(['KeyW']);await until('Boolean(document.querySelector("[data-tutorial-step=plaza]"))','광장');await keys([]);
  await evaluate('document.querySelector("[data-tutorial-action=next]").click();document.querySelector("[data-tutorial-action=close]").click()');
  const seats=(await snapshot()).seats;
  const primary=seats.filter(s=>s.tier===0&&s.type==='single').sort((a,b)=>Math.abs(angle(a)-110*Math.PI/180)-Math.abs(angle(b)-110*Math.PI/180))[0];
  const ordered=[primary,...seats.filter(s=>s.tier===0&&s.id!==primary.id).sort((a,b)=>Math.abs(angle(a)-angle(primary))-Math.abs(angle(b)-angle(primary))).slice(0,2)];
  await click(primary.screen);assert.equal((await snapshot()).phase,'standing','멀리 있는 의자를 클릭해도 원격으로 앉지 않음');
  await walkTo(0,14.85);
  const results=[];
  for(const [index,seat] of ordered.entries()){
    await approach(seat);
    if(index===0){
      await until('Boolean(document.querySelector("[data-tutorial-step=sit-hint]"))','의자 접근 안내');
      const hint=await evaluate(`(()=>{const r=document.querySelector('[data-tutorial-step="sit-hint"]'),c=r.querySelector('.entry-card'),b=c.getBoundingClientRect(),s=getComputedStyle(c),h=getComputedStyle(c.querySelector('h1'));return {box:[b.width,b.height],text:c.innerText,padding:[s.paddingTop,s.paddingRight],font:[h.fontFamily,h.fontSize,h.fontWeight,h.lineHeight],background:s.backgroundColor,blur:s.backdropFilter,pointer:getComputedStyle(r).pointerEvents,overlays:document.querySelectorAll('.space-tutorial-overlay').length};})()`);
      assert.deepEqual(hint.box,[423,116]);assert.equal(hint.text,'의자를 누르면 앉을 수 있어요.');assert.deepEqual(hint.padding,['40px','48px']);assert.ok(hint.font[0].includes('Wanted Sans'));assert.deepEqual(hint.font.slice(1),['28px','600','36px']);assert.equal(hint.background,'rgba(23, 24, 26, 0.6)');assert.equal(hint.blur,'blur(25px)');assert.equal(hint.pointer,'none');assert.equal(hint.overlays,1);
      await shot('sit-hint');
      await evaluate(`window.__guideTiming={};window.__guideObserver=new MutationObserver(()=>{const shown=Boolean(document.querySelector('[data-tutorial-step="crossroads-content"]')),t=window.__guideTiming;if(shown&&!t.opened)t.opened=performance.now();if(!shown&&t.opened&&!t.closed)t.closed=performance.now();});window.__guideObserver.observe(document.body,{childList:true});`);
    }else assert.equal(await evaluate('Boolean(document.querySelector("[data-tutorial-step=sit-hint]"))'),false,'앉기 안내 접속 중 한 번');
    const before=await snapshot(),standing=await evaluate('window.spaceVR.position');
    if(index===0){
      const table=seat.position.map((v,i)=>v+seat.facing[i]*.61);table[1]=seat.position[1]+.79;
      await lookAt(table);await click([960,540]);assert.equal((await snapshot()).phase,'standing','책상을 클릭해도 의자에 앉지 않음');
      await lookAt([seat.position[0],seat.position[1]+.46,seat.position[2]]);
    }
    await click((await snapshot()).seats.find(s=>s.id===seat.id).screen);
    await until('window.spaceVR.terraceActivity.phase!=="standing"&&window.spaceVR.terraceActivity.phase!=="seating"','의자 실제 클릭 후 앉기');
    const seated=await snapshot();assert.equal(seated.seatId,seat.id);assert.ok(Math.abs(seated.eye[1]-seat.position[1]-1.225)<.015);assert.ok(before.eye[1]-seated.eye[1]>.4);
    if(index===0){
      assert.equal(seated.phase,'guide');assert.equal(seated.crafts.filter(c=>c.visible).length,0);
      const guide=await evaluate(`(()=>{const r=document.querySelector('[data-tutorial-step="crossroads-content"]'),c=r.querySelector('.entry-card'),b=c.getBoundingClientRect(),s=getComputedStyle(c),p=getComputedStyle(c.querySelector('p'));return {box:[b.width,b.height],title:c.querySelector('h1').textContent,body:c.querySelector('p').textContent,font:[p.fontSize,p.fontWeight,p.lineHeight],padding:[s.paddingTop,s.paddingRight],position:s.position,transform:s.transform,pointer:getComputedStyle(r).pointerEvents,overlays:document.querySelectorAll('.space-tutorial-overlay').length};})()`);
      assert.deepEqual(guide.box,[594,154]);assert.equal(guide.title,'원하는 것을 골라보세요');assert.equal(guide.body,'관심있는 콘텐츠를 즐겨보세요. 타인과 대화도 할수있어요.');assert.deepEqual(guide.font,['18px','400','26px']);assert.deepEqual(guide.padding,['40px','48px']);assert.equal(guide.position,'absolute');assert.equal(guide.pointer,'none');assert.equal(guide.overlays,1);
      await shot('content-guide');
      await until('window.spaceVR.terraceActivity.phase==="choices"','안내 종료 후 3가지 공예품 표시');
      const timing=await evaluate('window.__guideTiming');assert.ok(timing.closed-timing.opened>=4990&&timing.closed-timing.opened<5600);await evaluate('window.__guideObserver.disconnect()');
    }else assert.equal(seated.phase,'choices','다른 의자에서는 같은 내용 튜토리얼 반복 없음');
    const choices=await snapshot();assert.equal(choices.crafts.filter(c=>c.visible).length,3);if(index===0)await shot('three-crafts');
    const selected=['knitting','blocks','beads'][index],pick=choices.crafts.find(c=>c.id===selected);
    await click(pick.screen);await until(`window.spaceVR.terraceActivity.choice===${JSON.stringify(selected)}`,'공예품 실제 클릭 선택');
    const after=await snapshot();assert.deepEqual(after.crafts.filter(c=>c.visible).map(c=>c.id),[selected]);await shot('selected-'+selected);
    await click(choices.crafts.find(c=>c.id!==selected).screen);assert.equal((await snapshot()).choice,selected,'숨겨진 제품은 선택되지 않음');
    await keys(['Escape']);await pause(60);await keys([]);assert.equal((await snapshot()).phase,'standing');assert.equal((await snapshot()).crafts.filter(c=>c.visible).length,0);
    const back=await evaluate('window.spaceVR.position');assert.ok(Math.hypot(...back.map((v,i)=>v-standing[i]))<.02,'실제 기존 통행 위치로 일어나기');
    results.push({seatId:seat.id,selected,standingEye:before.eye[1],seatedEye:seated.eye[1],clicked:true});
  }
  await approach(primary);await click((await snapshot()).seats.find(s=>s.id===primary.id).screen);
  await until('window.spaceVR.terraceActivity.phase==="selected"','원래 자리에서 선택 유지');assert.equal((await snapshot()).choice,'knitting');
  await keys(['KeyS']);await pause(100);await keys([]);assert.equal((await snapshot()).phase,'standing','이동 키로도 일어남');
  await lookDirection([0,-Math.sin(.12),-Math.cos(.12)]);
  const p=await evaluate('window.spaceVR.position'),from=Math.atan2(p[2],p[0]),steps=Math.ceil(Math.abs(from-Math.PI/2)/.035);
  for(let i=1;i<=steps;i++){const a=from+(Math.PI/2-from)*i/steps;await walkTo(Math.cos(a)*14.85,Math.sin(a)*14.85);}
  await walkTo(0,17.65);
  const upper=seats.filter(s=>s.tier===1&&s.type==='single').sort((a,b)=>Math.abs(angle(a)-104*Math.PI/180)-Math.abs(angle(b)-104*Math.PI/180))[0];
  await approach(upper);await click((await snapshot()).seats.find(s=>s.id===upper.id).screen);
  await until('window.spaceVR.terraceActivity.phase==="choices"','위층 의자에도 앉아서 공예품 표시');
  const upperView=await snapshot();assert.ok(Math.abs(upperView.eye[1]-upper.position[1]-1.225)<.015);
  await click(upperView.crafts.find(c=>c.id==='beads').screen);await until('window.spaceVR.terraceActivity.choice==="beads"','위층에서 비즈 선택');
  assert.deepEqual((await snapshot()).crafts.filter(c=>c.visible).map(c=>c.id),['beads']);await shot('upper-tier-beads');
  await keys(['KeyR']);await pause(60);await keys([]);assert.equal((await snapshot()).phase,'standing');
  assert.ok((await evaluate('window.spaceVR.position'))[2]>25,'앉은 상태에서 R키로 정상 입구 복귀');assert.equal((await snapshot()).crafts.filter(c=>c.visible).length,0);
  results.push({seatId:upper.id,selected:'beads',tier:2,seatedEye:upperView.eye[1],clicked:true});
  assert.equal(await evaluate('document.pointerLockElement'),null);assert.equal(await evaluate('document.querySelector("canvas").inert'),false);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,results,realPointerClicks:true,bothTiers:true,farAndTableClicksIgnored:true,allThreeSelections:true,standAndResume:true,perConnectionHints:true,errors},null,2));
}finally{await keys([]);ws.close();}
