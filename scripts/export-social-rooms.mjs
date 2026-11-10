import { createServer } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { worlds } = await vite.ssrLoadModule('/src/worlds/registry.ts');
  const { myRoom } = await vite.ssrLoadModule('/src/worlds/my-room/config.ts');
  const { seats } = await vite.ssrLoadModule('/src/worlds/indoor-fishing/layout.ts');
  const layouts = [myRoom, ...worlds].map(config => ({
    id: config.id, name: config.name, spawn: config.spawn, player: config.player,teleport:config.teleport,
    floors: config.floors.map(f => ({minX:f.center[0]-f.size[0]/2,maxX:f.center[0]+f.size[0]/2,minZ:f.center[1]-f.size[1]/2,maxZ:f.center[1]+f.size[1]/2,y:f.y})),
    solids: config.boxes.filter(b=>b.solid!==false).map(b=>({min:b.position.map((x,i)=>x-b.size[i]/2),max:b.position.map((x,i)=>x+b.size[i]/2)})),
    seats: config.id==='indoor-fishing' ? seats.map(s=>({id:s.id,position:s.position,yaw:s.yaw,stand:s.stand,surfaceHeight:.5275})) : config.id==='my-room' ? [
      {id:'sofa-left',position:[-4.65,0,-3],yaw:0,stand:[-4.65,0,-1.55],surfaceHeight:.9},
      {id:'sofa-right',position:[-3.35,0,-3],yaw:0,stand:[-3.35,0,-1.55],surfaceHeight:.9}
    ] : [],
  }));
  const target=new URL('../shared/rooms.json',import.meta.url),content=JSON.stringify(layouts,null,2)+'\n';
  const previous=await readFile(target,'utf8').catch(()=>null);if(previous!==content)await writeFile(target,content);
  console.log(`Social room collision catalog: ${layouts.length} existing worlds`);
} finally { await vite.close(); }
