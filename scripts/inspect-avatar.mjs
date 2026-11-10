import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer,Box3,Vector3,SkinnedMesh } from 'three';
import validator from 'gltf-validator';
const bytes=await readFile(new URL('../public/assets/avatars/cub-scout-v6.glb',import.meta.url));
const validated=await validator.validateBytes(new Uint8Array(bytes),{uri:'cub-scout-v6.glb'});
if(validated.issues.numErrors)throw new Error('Avatar glTF validation failed');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const meshes=[],bones=new Set();gltf.scene.traverse(n=>{if(n instanceof SkinnedMesh){meshes.push(n.name);n.skeleton.bones.forEach(b=>bones.add(b.name));}});
const bounds=new Box3().setFromObject(gltf.scene,true),scale=1.75/bounds.getSize(new Vector3()).y;
const report={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,meshes,bones:[...bones],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},worldHeight:1.75,scale,front:'+Z (Eyes_Clean center)',runtimeModelYaw:Math.PI,clips:[],validation:validated.issues};
const mixer=new AnimationMixer(gltf.scene);
for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).play();mixer.update(clip.duration*.95);gltf.scene.updateMatrixWorld(true);const b=new Box3().setFromObject(gltf.scene,true);report.clips.push({name:clip.name,duration:clip.duration,tracks:clip.tracks.length,hips:gltf.scene.getObjectByName('Hips').getWorldPosition(new Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),userAction:clip.name!=='05_Shoulder_Check'});}
await writeFile(new URL('../docs/social-avatar-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`CubScout v6: ${bones.size} bones, ${meshes.length} skinned meshes, ${gltf.animations.length} clips; height ${bounds.getSize(new Vector3()).y.toFixed(3)}m; validator ${validated.issues.numErrors} errors/${validated.issues.numWarnings} warnings`);
