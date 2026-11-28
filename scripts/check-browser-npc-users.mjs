import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';

const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
let id=0;const pending=new Map(),errors=[],held=new Set();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value??a.description??'').join(' '));if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);}};
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
async function shot(name){await evaluate('document.fonts.ready');const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(`/private/tmp/xr-npc-${name}.png`,Buffer.from(r.data,'base64'));}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  for(const [index,name] of [[1,'마이'],[2,'시론']]){
    await send('Page.navigate',{url});if(index===1)errors.length=0;await until('Boolean(document.querySelector("[name=email]"))','로그인');
    await finishEntryPreview(evaluate,{avatar:index,stopAtNickname:true});
    assert.equal(await evaluate('document.querySelector("[name=nickname]").value'),name);
    assert.equal(await evaluate('Boolean(window.spaceVR)'),false,'닉네임 화면에서 무거운 NPC/공간을 미리 실행하지 않음');
  }
  await evaluate('document.querySelector(".entry-card").requestSubmit()');
  await until('document.querySelector(".entry-map")?.dataset.status==="ready"','동네 데모 준비');await evaluate('document.querySelector(".entry-card").requestSubmit()');
  await until('window.spaceVR?.entered&&window.spaceVR?.npcs?.loaded===4','네 원본 GLB 로딩 및 공간 입장');
  const initial=await evaluate('window.spaceVR.npcs');assert.deepEqual(initial.characters.map(c=>c.name),['롤리','마이','시론','뮤티']);
  assert.equal(await evaluate('window.spaceVR.profile.nickname'),'시론');
  await keys(['KeyW']);await until('Boolean(document.querySelector("[data-tutorial-step=plaza]"))','광장 첫 진입');await keys([]);
  await evaluate('document.querySelector("[data-tutorial-action=next]").click();document.querySelector("[data-tutorial-action=close]").click()');
  await walkTo(0,14.85);assert.ok(Math.abs((await evaluate('window.spaceVR.position'))[1]-2.075)<.2,'클릭 없이 두 층을 실제 보행해 NPC 활동 구역 진입');
  const samples=[];
  for(let i=0;i<16;i++){
    const data=await evaluate('window.spaceVR.npcs');samples.push(data.characters);
    for(const c of data.characters){assert.ok(Math.hypot(c.position[0],c.position[2])>=14.74&&Math.hypot(c.position[0],c.position[2])<=23.91,'중앙 원형 공간에 들어가지 않음');assert.equal(c.height,1.35);}
    if(i%5===0)console.log(JSON.stringify({sample:i,distances:data.characters.map(c=>Math.round(c.distance*10)/10)}));
    await pause(1000);
  }
  samples.at(-1).forEach((c,i)=>assert.ok(c.distance-initial.characters[i].distance>3,'네 NPC 모두 실제 프레임에서 자유 이동'));
  const nearest=samples.at(-1).slice().sort((a,b)=>Math.hypot(a.position[0],a.position[2]-14.85)-Math.hypot(b.position[0],b.position[2]-14.85))[0];
  await lookAt([nearest.position[0],nearest.position[1]+1.35,nearest.position[2]]);
  await until('Array.from(document.querySelectorAll(".npc-nameplate")).some(e=>!e.hidden)','머리 위 닉네임 표시');
  await evaluate('document.fonts.ready');
  const style=await evaluate(`(()=>{const e=Array.from(document.querySelectorAll('.npc-nameplate')).find(e=>!e.hidden),s=getComputedStyle(e),b=e.getBoundingClientRect();return {text:e.textContent,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,spacing:s.letterSpacing,padding:[s.paddingTop,s.paddingRight],radius:s.borderRadius,bg:s.backgroundColor,blur:s.backdropFilter,box:[b.width,b.height],pointer:getComputedStyle(e.parentElement).pointerEvents};})()`);
  assert.ok(style.font.includes('Wanted Sans'));assert.equal(style.size,'14px');assert.equal(style.weight,'500');assert.equal(style.line,'20px');assert.equal(style.spacing,'0.04px');assert.deepEqual(style.padding,['8px','24px']);assert.equal(style.radius,'12px');assert.equal(style.bg,'rgba(23, 24, 26, 0.6)');assert.equal(style.blur,'blur(25px)');assert.equal(style.pointer,'none');assert.equal(style.box[1],36);assert.ok(Math.abs(style.box[0]-73)<1.5);
  await shot('moving-nameplates');
  let devCloseupShots=false;
  if(await evaluate('Boolean(window.__spaceQA)')){
    devCloseupShots=true;
    for(const name of ['롤리','마이','시론','뮤티']){
      await evaluate(`(()=>{const q=window.__spaceQA,a=q.scene.getObjectByName(${JSON.stringify('NPC_'+name)}),p=a.position,theta=a.rotation.y;q.rig.rotation.set(0,0,0);q.rig.position.set(p.x+Math.sin(theta)*3.5,p.y,p.z+Math.cos(theta)*3.5);q.camera.position.set(0,1.65,0);q.camera.lookAt(p.x,p.y+.82,p.z);})()`);
      await pause(120);await shot('closeup-'+name);
    }
  }
  await keys(['KeyR']);await pause(80);await keys([]);assert.ok((await evaluate('window.spaceVR.position'))[2]>25);
  assert.equal(await evaluate('document.pointerLockElement'),null);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({url,correctedNicknames:true,actualGlbs:4,actualKeyboardWalk:true,allMoving:true,centralExcluded:true,nameplate:style,devCloseupShots,errors},null,2));
}finally{await keys([]);ws.close();}
