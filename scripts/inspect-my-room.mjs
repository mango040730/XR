import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { disposeObject } from '../src/engine/assets/disposeObject.ts';

const bytes=await readFile(new URL('../public/assets/models/my-room/myroom-v2-2.7.1.glb',import.meta.url));
const jsonSize=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+jsonSize).toString());
// Node inspection decodes the actual geometry/extras; embedded PNGs remain untouched in the published GLB.
const geometryData=JSON.parse(JSON.stringify(data));delete geometryData.materials;delete geometryData.textures;delete geometryData.images;
for(const mesh of geometryData.meshes)for(const primitive of mesh.primitives)delete primitive.material;
const json=Buffer.from(JSON.stringify(geometryData)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
const binary=bytes.subarray(20+jsonSize),container=Buffer.alloc(20+padded.length+binary.length);
container.writeUInt32LE(0x46546c67,0);container.writeUInt32LE(2,4);container.writeUInt32LE(container.length,8);container.writeUInt32LE(padded.length,12);container.writeUInt32LE(0x4e4f534a,16);padded.copy(container,20);binary.copy(container,20+padded.length);
const gltf=await new GLTFLoader().parseAsync(container.buffer.slice(container.byteOffset,container.byteOffset+container.byteLength),'');
const root=gltf.scene;root.updateMatrixWorld(true);const boxes=[],features=[];let meshes=0;
const round=n=>Math.round(n*1e6)/1e6;
root.traverse(object=>{
 if(object.userData.originalName)object.name=object.userData.originalName;
 if(object.isMesh)meshes++;
 if(object.userData.collider){const b=new Box3().setFromObject(object,true);boxes.push({name:object.name,position:b.getCenter(new Vector3()).toArray().map(round),size:b.getSize(new Vector3()).toArray().map(round),color:'#C8B38B',visible:false});}
 if(object.userData.seatRole)features.push({name:object.name,position:object.getWorldPosition(new Vector3()).toArray().map(round)});
});
const bounds=new Box3().setFromObject(root,true),cx=-1.75,cz=-.63,x=1.65,z=2.25,cut=.34;
const polygon=[[-x+cut,-z],[x-cut,-z],[x,-z+cut],[x,z-cut],[x-cut,z],[-x+cut,z],[-x,z-cut],[-x,-z+cut]].map(([a,b])=>[round(a+cx),round(b+cz)]);
const layout={asset:'myroom-v2-2.7.1.glb',version:'2.7.1',sha256:createHash('sha256').update(bytes).digest('hex'),meshes,bounds:{min:bounds.min.toArray().map(round),max:bounds.max.toArray().map(round)},features,
 floors:[{center:[0,0],size:[8.4,7.2],y:.02,color:'#C8B38B',visible:false},{center:[cx,cz],size:[x*2,z*2],y:.18,polygon,color:'#C8B38B',visible:false}],boxes};
const content=JSON.stringify(layout,null,2)+'\n',target=new URL('../src/worlds/my-room/layout.json',import.meta.url);
if(process.argv.includes('--write'))await writeFile(target,content);else if(await readFile(target,'utf8')!==content)throw new Error('마이룸 GLB와 충돌 배치가 다릅니다. inspect:my-room -- --write로 갱신하세요.');
console.log(JSON.stringify({meshes,colliders:boxes.length,features,bounds:layout.bounds}));disposeObject(root);
