import './social.css';
import { element } from '../components/designSystem';
import type { SocialClient } from './SocialClient';
import type { SpatialVoice } from './SpatialVoice';
export class SocialUI {
  readonly root=element('aside','social-ui fix-frame');
  private events=new AbortController();private stops:Array<()=>void>;
  private panel=element('div','social-panel');
  private status=element('span','social-status');private error=element('p','social-error');
  private joinForm=element('form','social-join');private nickname=element('input');
  private tools=element('div','social-actions');private chatPanel=element('section','social-chat');
  private log=element('ol','social-log');private chatInput=element('input');
  private mic:HTMLButtonElement;private muteButton:HTMLButtonElement;private seatButton:HTMLButtonElement;private waveButton:HTMLButtonElement;
  private cancel:HTMLButtonElement;private chatToggle:HTMLButtonElement;
  constructor(host:HTMLElement,private client:SocialClient,private voice:SpatialVoice,callbacks:{join(name:string):void;wave():void;seat():void;leave():void}){
    this.root.setAttribute('aria-label','실시간 소셜');const panel=this.panel;
    this.status.setAttribute('role','status');this.error.setAttribute('role','status');
    const label=element('label','','닉네임');this.nickname.name='nickname';this.nickname.maxLength=24;this.nickname.required=true;this.nickname.setAttribute('autocomplete','nickname');this.nickname.value=sessionStorage.getItem('xr-social-nickname')??'';label.append(this.nickname);
    const join=this.button('입장','social-join',()=>{});join.type='submit';
    this.cancel=this.button('연결 취소','social-cancel',callbacks.leave);this.joinForm.append(label,join,this.cancel);
    this.joinForm.addEventListener('submit',event=>{event.preventDefault();const name=this.nickname.value.trim();if(name){sessionStorage.setItem('xr-social-nickname',name);this.nickname.blur();callbacks.join(name);}},{signal:this.events.signal});
    this.waveButton=this.button('손 흔들기 · 1','social-wave',callbacks.wave);this.seatButton=this.button('앉기 · E','social-seat',callbacks.seat);
    this.mic=this.button('음성 켜기','social-voice',()=>{if(voice.enabled)voice.stop();else void voice.start();});
    this.muteButton=this.button('마이크 음소거','social-mute',()=>voice.mute());
    const leave=this.button('퇴장','social-leave',callbacks.leave);this.tools.append(this.waveButton,this.seatButton,this.mic,this.muteButton,leave);
    panel.append(this.status,this.joinForm,this.tools,this.error);
    this.chatToggle=this.button('채팅','social-chat-toggle',()=>{this.chatPanel.hidden=!this.chatPanel.hidden;this.chatToggle.setAttribute('aria-expanded',String(!this.chatPanel.hidden));});this.chatToggle.classList.add('social-chat-toggle');this.chatToggle.setAttribute('aria-expanded','false');
    this.chatPanel.setAttribute('aria-label','방 채팅');this.chatPanel.hidden=true;this.log.setAttribute('role','log');this.log.setAttribute('aria-live','polite');
    const form=element('form','social-chat-form');const chatLabel=element('label','','메시지');this.chatInput.maxLength=500;this.chatInput.name='chat';this.chatInput.required=true;chatLabel.append(this.chatInput);
    const send=this.button('보내기','social-send',()=>{});send.type='submit';form.append(chatLabel,send);
    form.addEventListener('submit',event=>{event.preventDefault();const text=this.chatInput.value;void client.chat(text).then(ok=>{if(ok&&this.chatInput.value===text)this.chatInput.value='';});},{signal:this.events.signal});
    this.chatPanel.append(this.log,form);this.root.append(panel,this.chatToggle,this.chatPanel);host.append(this.root);
    this.stops=[client.changes.subscribe(()=>this.update()),client.messages.subscribe(()=>this.updateLog()),voice.changes.subscribe(()=>this.update())];this.update();
  }
  private button(label:string,action:string,run:()=>void):HTMLButtonElement{const b=element('button','',label);b.type='button';b.dataset.action=action;b.addEventListener('click',run,{signal:this.events.signal});return b;}
  private update():void{
    const joined=!!this.client.self;this.root.dataset.connected=String(joined);this.status.textContent=joined?`${this.client.self!.nickname} · ${this.client.snapshot?.users.length??1}명 접속 중`:'';this.status.hidden=!joined;this.panel.hidden=!this.client.available;
    this.joinForm.hidden=joined||!this.client.available;this.tools.hidden=!joined;this.cancel.hidden=!this.client.desired;this.chatToggle.hidden=!joined;if(!joined)this.chatPanel.hidden=true;
    this.error.textContent=this.client.available?(this.client.error||this.voice.error):'';this.error.hidden=!this.error.textContent;
    this.mic.textContent=this.voice.pending?'마이크 권한 확인 중':this.voice.enabled?'음성 끄기':'음성 켜기';this.mic.disabled=this.voice.pending;this.mic.setAttribute('aria-pressed',String(this.voice.enabled));
    this.muteButton.hidden=!this.voice.enabled;this.muteButton.textContent=this.voice.muted?'마이크 켜기':'마이크 음소거';this.muteButton.setAttribute('aria-pressed',String(this.voice.muted));
    this.waveButton.disabled=!!this.client.self?.seatId;this.updateLog();
  }
  private updateLog():void{
    const signature=this.client.history.map(m=>m.id).join(',');if(this.log.dataset.messages===signature)return;
    this.log.dataset.messages=signature;this.log.replaceChildren(...this.client.history.map(m=>{const row=element('li');row.append(element('strong','',m.nickname),document.createTextNode(' '+m.text));return row;}));this.log.scrollTop=this.log.scrollHeight;
  }
  interaction(label:string,enabled:boolean):void{this.seatButton.textContent=label;this.seatButton.disabled=!enabled;}
  visible(visible:boolean):void{this.root.hidden=!visible;}
  dispose():void{this.events.abort();this.stops.forEach(stop=>stop());this.root.remove();}
}
