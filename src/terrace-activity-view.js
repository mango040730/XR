import * as THREE from 'three';
import './terrace-activity.css';

const COPY={
  sit:{title:'의자를 누르면 앉을 수 있어요.',body:null,width:423,height:116},
  content:{title:'원하는 것을 골라보세요',body:'관심있는 콘텐츠를 즐겨보세요. 타인과 대화도 할수있어요.',width:594,height:154},
};

export function createTerraceActivityView({scene,camera,canvas}){
  let root=null,kind=null,disposed=false;
  const surface=document.createElement('canvas'),texture=new THREE.CanvasTexture(surface);
  texture.colorSpace=THREE.SRGBColorSpace;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  panel.name='Terrace_activity_XR_notice';panel.visible=false;panel.renderOrder=1000;scene.add(panel);
  const anchor=new THREE.Vector3(),eye=new THREE.Vector3(),forward=new THREE.Vector3(),projected=new THREE.Vector3();
  function paint(){
    if(!kind||disposed)return;
    const copy=COPY[kind],scale=2;
    surface.width=copy.width*scale;surface.height=copy.height*scale;
    const ctx=surface.getContext('2d');ctx.scale(scale,scale);
    ctx.fillStyle='rgba(23,24,26,0.6)';ctx.beginPath();ctx.roundRect(0,0,copy.width,copy.height,12);ctx.fill();
    ctx.fillStyle='#efeeec';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='600 28px "Wanted Sans"';ctx.fillText(copy.title,copy.width/2,58);
    if(copy.body){ctx.font='400 18px "Wanted Sans"';ctx.fillText(copy.body,copy.width/2,101);}
    texture.needsUpdate=true;
    const width=kind==='sit'?.8:.95;panel.scale.set(width,width*copy.height/copy.width,1);
  }
  document.fonts.ready.then(()=>{if(!disposed)paint();});
  function set(next){
    if(next===kind)return;
    root?.remove();root=null;kind=next;panel.visible=false;
    if(!next)return;
    const copy=COPY[next];root=document.createElement('section');
    root.className='entry-overlay space-tutorial-overlay timed-tutorial-overlay terrace-activity-overlay';
    root.dataset.tutorialStep=next==='sit'?'sit-hint':'crossroads-content';
    root.setAttribute('role','status');root.setAttribute('aria-live','polite');root.setAttribute('aria-atomic','true');
    root.innerHTML=`<div class="entry-card space-tutorial-card timed-tutorial-card ${next==='sit'?'terrace-sit-card':'terrace-desk-card'}"><div class="space-tutorial-copy"><h1>${copy.title}</h1>${copy.body?`<p class="space-tutorial-body">${copy.body}</p>`:''}</div></div>`;
    document.body.append(root);paint();
  }
  return {
    update(next,seat,immersive=false){
      set(next);if(!next)return false;
      camera.updateWorldMatrix(true,false);camera.getWorldPosition(eye);camera.getWorldDirection(forward);
      let visible=true;
      if(next==='content'){
        anchor.fromArray(seat.work).add(new THREE.Vector3(0,.18,0));
        projected.copy(anchor).project(camera);
        visible=forward.dot(anchor.clone().sub(eye))>0&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<1.3&&Math.abs(projected.y)<1.3;
        const rect=canvas.getBoundingClientRect(),card=root.firstElementChild;
        const width=Math.min(COPY.content.width,rect.width-32),height=card.getBoundingClientRect().height||COPY.content.height;
        const x=THREE.MathUtils.clamp(rect.left+(projected.x+1)*rect.width/2,width/2+16,innerWidth-width/2-16);
        const y=THREE.MathUtils.clamp(rect.top+(1-projected.y)*rect.height/2,height+16,innerHeight-16);
        card.style.left=`${x}px`;card.style.top=`${y}px`;
        panel.position.copy(anchor);panel.position.y+=panel.scale.y/2;
      }else panel.position.copy(eye).addScaledVector(forward,1.2);
      panel.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));panel.visible=immersive&&visible;
      root.style.display=!immersive&&visible?'grid':'none';root.setAttribute('aria-hidden',String(immersive||!visible));
      return visible;
    },
    dispose(){disposed=true;root?.remove();panel.removeFromParent();panel.geometry.dispose();panel.material.dispose();texture.dispose();},
  };
}
