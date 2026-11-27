import './space-tutorial.css';
import {createPlazaTutorialState} from './plaza-tutorial-state.js';
import {createCrossroadsTutorialState} from './crossroads-tutorial-state.js';
import {createRelationshipTutorialState} from './relationship-tutorial-state.js';

export function createSpaceTutorial({layout,onModalChange}) {
  const state=createPlazaTutorialState(layout);
  const notices=[
    {id:'crossroads',state:createCrossroadsTutorialState(layout),title:'이곳은 교차로입니다!',body:'각자 편안한 시간을 보내다가 합석할 수 있는 곳이에요.'},
    {id:'relationship',state:createRelationshipTutorialState(layout),title:'이곳은 관계의 방입니다!',body:'원하는 콘텐츠, 원하는 사람들과 모임을 가져보세요.'},
  ];
  let root=null,timedRoot=null,currentNotice=null,disposed=false;
  function updateNoticeTime(){
    if(currentNotice?.state.tick(performance.now(),!document.hidden)){
      timedRoot?.remove();timedRoot=null;currentNotice=null;
    }
  }
  document.addEventListener('visibilitychange',updateNoticeTime);
  function showNotice(notice){
    currentNotice=notice;timedRoot=document.createElement('section');
    timedRoot.className=`entry-overlay space-tutorial-overlay timed-tutorial-overlay ${notice.id}-tutorial-overlay`;
    timedRoot.dataset.tutorialStep=notice.id;
    timedRoot.setAttribute('role','status');timedRoot.setAttribute('aria-live','polite');
    timedRoot.setAttribute('aria-atomic','true');
    timedRoot.innerHTML=`<div class="entry-card space-tutorial-card timed-tutorial-card ${notice.id}-tutorial-card"><div class="space-tutorial-copy"><h1>${notice.title}</h1><p class="space-tutorial-body">${notice.body}</p></div></div>`;
    document.body.append(timedRoot);updateNoticeTime();
  }
  const button=(label,action,secondary=false)=>`<button class="entry-button${secondary?' secondary':''}" type="button" data-tutorial-action="${action}">${label}</button>`;
  function render(){
    if(!root){
      root=document.createElement('section');root.className='entry-overlay space-tutorial-overlay';
      root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','space-tutorial-title');
      root.addEventListener('click',click);root.addEventListener('keydown',key);document.body.append(root);
    }
    root.dataset.tutorialStep=state.phase;
    if(state.phase==='calendar'){
      root.removeAttribute('aria-describedby');
      root.innerHTML=`<div class="entry-card entry-notice"><h1 id="space-tutorial-title" tabindex="-1">캘린더 기능은 준비 중이에요.</h1><div class="entry-actions">${button('알겠어요','close')}</div></div>`;
    }else{
      const plaza=state.phase==='plaza';root.setAttribute('aria-describedby','space-tutorial-body');
      const title=plaza?'이곳은 광장입니다!':'[작당모의]를 알려드릴게요.';
      const body=plaza?'자유롭게 돌아다니고, 원하는 사람과 대화해 보세요.<br>잘 맞는 사람과는 [작당모의]를 할 수도 있어요.':'실제로 만남을 이어갈 수 있도록 돕는 기능이에요.<br>이후 캘린더에서 확인할 수도 있어요.';
      const actions=plaza?button('작당모의가 뭐예요?','next'):button('캘린더 보기','calendar',true)+button('알겠어요','close');
      root.innerHTML=`<div class="entry-card space-tutorial-card"><div class="space-tutorial-copy"><h1 id="space-tutorial-title" tabindex="-1">${title}</h1><p id="space-tutorial-body" class="space-tutorial-body">${body}</p></div><div class="entry-actions space-tutorial-actions">${actions}</div></div>`;
    }
    root.querySelector('h1').focus({preventScroll:true});
  }
  function close(){
    if(!state.dismiss())return;
    root?.remove();root=null;onModalChange(false);
  }
  function click(event){
    const action=event.target.closest('[data-tutorial-action]')?.dataset.tutorialAction;
    if(action==='next'&&state.next())render();
    else if(action==='calendar'&&state.calendar())render();
    else if(action==='close')close();
  }
  function key(event){
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const buttons=[...root.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    if(event.shiftKey&&index<=0){event.preventDefault();buttons.at(-1).focus();}
    else if(!event.shiftKey&&(index<0||index===buttons.length-1)){event.preventDefault();buttons[0].focus();}
  }
  return {
    get active(){return state.active;},
    observe(position){
      if(disposed)return;
      updateNoticeTime();
      // Observe every region even while a prior notice is reading so a quick
      // crossing is queued, with its own full reading time and no overlap.
      for(const notice of notices)notice.state.observe(position);
      if(currentNotice||state.active)return;
      const pending=notices.find(notice=>notice.state.active);
      if(pending){showNotice(pending);return;}
      if(state.observe(position)){onModalChange(true);render();}
    },
    dispose(){
      if(disposed)return;disposed=true;if(state.active)close();root?.remove();root=null;
      for(const notice of notices)notice.state.dispose();
      timedRoot?.remove();timedRoot=null;currentNotice=null;
      document.removeEventListener('visibilitychange',updateNoticeTime);
    },
  };
}
