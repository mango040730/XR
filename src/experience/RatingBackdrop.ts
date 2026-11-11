import type { Engine } from '../engine/core/Engine';

/** One session-local image of the actual rendered scene, never a replacement for an explorable world. */
export class RatingBackdrop {
  private image=document.createElement('img');
  private sessionId:string|null=null;
  constructor(private engine:Engine,viewport:HTMLElement){
    this.image.className='rating-space-frame';this.image.alt='';this.image.setAttribute('aria-hidden','true');this.image.hidden=true;viewport.append(this.image);
  }
  capture(sessionId:string|undefined):void{
    if(!sessionId||!this.engine.worlds.active)return;
    this.image.src=this.engine.captureFrame();this.sessionId=sessionId;
  }
  sync(screen:string,sessionId:string|undefined,immersive:boolean,expectedWorld:string|null):void{
    const rating=screen==='rating'||screen==='rating-done';
    if(this.sessionId!==sessionId){this.image.removeAttribute('src');this.sessionId=null;}
    if(rating&&!immersive&&this.sessionId!==sessionId&&this.engine.worlds.state.status==='ready'&&this.engine.worlds.active?.config.id===expectedWorld)this.capture(sessionId);
    this.engine.setWorldFrozen(rating);
    this.image.hidden=!rating||immersive||this.sessionId!==sessionId;
  }
  dispose():void{this.image.removeAttribute('src');this.image.remove();this.engine.setWorldFrozen(false);}
}
