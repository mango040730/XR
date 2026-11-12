/** One deadline per completion visit; ordinary rerenders never restart it. */
export class CompletionReturnTimer {
 private screen?:string;
 private timer?:ReturnType<typeof setTimeout>;
 private disposed=false;
 constructor(private returnHome:()=>void){}
 setScreen(screen:string):void{
  if(this.disposed||screen===this.screen)return;
  if(this.timer!==undefined)clearTimeout(this.timer);
  this.timer=undefined;this.screen=screen;
  if(screen==='appointment-done')this.timer=setTimeout(()=>{
   this.timer=undefined;
   if(!this.disposed&&this.screen==='appointment-done')this.returnHome();
  },10000);
 }
 dispose():void{this.disposed=true;if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;}
}
