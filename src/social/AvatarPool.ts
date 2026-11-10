import { AnimationMixer, Box3, Group, LoopOnce, Mesh, SkinnedMesh, Vector3 } from 'three';
import type { AnimationAction, AnimationClip } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { disposeObject } from '../engine/assets/disposeObject';
import type { Motion } from '../../shared/social';

export const avatarClips={idle:'01_Idle',walk:'02_Walk',wave:'03_Wave',sit:'04_Sit'} as const;
export class AvatarActor {
  readonly root=new Group(); readonly mixer:AnimationMixer; readonly model:Group;
  private actions=new Map<Motion,AnimationAction>(); private current?:AnimationAction;
  private base:'idle'|'walk'|'sit'='idle'; private waving=false; private waveCounter=0;
  readonly scale:number; readonly hipsHeight:number;
  constructor(template:Group,clips:AnimationClip[],scale:number,ground:number,hipsHeight:number){
    this.model=clone(template) as Group;this.scale=scale;this.hipsHeight=hipsHeight;
    this.model.scale.multiplyScalar(scale);this.model.rotation.y=Math.PI;this.model.position.y=-ground*scale;
    this.model.traverse(n=>{if(n instanceof Mesh){n.castShadow=true;n.receiveShadow=true;}});
    this.root.add(this.model);this.mixer=new AnimationMixer(this.model);
    for(const [motion,name] of Object.entries(avatarClips)){
      const clip=clips.find(c=>c.name===name);if(!clip)throw new Error(`아바타 클립 누락: ${name}`);
      const action=this.mixer.clipAction(clip);if(motion==='wave'||motion==='sit'){action.setLoop(LoopOnce,1);action.clampWhenFinished=true;}
      this.actions.set(motion as Motion,action);
    }
    this.mixer.addEventListener('finished',event=>{if(event.action===this.actions.get('wave')&&this.waving){this.waving=false;this.transition(this.base);}});
    this.transition('idle');
  }
  private transition(motion:Motion):void{
    const next=this.actions.get(motion)!;if(next===this.current)return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    this.current?.crossFadeTo(next,.18,false);this.current=next;this.root.userData.animation=motion;
  }
  pose(moving:boolean,seated:boolean,wave:number,waveActive=true):void{
    this.base=seated?'sit':moving?'walk':'idle';
    if(seated){this.waving=false;this.transition('sit');}
    else if(wave!==this.waveCounter){this.waveCounter=wave;this.waving=wave>0&&waveActive;if(this.waving){if(this.current===this.actions.get('wave'))this.current?.reset().play();else this.transition('wave');}else this.transition(this.base);}
    else if(!this.waving)this.transition(this.base);
  }
  seatHeight(surface:number|null):void{this.model.position.y=surface===null?-.00035785*this.scale:surface-this.hipsHeight*this.scale;}
  update(delta:number):void{this.mixer.update(Math.max(0,Math.min(.1,delta)));}
  dispose():void{
    this.root.removeFromParent();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);
    this.model.traverse(n=>{if(n instanceof SkinnedMesh)n.skeleton.dispose();});
    // Geometries/materials belong to the world pool; clones release skeletons only.
  }
}

/** One pool per committed world, one shared download, independent clone skeletons. */
export class AvatarPool {
  private pending?:Promise<GLTF>; private template?:GLTF; private disposed=false;
  private actors=new Set<AvatarActor>();
  load():Promise<GLTF>{
    if(!this.pending)this.pending=new GLTFLoader().loadAsync(import.meta.env.VITE_AVATAR_URL||`${import.meta.env.BASE_URL}assets/avatars/cub-scout-v6.glb`).then(gltf=>{
      if(this.disposed){disposeObject(gltf.scene);throw new Error('아바타 로딩 취소');}
      this.template=gltf;
      for(const name of Object.values(avatarClips))if(!gltf.animations.some(c=>c.name===name))throw new Error(`아바타 클립 누락: ${name}`);
      return gltf;
    });return this.pending;
  }
  async create():Promise<AvatarActor>{
    const gltf=await this.load();if(this.disposed)throw new Error('종료된 아바타 풀');
    const bounds=new Box3().setFromObject(gltf.scene,true),scale=1.75/bounds.getSize(new Vector3()).y;
    const hips=gltf.scene.getObjectByName('Hips')?.getWorldPosition(new Vector3()).y??.342;
    const actor=new AvatarActor(gltf.scene,gltf.animations,scale,bounds.min.y,hips);this.actors.add(actor);return actor;
  }
  release(actor:AvatarActor):void{if(this.actors.delete(actor))actor.dispose();}
  dispose():void{if(this.disposed)return;this.disposed=true;for(const actor of this.actors)actor.dispose();this.actors.clear();if(this.template){disposeObject(this.template.scene);this.template=undefined;}}
}
