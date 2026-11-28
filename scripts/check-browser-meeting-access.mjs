import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {finishEntryPreview} from './helpers/entry-flow.mjs';
import {gatheringStepBoundary} from '../src/gathering-floor.js';
const url=process.argv[2]??'http://127.0.0.1:4173/';
const target=(await(await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
assert.ok(target,'별도 테스트 Chrome 페이지 필요');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.onopen=resolve);
const pending=new Map(),errors=[],held=new Set();let id=0;
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);};
function send(method,params={}){return new Promise((resolve,reject)=>{const request=++id;pending.set(request,{resolve,reject});ws.send(JSON.stringify({id:request,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(expression,message){const end=Date.now()+120000;while(!await evaluate(expression)){assert.ok(Date.now()<end,message+': '+errors.join('\n'));await pause(75);}}
async function keys(next){
  for(const code of [...held])if(!next.includes(code)){await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code.slice(-1).toLowerCase()});held.delete(code);}
  for(const code of next)if(!held.has(code)){await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code.slice(-1).toLowerCase()});held.add(code);}
}
async function walkTo(x,z){
  const deadline=Date.now()+12000;let last=null,movedAt=Date.now();
  while(true){
    const p=await evaluate('window.spaceVR.position'),dx=x-p[0],dz=z-p[2];
    if(Math.hypot(dx,dz)<.085){await keys([]);return p;}
    if(!last||Math.hypot(p[0]-last[0],p[2]-last[2])>.015){last=p;movedAt=Date.now();}
    assert.ok(Date.now()<deadline&&Date.now()-movedAt<2200,`실제 이동 막힘: ${p} -> ${x},${z}`);
    const next=[];if(Math.abs(dx)>.035)next.push(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.035)next.push(dz>0?'KeyS':'KeyW');
    await keys(next);await pause(25);
  }
}
async function shot(name){const s=await send('Page.captureScreenshot',{format:'png'});await writeFile('/private/tmp/xr-meeting-'+name+'.png',Buffer.from(s.data,'base64'));}
async function circuit(name,x,z,radius){
  console.log(`${name} 의자 뒤 순환 시작`);
  await walkTo(x,z+radius);const start=await evaluate('window.spaceVR.position');
  for(let i=1;i<=72;i++){const a=i*Math.PI/36;await walkTo(x+Math.sin(a)*radius,z+Math.cos(a)*radius);}
  const end=await evaluate('window.spaceVR.position');
  assert.ok(Math.hypot(start[0]-end[0],start[2]-end[2])<.18,`${name} 의자 뒤 한 바퀴 연속 통행`);
  return {start,end,fullCircuit:true};
}
try{
  await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url});await until('Boolean(document.querySelector("[name=email]"))','로그인');await finishEntryPreview(evaluate);
  await until('window.spaceVR?.entered&&!document.getElementById("entry-root")','입장');
  await keys(['KeyW']);await until('Boolean(document.querySelector("[data-tutorial-step=plaza]"))','광장 안내');await keys([]);
  await evaluate('document.querySelector("[data-tutorial-action=next]").click();document.querySelector("[data-tutorial-action=close]").click()');
  await walkTo(0,11);await walkTo(0,8);
  if(process.argv.includes('--lower-passage')){
    const lanePoint=z=>{
      const slope=(gatheringStepBoundary(z+.001)-gatheringStepBoundary(z-.001))/.002,n=Math.hypot(1,slope);
      return {x:gatheringStepBoundary(z)-.72/n,z:z+.72*slope/n};
    };
    const end=lanePoint(6);await walkTo(end.x,end.z);const samples=[];
    for(const sign of [-1,1])for(let i=0;i<=20;i++){
      const p=lanePoint(sign===-1?6-i*.15:3+i*.15),actual=await walkTo(p.x,p.z);samples.push(actual);
      assert.ok(Math.abs(actual[1]-1.175)<.012,`단차 아래 바닥을 따라 이동: ${actual}`);
    }
    const view=lanePoint(3),look=lanePoint(5);await walkTo(view.x,view.z);
    await until('!document.querySelector(".space-tutorial-overlay")','안내 종료 후 낮은 통로 확인');
    const yaw=Math.atan2(view.x-look.x,view.z-look.z),dragX=960-yaw/.0022;
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:960,y:540});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:960,y:540,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragX,y:604,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragX,y:604,button:'left',clickCount:1});
    await pause(250);await shot('lower-passage');assert.deepEqual(errors,[]);
    console.log(JSON.stringify({url,lowerPassage:true,bothDirections:true,samples:samples.length,footHeight:[Math.min(...samples.map(p=>p[1])),Math.max(...samples.map(p=>p[1]))],errors},null,2));
  }else if(process.argv.includes('--three-three-floor')){
    await walkTo(-1.8,4.5);await walkTo(-2.4,1.2);await walkTo(-4.6,0);await walkTo(-4.6,-4);
    await pause(350);const forum=await evaluate('window.spaceVR.position');
    assert.ok(Math.abs(forum[1]-1.175)<.008,'계단형 가구 안은 단차 없는 낮은 바닥');
    await walkTo(-4.6,0);await walkTo(-2.9,1.2);await pause(350);
    const lower=await evaluate('window.spaceVR.position');assert.ok(Math.abs(lower[1]-1.175)<.008);
    await walkTo(-1.9,1.2);await pause(350);const upper=await evaluate('window.spaceVR.position');
    // Rig height damps while walking and stops updating when keys are released;
    // the exact surface height is checked by the model raycasts in unit tests.
    assert.ok(Math.abs(upper[1]-1.455)<.045&&upper[1]-lower[1]>.22,`곡선 경계의 높은 바닥: ${JSON.stringify({lower,upper})}`);
    await walkTo(-2.9,1.2);await pause(350);const returned=await evaluate('window.spaceVR.position');
    assert.ok(Math.abs(returned[1]-1.175)<.008,'새 단차를 내려서 돌아올 수 있음');
    await walkTo(-1.9,1.2);await until('!document.querySelector(".space-tutorial-overlay")','안내 종료 후 단차 확인');
    const yaw=Math.atan2(2.7,5.5),dragX=960-yaw/.0022;
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:960,y:540});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:960,y:540,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragX,y:622,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragX,y:622,button:'left',clickCount:1});
    await pause(250);await shot('three-three-floor');assert.deepEqual(errors,[]);
    console.log(JSON.stringify({url,forum,lower,upper,returned,bidirectionalStep:true,errors},null,2));
  }else if(process.argv.includes('--inward-sofa')){
    await walkTo(1.6,8);await walkTo(5.5,7);await walkTo(5.5,4.9);
    const direction={x:-8/Math.hypot(8,2.5),z:-2.5/Math.hypot(8,2.5)};
    const view={x:8+direction.x*3,z:2.5+direction.z*3};
    await walkTo(view.x,view.z);
    await walkTo(8+direction.x*1.1,2.5+direction.z*1.1);const inside=await evaluate('window.spaceVR.position');
    await walkTo(view.x,view.z);await until('!document.querySelector(".space-tutorial-overlay")',' 안내 종료 후 소파 확인');
    const yaw=Math.atan2(-8,-2.5),dragX=960-yaw/.0022;
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:960,y:540});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:960,y:540,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragX,y:613,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragX,y:613,button:'left',clickCount:1});
    await pause(250);await shot('inward-sofa');assert.deepEqual(errors,[]);
    assert.equal(await evaluate('document.pointerLockElement'),null);
    console.log(JSON.stringify({url,inwardSofa:true,actualEntranceMovement:true,inside,errors},null,2));
  }else if(process.argv.includes('--coffee-table')||process.argv.includes('--reverse-lounge')){
    await walkTo(-3,10);await walkTo(-5.2,9);await walkTo(-5.2,7.3);
    const inside=await evaluate('window.spaceVR.position');assert.ok(inside[2]<7.4&&inside[2]>7.2,'반대쪽 새 입구로 진입');
    await walkTo(-5.2,9);
    await until('!document.querySelector(".space-tutorial-overlay")','안내 종료 후 낮은 테이블 확인');
    // Use the ordinary drag-to-look interaction to face the lounge opening.
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:960,y:540});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:960,y:540,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:960,y:645,button:'left',buttons:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:960,y:645,button:'left',clickCount:1});
    await pause(250);await shot('reverse-lounge');
    const position=await evaluate('window.spaceVR.position');
    assert.ok(Math.hypot(position[0]+5.2,position[2]-9)<.1);
    assert.equal(await evaluate('document.pointerLockElement'),null);assert.deepEqual(errors,[]);
    console.log(JSON.stringify({url,coffeeTableView:true,reverseLounge:true,actualEntranceMovement:true,inside,actualKeyboardMovement:true,position,errors},null,2));
  }else{
  await walkTo(1.6,8);await walkTo(1.6,4.25);await until('!document.querySelector(".space-tutorial-overlay")','안내 종료 후 가구 확인');await shot('ten-seat-entrance');
  const ten=await circuit('10인 모듈',1.6,.4,2.44);
  await walkTo(1.6,4.25);await walkTo(0,4.8);await walkTo(-1.8,4.5);await walkTo(-2.4,1.2);await walkTo(-.5,-3.5);await walkTo(4.8,-3.5);
  await pause(200);await shot('six-seat-entrance');const six=await circuit('6인 모듈',4.8,-6,2.125);
  assert.deepEqual(errors,[]);assert.equal(await evaluate('document.pointerLockElement'),null);
  console.log(JSON.stringify({url,ten,six,actualKeyboardMovement:true,errors},null,2));
  }
}finally{await keys([]);ws.close();}
