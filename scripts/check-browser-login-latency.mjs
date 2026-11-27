// Measure real browser text insertion and the following painted frame on a fresh login.
import assert from 'node:assert/strict';
const url = process.argv[2] ?? 'http://127.0.0.1:4173/';
const before = process.argv.includes('--baseline');
const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => { ws.onopen = resolve; });
let id = 0; const pending = new Map();
ws.onmessage = ({data}) => { const m = JSON.parse(data); if (!m.id) return; const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); };
function send(method, params = {}) { return new Promise((resolve, reject) => { const request = ++id; pending.set(request, {resolve,reject}); ws.send(JSON.stringify({id:request,method,params})); }); }
async function evaluate(expression) { const r = await send('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true}); assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails)); return r.result.value; }
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
try {
  await send('Page.enable'); await send('Network.enable'); await send('Network.clearBrowserCache');
  await send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__loginLongTasks=[]; new PerformanceObserver(list => window.__loginLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});`});
  await send('Page.navigate', {url});
  const deadline = Date.now()+20000;
  while (!(await evaluate('Boolean(document.querySelector("[name=email]"))'))) { assert.ok(Date.now()<deadline); await pause(10); }
  await evaluate('document.querySelector("[name=email]").focus()');
  const samples=[]; let expected='';
  // Keep sending input during startup, including model completion and GPU work.
  for(let i=0;i<40;i++) {
    const letter=String.fromCharCode(97+i%26); expected+=letter;
    const start=performance.now();
    await send('Input.insertText',{text:letter});
    const value=await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(document.querySelector("[name=email]").value))))');
    assert.equal(value,expected,'처음 입력한 문자부터 빠짐없이 표시');
    samples.push(Math.round(performance.now()-start)); await pause(75);
  }
  // Password has the same immediate display behavior (masked by the browser).
  await evaluate('document.querySelector("[name=password]").focus()');
  const start=performance.now(); await send('Input.insertText',{text:'preview-only'});
  assert.equal(await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(document.querySelector("[name=password]").value))))'),'preview-only');
  samples.push(Math.round(performance.now()-start));
  const state=await evaluate(`({canvas:document.querySelectorAll('canvas').length,sceneRequests:performance.getEntriesByType('resource').filter(e=>['/src/main.js','models/space.glb','assets/main-'].some(part=>e.name.includes(part))).map(e=>e.name),longTasks:window.__loginLongTasks})`);
  console.log(JSON.stringify({url,samplesMs:samples,maxMs:Math.max(...samples),...state},null,2));
  if(!before) {
    assert.ok(Math.max(...samples)<250,'입력과 화면 반영이 250ms 이내여야 합니다.');
    assert.equal(state.canvas,0,'입력 중 WebGL 초기화 금지');
    assert.equal(state.sceneRequests.length,0,'입력 중 무거운 공간 모듈 실행 금지');
  }
} finally { ws.close(); }
