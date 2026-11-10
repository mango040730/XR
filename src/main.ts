import { LEGACY_SERVICE_REVIEW } from './ui/servicePresentation';
import type { Engine } from './engine/core/Engine';
import type { ServiceRouter } from './routing/ServiceRouter';
async function attachSocial(engine:Engine,surface:HTMLElement,router?:ServiceRouter):Promise<()=>void>{
  // Offline presentation is also useful when the backend is intentionally absent.
  if(new URLSearchParams(location.search).has('offline'))return ()=>{};
  const {SocialExperience}=await import('./social/SocialExperience');
  const social=new SocialExperience(engine,surface);
  if(router)social.setScreen(router.current);
  const stop=router?.changes.subscribe(screen=>social.setScreen(screen));
  let detach:(()=>void)|undefined;
  if(import.meta.env.DEV&&import.meta.env.MODE==='e2e'){
    const {attachSocialDiagnostics}=await import('./dev/socialDiagnostics');detach=attachSocialDiagnostics(social);
  }
  return ()=>{detach?.();stop?.();social.dispose();};
}
const host=document.querySelector<HTMLElement>('#app');
if(!host)throw new Error('앱 컨테이너를 찾을 수 없습니다.');
if(new URLSearchParams(location.search).has('fishing')){
  const fishing=await import('./experience/startFishing');
  if(fishing.engine){const dispose=await attachSocial(fishing.engine,host);if(import.meta.hot)import.meta.hot.dispose(dispose);}
}else if(import.meta.env.DEV&&import.meta.env.MODE==='e2e'&&LEGACY_SERVICE_REVIEW&&new URLSearchParams(location.search).has('lab')){
  await import('./experience/startLab');
}else{
  try{
    const Experience=import.meta.env.DEV&&import.meta.env.MODE==='e2e'&&LEGACY_SERVICE_REVIEW
      ? (await import('./experience/ServiceExperience')).ServiceExperience
      : (await import('./experience/FirstFixExperience')).FirstFixExperience;
    const experience=new Experience(host);
    const social=!(import.meta.env.DEV&&import.meta.env.MODE==='e2e'&&LEGACY_SERVICE_REVIEW)&&!new URLSearchParams(location.search).has('designReview')
      ? await attachSocial(experience.engine,host.querySelector<HTMLElement>('.service-shell')!,experience.router):()=>{};
    if(import.meta.hot)import.meta.hot.dispose(()=>{social();void experience.dispose();});
  }catch(error){const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='3D 서비스 초기화 실패: '+(error instanceof Error?error.message:String(error));host.append(message);}
}
