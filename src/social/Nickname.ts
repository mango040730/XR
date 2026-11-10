import { CanvasTexture, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
export class Nickname {
  readonly sprite:Sprite; private texture:CanvasTexture;
  constructor(name:string){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;
    c.fillStyle='rgba(20,20,20,.75)';c.beginPath();c.roundRect(0,8,512,80,40);c.fill();c.fillStyle='#efeeec';c.textAlign='center';c.textBaseline='middle';c.font='500 36px "Wanted Sans", sans-serif';c.fillText(name,256,48,470);
    this.texture=new CanvasTexture(canvas);this.texture.colorSpace=SRGBColorSpace;
    this.sprite=new Sprite(new SpriteMaterial({map:this.texture,depthTest:true,transparent:true}));this.sprite.position.y=2;this.sprite.scale.set(1.4,.2625,1);
  }
  dispose():void{this.sprite.removeFromParent();this.sprite.material.dispose();this.texture.dispose();}
}
