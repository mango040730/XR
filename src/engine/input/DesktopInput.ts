import type { InputSource, MovementInput } from './types';

const movementKeys = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
const editing = (target: EventTarget | null): boolean => target instanceof HTMLElement && !!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');

/** Keyboard movement is immediate. Dragging the world looks around without locking the cursor. */
export class DesktopInput implements InputSource {
  private keys = new Set<string>();
  private events = new AbortController();
  private drag: { id: number; x: number; y: number; distance: number } | null = null;
  private suppressClick = false;
  enabled = false;

  constructor(private canvas: HTMLCanvasElement, look: (x: number, y: number) => void) {
    const options = { signal: this.events.signal };
    document.addEventListener('keydown', event => {
      if (!this.enabled || editing(event.target) || event.ctrlKey || event.metaKey || event.altKey || !movementKeys.has(event.code)) return;
      event.preventDefault(); this.keys.add(event.code);
    }, options);
    document.addEventListener('keyup', event => this.keys.delete(event.code), options);
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      canvas.focus({preventScroll:true});
      if (!this.enabled) return;
      this.suppressClick=false;this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};
      canvas.setPointerCapture(event.pointerId);
    }, options);
    window.addEventListener('pointermove', event => {
      const drag=this.drag;
      if (!drag || event.pointerId!==drag.id) return;
      if (!this.enabled || !(event.buttons&1)) { this.clearDrag();return; }
      const x=event.clientX-drag.x,y=event.clientY-drag.y;drag.distance+=Math.hypot(x,y);drag.x=event.clientX;drag.y=event.clientY;
      look(x,y);
    }, options);
    window.addEventListener('pointerup', event => {
      if (this.drag?.id!==event.pointerId) return;
      this.suppressClick=this.drag.distance>3;this.clearDrag();
    }, options);
    for (const name of ['pointercancel','lostpointercapture'] as const)
      canvas.addEventListener(name,event=>{if(this.drag?.id===event.pointerId)this.clearDrag();},options);
    // A look drag must not also activate the object now under the centre of the view.
    canvas.addEventListener('click',event=>{
      if (!this.suppressClick) return;
      this.suppressClick=false;event.preventDefault();event.stopImmediatePropagation();
    },options);
    window.addEventListener('blur',()=>this.clear(),options);
    document.addEventListener('visibilitychange',()=>this.clear(),options);
    document.addEventListener('focusin',event=>{if(editing(event.target))this.clear();},options);
  }
  readMovement(): MovementInput {
    if (!this.enabled) return {right:0,forward:0};
    return {right:Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft')),
      forward:Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))};
  }
  private clearDrag(): void {
    const drag=this.drag;this.drag=null;
    if (drag&&this.canvas.hasPointerCapture(drag.id)) this.canvas.releasePointerCapture(drag.id);
  }
  clear(): void {this.keys.clear();this.clearDrag();}
  dispose(): void {this.clear();this.events.abort();}
}
