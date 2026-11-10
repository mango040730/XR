import { Engine } from '../engine/core/Engine';
import { indoorFishing } from '../worlds/indoor-fishing/config';
import { FishingHUD } from '../ui/FishingHUD';
import '../ui/service.css';
import '../ui/figma/fix-generated.css';
import '../ui/figma-fix.css';
import '../ui/first-fix.css';
import { element } from '../components/designSystem';
import { renderSpaceNavigation } from '../ui/FixScreens';
import { FISHING_UI_VISIBLE } from '../worlds/indoor-fishing/presentation';
const host=document.querySelector<HTMLElement>('#app')!;
document.body.classList.add('fishing-page');document.title='고요낚시 · 나무와 물 사이';
const viewport=document.createElement('main');viewport.className='fishing-viewport';viewport.setAttribute('aria-label','고요낚시 3D 실내 낚시터');host.append(viewport);
const vr=document.createElement('div');
export let engine:Engine|undefined,hud:FishingHUD|undefined,detach:(()=>void)|undefined;
const lifecycle=new AbortController();
const navigation=element('div','first-fix-standalone-navigation figma-fix');
if(!FISHING_UI_VISIBLE){
  navigation.append(renderSpaceNavigation('모드 선택','nav:modes'));host.append(navigation);
  navigation.addEventListener('click',()=>location.assign(`${import.meta.env.BASE_URL}#modes`),{signal:lifecycle.signal});
}
let disposed=false;
const cleanup=()=>{if(disposed)return;disposed=true;lifecycle.abort();navigation.remove();detach?.();hud?.dispose();void engine?.dispose();};
try{
  engine=new Engine(viewport,vr,[indoorFishing]);hud=new FishingHUD(host,engine,vr);
  if(import.meta.env.DEV&&import.meta.env.MODE==='e2e'){
    const {attachEngineDiagnostics}=await import('../dev/engineDiagnostics');detach=attachEngineDiagnostics(engine).dispose;
  }
  await engine.enterWorld(indoorFishing.id);
  if(engine.worlds.state.status==='error')throw new Error(engine.worlds.state.error??'공간 준비 실패');
}catch(error){const p=document.createElement('p');p.className='fishing-error';p.setAttribute('role','alert');p.textContent=String(error);host.append(p);}
if(import.meta.hot)import.meta.hot.dispose(()=>{cleanup();viewport.remove();document.body.classList.remove('fishing-page');});
window.addEventListener('pagehide',cleanup,{once:true,signal:lifecycle.signal});
