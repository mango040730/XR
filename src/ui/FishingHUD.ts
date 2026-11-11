import type { Engine } from '../engine/core/Engine';
import { sessions } from '../worlds/indoor-fishing/runtime';
import type { FishingSession } from '../worlds/indoor-fishing/runtime';
import { CATCH_WAIT_LABEL } from '../worlds/indoor-fishing/fishSpecies';
import { seats } from '../worlds/indoor-fishing/layout';
import { FISHING_UI_VISIBLE } from '../worlds/indoor-fishing/presentation';
import './fishing.css';
import './neumorphic.css';
export class FishingHUD {
  private el=document.createElement('div');
  private events=new AbortController();
  private cleanups:Array<()=>void>=[];
  private session?:FishingSession;
  private enabled = true;
  private stopState?:()=>void;
  private direction={right:0,forward:0};
  private touch:{x:number;y:number}|null=null;
  constructor(host:HTMLElement,private engine:Engine,vrHost?:HTMLElement,options:{touchLook?:boolean}={}){
    this.el.className=FISHING_UI_VISIBLE?'fishing-hud':'fishing-hud is-space-only';this.el.hidden=true;
    if(FISHING_UI_VISIBLE)this.el.innerHTML=`<header class="fh-header"><a class="fh-brand" href="?fishing" aria-label="고요낚시 시작"><span class="fh-symbol" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 10c4-5 7 5 12 0s8 0 10 0M5 16c4-5 7 5 12 0s8 0 10 0M5 22c4-5 7 5 12 0s8 0 10 0"/></svg></span><span>고요낚시<small>QUIET WATER</small></span></a><div class="fh-location"><i></i> 실내 낚시터 <span>저녁, 나무와 물 사이</span></div><div class="fh-tools"><button data-do="home" title="시작 위치로" aria-label="시작 위치로"><span class="fh-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></svg></span><span>시작 위치</span></button><button data-help aria-expanded="false" aria-controls="fishing-guide" aria-label="이용 안내" title="이용 안내"><span class="fh-button-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 1.9-2.5 3.7M12 16.5h.01"/></svg></span><span>이용 안내</span></button><div data-vr></div></div></header>
    <aside class="fh-info"><span class="fh-eyebrow">A MOMENT BY THE WATER</span><h1>잠시, 물결 곁에.</h1><p>서두르지 않아도 괜찮아요.<br>빈 자리에 앉아 낚시를 시작해 보세요.</p><div class="fh-occupancy"><span data-free></span><span>총 12석</span><span data-catches>0마리</span></div></aside>
    <div class="fh-crosshair" aria-hidden="true"></div>
    <section class="fh-guide" id="fishing-guide" aria-label="고요낚시 이용 안내" hidden><div><strong>고요낚시 이용 안내</strong><button data-close aria-label="안내 닫기">×</button></div><p>WASD 또는 방향키로 바로 이동하고, 마우스를 드래그해 둘러보세요.</p><p><kbd>W A S D</kbd> 이동  <kbd>마우스 드래그</kbd> 시점<br><kbd>E</kbd> 가까운 빈 자리 착석  <kbd>F</kbd> 투입·회수<br><kbd>Q</kbd> 일어나기  <kbd>Esc</kbd> 메뉴</p><p>VR: 왼쪽 스틱 앞으로 유지 후 놓기 → 바닥으로 이동<br>오른쪽 스틱 → 30° 회전 · 트리거 → 의자·낚싯대 선택<br>착석 후 눈앞의 초록 패널에서 투입·회수·일어나기</p><p>찌를 투입하면 ${CATCH_WAIT_LABEL} 사이에 물고기가 잡혀요.<br>회수하거나 일어나면 대기가 취소됩니다.</p><p data-xr></p><label><input type="checkbox" role="switch" data-samples checked> 시연용 낚시 인물 5명</label><label><input type="checkbox" role="switch" data-low> 가벼운 그래픽 (물·발광 효과 축소)</label><div class="fh-review"><button data-do="review">전체 구도 보기</button><button data-do="opposite">반대편 보기</button></div><small>로컬 체험 · 실시간 접속자 연결 없음</small></section>
    <div class="fh-touch"><button data-move="forward" aria-label="앞으로 이동">↑</button><div><button data-move="left" aria-label="왼쪽 이동">←</button><button data-move="back" aria-label="뒤로 이동">↓</button><button data-move="right" aria-label="오른쪽 이동">→</button></div></div>
    <footer class="fh-footer"><div class="fh-notice"><span class="fh-seat" data-seat>둘러보기</span><p data-message role="status">공간을 준비하고 있습니다.</p></div><div class="fh-actions"><button class="fh-stand" data-do="stand" hidden>일어나기 <kbd>Q</kbd></button><button class="fh-primary" data-primary>가까운 빈 자리에 앉기 <kbd>E</kbd></button></div><div class="fh-keys"><span><kbd>W A S D</kbd> 이동</span><span>마우스 드래그 시점</span><span><kbd>ESC</kbd> 메뉴</span><span class="fh-local">LOCAL EXPERIENCE</span></div></footer>`;
    host.append(this.el);if(vrHost)this.el.querySelector('[data-vr]')?.append(vrHost);
    const opts={signal:this.events.signal};
    this.el.addEventListener('click',e=>{
      const target=(e.target as HTMLElement).closest<HTMLElement>('button');if(!target)return;
      if(target.hasAttribute('data-help')||target.hasAttribute('data-close')){const guide=this.el.querySelector<HTMLElement>('.fh-guide')!;guide.hidden=!guide.hidden;this.el.querySelector('[data-help]')?.setAttribute('aria-expanded',String(!guide.hidden));}
      if(target.dataset.do)this.session?.perform(target.dataset.do);
      if(target.hasAttribute('data-primary'))this.session?.perform(this.session.state.user.seatId?'cast':'nearest');
    },opts);
    this.el.querySelector('[data-samples]')?.addEventListener('change',()=>this.session?.perform('samples'),opts);
    this.el.querySelector('[data-low]')?.addEventListener('change',()=>this.session?.perform('quality'),opts);
    window.addEventListener('keydown',e=>{
      if(!this.enabled||!this.session||engine.xr.state.active||(e.target as HTMLElement).matches('input,textarea,select'))return;
      const key=e.key.toLowerCase();if(['e','f','q'].includes(key)&&!e.repeat){e.preventDefault();this.session.perform(key==='e'?'nearest':key==='f'?'cast':'stand');}
    },opts);
    for(const button of this.el.querySelectorAll<HTMLElement>('[data-move]')){
      button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);const d=button.dataset.move;this.direction={right:d==='left'?-1:d==='right'?1:0,forward:d==='forward'?1:d==='back'?-1:0};},opts);
      button.addEventListener('pointerup',()=>this.clearTouch(),opts);button.addEventListener('pointercancel',()=>this.clearTouch(),opts);
    }
    const canvas=engine.rendering.webgl.domElement;
    canvas.addEventListener('pointerdown',e=>{if(options.touchLook!==false&&this.enabled&&this.session&&!engine.xr.state.active&&e.pointerType==='touch')this.touch={x:e.clientX,y:e.clientY};},opts);
    canvas.addEventListener('pointermove',e=>{if(options.touchLook!==false&&this.enabled&&this.session&&e.pointerType==='touch'&&this.touch&&!engine.xr.state.active){engine.player.look((e.clientX-this.touch.x)*2,(e.clientY-this.touch.y)*2);this.touch={x:e.clientX,y:e.clientY};}},opts);
    canvas.addEventListener('pointerup',()=>this.touch=null,opts);canvas.addEventListener('pointercancel',()=>this.touch=null,opts);
    window.addEventListener('blur',()=>this.clearTouch(),opts);document.addEventListener('visibilitychange',()=>this.clearTouch(),opts);
    this.cleanups.push(engine.frames.subscribe(({delta})=>{if(this.enabled&&this.session&&!engine.xr.state.active&&engine.worlds.state.status==='ready')engine.player.update(this.direction,delta);}),engine.worlds.changes.subscribe(()=>this.bind()),engine.xr.changes.subscribe(()=>{this.clearTouch();this.update();}),engine.interactions.hints.subscribe(hint=>{if(FISHING_UI_VISIBLE&&this.session&&!this.session.state.user.seatId&&hint)this.el.querySelector('[data-message]')!.textContent=hint;}));
    this.bind();
  }
  private clearTouch(){this.direction={right:0,forward:0};this.touch=null;}
  private bind(){
    const root=this.engine.worlds.active?.root,session=root?sessions.get(root):undefined;
    if(session!==this.session){this.stopState?.();this.session=session;this.stopState=session?.state.changes.subscribe(()=>this.update());}
    this.update();
  }
  private update(){
    const s=this.session;this.el.hidden=!this.enabled||!s||this.engine.xr.state.active||this.engine.worlds.state.status==='loading';if(!s||!FISHING_UI_VISIBLE)return;
    const seated=!!s.state.user.seatId,cast=s.state.user.fishing==='cast',caught=s.state.user.fishing==='caught';this.el.classList.toggle('is-seated',seated);
    this.el.querySelector('[data-seat]')!.textContent=seated?`${s.state.user.seatId}번 자리`: '둘러보기';
    this.el.querySelector('[data-message]')!.textContent=s.message;
    this.el.querySelector('[data-catches]')!.textContent=`오늘 ${s.state.user.catchCount}마리`;
    this.el.querySelector('[data-free]')!.textContent=`${seats.length-s.state.occupancy.size}석 이용 가능`;
    this.el.querySelector('[data-primary]')!.innerHTML=seated?`${cast?'낚싯줄 회수하기':caught?'다시 낚시하기':'찌 투입하기'} <kbd>F</kbd>`:'가까운 빈 자리에 앉기 <kbd>E</kbd>';
    (this.el.querySelector('[data-do="stand"]') as HTMLElement).hidden=!seated;
    (this.el.querySelector('[data-samples]') as HTMLInputElement).checked=s.state.samples;(this.el.querySelector('[data-low]') as HTMLInputElement).checked=s.state.low;
    this.el.querySelector('[data-xr]')!.textContent=this.engine.xr.state.reason;
  }
  setEnabled(enabled:boolean){this.enabled=enabled;if(!enabled)this.clearTouch();this.update();}
  get handlesTouch():boolean{return this.enabled&&!!this.session;}
  get spaceOnly():boolean{return !!this.session&&!FISHING_UI_VISIBLE;}
  cancel(){if(this.session?.state.user.seatId)this.session.perform('stand');}
  dispose(){this.events.abort();this.stopState?.();this.cleanups.forEach(f=>f());this.el.remove();}
}
