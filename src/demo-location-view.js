import {DEMO_AREAS,demoSelection,readDemoSelection,saveDemoSelection} from './demo-location.js';

export function demoLocationMarkup(asset) {
  return `<div class="entry-map" data-provider="demo" role="group" aria-label="데모 동네 지도"><div class="entry-demo-viewport" tabindex="0" role="group" aria-label="위치 재설정 후 드래그하거나 방향키로 지도를 이동하세요"><img class="entry-demo-map-image" src="${asset('demo-neighborhood.svg')}" alt="한빛동과 중앙공원, 새봄동과 도담동을 표시한 가상 동네 지도" draggable="false"></div><div class="entry-map-shade" aria-hidden="true"></div><img class="entry-map-marker" src="${asset('map-marker.svg')}" alt="선택한 데모 위치" width="24" height="24" hidden><span class="entry-demo-badge">DEMO</span><div class="entry-demo-areas" role="group" aria-label="데모 동네 선택" hidden>${DEMO_AREAS.map(area=>`<button type="button" data-demo-area="${area.id}" aria-pressed="false">${area.name}</button>`).join('')}</div><div class="entry-map-state" role="status" aria-live="polite"><span class="entry-map-message">지도를 준비하고 있어요…</span><button type="button" data-action="retry-demo-location" hidden>다시 시도</button></div><p class="entry-map-address" aria-live="polite" hidden></p><p class="entry-demo-caption">미리보기용 지도 · 실제 위치를 사용하지 않아요</p></div><div class="entry-actions"><button class="entry-button" type="submit" disabled>좋아요</button><button class="entry-button secondary" type="button" data-action="reset-location" disabled>위치 재설정</button></div>`;
}

export function mountDemoLocationView(root,{onConfirm}) {
  const panel=root.querySelector('.entry-map'),viewport=root.querySelector('.entry-demo-viewport'),image=root.querySelector('.entry-demo-map-image');
  const marker=root.querySelector('.entry-map-marker'),address=root.querySelector('.entry-map-address'),areas=root.querySelector('.entry-demo-areas');
  const submit=root.querySelector('[type=submit]'),reset=root.querySelector('[data-action=reset-location]');
  const status=root.querySelector('.entry-map-state'),message=root.querySelector('.entry-map-message'),retry=root.querySelector('[data-action=retry-demo-location]');
  let selected=readDemoSelection(),editing=false,loaded=false,saving=false,confirmed=false,disposed=false,drag=null,attempt=0;
  function update() {
    panel.dataset.x=String(selected.x);panel.dataset.y=String(selected.y);panel.dataset.mode=editing?'manual':'preview';
    image.style.transform=`translate(${-selected.x*100}%,${-selected.y*100}%)`;
    marker.hidden=!loaded;address.hidden=!loaded;address.textContent=selected.label;
    areas.hidden=!editing;viewport.classList.toggle('is-editing',editing&&!confirmed);
    areas.querySelectorAll('button').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.demoArea===selected.areaId));button.disabled=saving||confirmed;});
    submit.disabled=!loaded||saving||confirmed;reset.disabled=!loaded||saving||confirmed;
  }
  function select(x,y) {
    if(!loaded||saving||confirmed||disposed)return;
    selected=demoSelection(x,y);panel.dataset.status='ready';status.hidden=true;update();
  }
  async function load() {
    const current=++attempt;loaded=false;panel.dataset.status='loading';panel.setAttribute('aria-busy','true');status.hidden=false;retry.hidden=true;message.textContent='지도를 준비하고 있어요…';update();
    try {
      await image.decode();if(disposed||current!==attempt)return;
      loaded=true;panel.dataset.status='ready';panel.setAttribute('aria-busy','false');status.hidden=true;update();
    }catch{
      if(disposed||current!==attempt)return;
      panel.dataset.status='map-error';panel.setAttribute('aria-busy','false');message.textContent='지도를 불러오지 못했어요. 다시 시도해 주세요.';retry.hidden=false;update();
    }
  }
  function click(event) {
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='reset-location'&&loaded&&!confirmed&&!saving){editing=true;update();viewport.focus({preventScroll:true});}
    const area=DEMO_AREAS.find(item=>item.id===event.target.closest('[data-demo-area]')?.dataset.demoArea);
    if(area&&editing)select(area.x,area.y);
    if(action==='retry-demo-location'){image.src=`${image.src.split('?')[0]}?retry=${attempt}`;void load();}
  }
  function down(event) {
    if(!editing||!loaded||saving||confirmed||event.button!==0)return;
    event.preventDefault();viewport.focus({preventScroll:true});
    const bounds=viewport.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,start:selected,width:bounds.width,height:bounds.height};
    viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');
  }
  function move(event) {
    if(!drag||drag.id!==event.pointerId)return;
    select(drag.start.x-(event.clientX-drag.x)/(drag.width*2.4),drag.start.y-(event.clientY-drag.y)/(drag.height*2.4));
  }
  function up(event) {
    if(!drag||drag.id!==event.pointerId)return;
    if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
    drag=null;viewport.classList.remove('is-dragging');
  }
  function key(event) {
    if(!editing)return;
    const delta={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[event.key];
    if(delta){event.preventDefault();select(selected.x+delta[0],selected.y+delta[1]);}
  }
  root.addEventListener('click',click);viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move);
  viewport.addEventListener('pointerup',up);viewport.addEventListener('pointercancel',up);viewport.addEventListener('keydown',key);
  void load();
  return {
    async confirm() {
      if(!loaded||saving||confirmed||disposed)return;
      saving=true;submit.textContent='위치를 저장하고 있어요…';update();
      try {
        const value={...selected,confirmedAt:new Date().toISOString()};saveDemoSelection(value);
        selected=value;confirmed=true;panel.dataset.status='confirmed';status.hidden=true;update();await onConfirm(value);
      }catch{
        if(!disposed){panel.dataset.status='save-error';status.hidden=false;retry.hidden=true;message.textContent='위치를 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 눌러 주세요.';}
      }finally{saving=false;if(!disposed){if(!confirmed)submit.textContent='좋아요';update();}}
    },
    dispose() {
      if(disposed)return;disposed=true;attempt++;
      root.removeEventListener('click',click);viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);
      viewport.removeEventListener('pointerup',up);viewport.removeEventListener('pointercancel',up);viewport.removeEventListener('keydown',key);
    },
  };
}
