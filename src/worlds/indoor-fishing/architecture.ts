import { BufferGeometry, CanvasTexture, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { forestBackground } from './forest';
import { pendant } from './lighting';
import { Kit } from './geometry';
import { floorSlabs, palette as c } from './layout';
function sign(root: Group, text: string, at: [number, number, number], yaw: number, kit: Kit) {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = c.walnut; ctx.fillRect(0,0,768,192); ctx.fillStyle = c.ivory;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 56px sans-serif'; ctx.fillText(text,384,96);
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace;
  const m = new Mesh(new PlaneGeometry(2.2,.55), new MeshBasicMaterial({map:t})); m.position.fromArray(at); m.rotation.y=yaw; m.name='wall-sign-text'; root.add(m);
  const b=kit.box(root,[2.35,.68,.08],[at[0]-Math.sin(yaw)*.05,at[1],at[2]-Math.cos(yaw)*.05],c.edge); b.rotation.y=yaw;b.name='wall-sign-backing';
}
export function architecture(root: Group, kit: Kit) {
  for (const f of floorSlabs) { const slab=kit.box(root,[f.size[0],.22,f.size[1]],[f.center[0],-.11,f.center[1]],c.floor,'stone');slab.name='floor-slab'; }
  // A restrained checker of large stone tiles; the actual pool hole remains empty.
  for(let x=-7.5; x<7.5; x+=.75) for(let z=-5.5; z<5.5; z+=.75){
    const w=Math.min(.744,7.5-x),d=Math.min(.744,5.5-z),cx=x+w/2,cz=z+d/2;
    if(Math.abs(cx)<4.05 && Math.abs(cz)<2.3)continue;
    if(Math.abs(cx)-w/2<4 && Math.abs(cz)-d/2<2.25)continue;
    kit.box(root,[w,.012,d],[cx,.006,cz],((Math.round((x+7.5)/.75)+Math.round((z+5.5)/.75))%3===0)?c.floorTile:c.floorAlternate,'stone');
  }
  // Front and back: real openings between a sill and header, never a photograph behind the wall.
  for(const z of [-5.6,5.6]){
    kit.box(root,[15.3,.85,.22],[0,.425,z],c.wall); kit.box(root,[15.3,.85,.22],[0,3.1,z],c.wall);
    for(const x of [-7.5,-3.6,0,3.6,7.5])kit.box(root,[.4,2,.23],[x,1.8,z],c.wall);
    for(const x of [-5.55,-1.8,1.8,5.55])windowFrame(root,kit,[x,1.8,z],x===-5.55||x===5.55?3.5:3.2,0);
  }
  for(const side of [-1,1]){
    const x=side*7.6;
    const gable=new BufferGeometry();
    const triangle=side===1?[x,3.5,5.6,x,4.65,0,x,3.5,-5.6]:[x,3.5,-5.6,x,4.65,0,x,3.5,5.6];
    gable.setAttribute('position',new Float32BufferAttribute(triangle,3));gable.computeVertexNormals();
    // Supply UVs so this untextured face batches with other cream walls.
    gable.setAttribute('uv',new Float32BufferAttribute([0,0,.5,1,1,0],2));root.add(new Mesh(gable,kit.mat(c.wall)));
    kit.box(root,[.22,.85,11.4],[x,.425,0],c.wall); kit.box(root,[.22,.85,11.4],[x,3.1,0],c.wall);
    for(const z of [-5.5,-1.8,1.8,5.5])kit.box(root,[.23,2,.5],[x,1.8,z],c.wall);
    for(const z of [-3.65,0,3.65])windowFrame(root,kit,[x,1.8,z],3.15,Math.PI/2);
  }
  // Closed entrance with timber reveal, consistent with all four complete walls.
  kit.box(root,[1.5,2.65,.18],[0,1.325,5.44],c.plank);
  for(const x of [-.85,.85])kit.box(root,[.18,2.85,.34],[x,1.425,5.35],c.edge);
  kit.box(root,[1.9,.2,.34],[0,2.85,5.35],c.edge);
  kit.box(root,[.08,.24,.07],[.5,1.25,5.3],c.brass);
  sign(root,'고요낚시  /  QUIET WATER',[0,3.1,-5.44],0,kit);
  sign(root,'출입구  ·  EXIT',[0,3.13,5.27],Math.PI,kit);
  // Gable runs along the room's X axis. Low edge 3.55m, ridge 4.65m.
  for(const side of [-1,1]){
    const roof=kit.box(root,[15.6,.18,5.82],[0,4.1,side*2.8],c.roof);roof.rotation.x=side*Math.atan(1.1/5.6);
    for(let z=.2;z<5.7;z+=.65)kit.box(root,[15.4,.07,.035],[0,4.66-z*1.1/5.6,side*z],c.roofSeam);
  }
  for(const x of [-7.35,-3.7,0,3.7,7.35]){
    for(const side of [-1,1]){
      kit.box(root,[.32,3.55,.32],[x,1.775,side*5.35],c.wood);
      kit.beam(root,[x,3.5,side*5.5],[x,4.65,0],.23,c.wood);
      kit.beam(root,[x,2.95,side*5.35],[x,3.55,side*4.65],.22,c.wood);
    }
    kit.box(root,[.3,.32,10.9],[x,3.48,0],c.wood);
    kit.beam(root,[x,3.52,0],[x,4.65,0],.15,c.wood);
  }
  kit.box(root,[15.25,.26,.26],[0,4.62,0],c.edge);
  for(const z of [-5.36,5.36])kit.box(root,[15.25,.3,.3],[0,3.5,z],c.wood);
  for(const x of [-5.5,0,5.5])for(const z of [-3.3,3.3]){
    kit.beam(root,[x,3.95,z],[x,3.12,z],.035,c.edge);
    const glass=kit.box(root,[.38,.48,.38],[x,2.92,z],c.amber);
    pendant(root,glass,x,z);
    for(const dx of [-.22,.22])for(const dz of [-.22,.22])kit.box(root,[.04,.57,.04],[x+dx,2.92,z+dz],c.edge);
    for(const y of [2.65,3.19])kit.box(root,[.51,.06,.51],[x,y,z],c.edge);
  }
  forestBackground(root);
}
function windowFrame(root: Group, kit: Kit, at: [number,number,number], width:number,yaw:number){
  const g=new Group();g.name='window-frame';g.position.fromArray(at);g.rotation.y=yaw;root.add(g);
  for(const x of [-width/2,width/2])kit.box(g,[.12,2.05,.28],[x,0,0],c.edge);
  // Rails project 4cm past the plaster faces on both sides. Matching the
  // wall's .22m depth placed timber and plaster on the exact same plane.
  for(const y of [-1,1]) {const border=kit.box(g,[width+.2,.12,.3],[0,y,0],c.edge);border.name='window-border';}
  kit.box(g,[width+.34,.09,.33],[0,-1.08,0],c.wood);
  for(const x of [-width/6,width/6])kit.box(g,[.065,2,.13],[x,0,0],c.wood);
  kit.box(g,[width,.07,.13],[0,.35,0],c.wood);
  // No opaque "window" plane: the opening reveals actual scenery at changing parallax.
}
