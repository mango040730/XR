import { Component, Suspense, createElement, useEffect } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useGLTF } from '@react-three/drei/core/Gltf.js';
import type { Group } from 'three';
import { disposeObject } from '../../engine/assets/disposeObject';
import { cloneAtelierModel } from './model';

class ModelBoundary extends Component<{onError(error:Error):void;children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error){this.props.onError(error);}
  render(){return this.state.failed?null:this.props.children;}
}
function LoadedModel({url,ready}:{url:string;ready(scene:Group):void}) {
  const {scene}=useGLTF(url,false,false);
  useEffect(()=>{ready(scene);},[scene,ready]);
  return null;
}

/** useGLTF runs in an isolated hook root; the existing renderer, XR camera and controls own the scene. */
export async function loadAtelierModel(url:string,signal:AbortSignal,progress:(message:string)=>void):Promise<Group>{
  signal.throwIfAborted();
  try {
    const response=await fetch(url,{signal,headers:{Accept:'model/gltf-binary'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const reader=response.body?.getReader(),parts:Uint8Array<ArrayBuffer>[]=[];let loaded=0;
    const total=Number(response.headers.get('content-length'));
    if(reader){for(;;){const {value,done}=await reader.read();if(done)break;signal.throwIfAborted();parts.push(value);loaded+=value.byteLength;progress(total>0?`목공방 다운로드 ${Math.round(loaded/total*100)}%`:`목공방 다운로드 ${Math.round(loaded/1024)} KB`);}}
    else parts.push(new Uint8Array(await response.arrayBuffer()));
    signal.throwIfAborted();
    const blob=new Blob(parts,{type:'model/gltf-binary'}),header=new Uint32Array(await blob.slice(0,12).arrayBuffer());
    if(header[0]!==0x46546c67||header[1]!==2)throw new Error('올바른 GLB 2.0 파일이 아닙니다.');
    // A private URL gives each world its own useGLTF cache entry, including concurrent/cancelled requests.
    const objectUrl=URL.createObjectURL(blob),host=document.createElement('div'),root=createRoot(host,{onCaughtError:()=>{}});
    progress('목공방 모델과 텍스처를 준비하고 있어요.');
    return await new Promise<Group>((resolve,reject)=>{
      let settled=false;
      const abort=()=>{if(!settled){settled=true;reject(signal.reason??new DOMException('취소됨','AbortError'));}};
      const cleanup=()=>{signal.removeEventListener('abort',abort);queueMicrotask(()=>{root.unmount();useGLTF.clear(objectUrl);URL.revokeObjectURL(objectUrl);});};
      const fail=(error:Error)=>{cleanup();if(!settled){settled=true;reject(error);}};
      const ready=(template:Group)=>{
        try{
          if(signal.aborted||settled){disposeObject(template);cleanup();abort();return;}
          const model=cloneAtelierModel(template);model.userData.assetUrl=url;
          settled=true;cleanup();resolve(model);
          // The template was never uploaded to a renderer. Clearing its cache releases its references;
          // decoded image data is now owned by this world's cloned textures and closed on world disposal.
        }catch(error){disposeObject(template);fail(error instanceof Error?error:new Error(String(error)));}
      };
      signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
      root.render(createElement(ModelBoundary,{onError:fail,children:createElement(Suspense,{fallback:null},createElement(LoadedModel,{url:objectUrl,ready}))}));
    });
  }catch(cause){
    if(signal.aborted)throw signal.reason??cause;
    const error=new Error(`목공방 GLB 로딩 실패: forest-atelier-original.glb — ${cause instanceof Error?cause.message:String(cause)}`,{cause});
    console.error(error.message,cause);throw error;
  }
}
