import type { SocialExperience } from '../social/SocialExperience';
declare global {interface Window {readonly __SOCIAL_DEBUG__?:{snapshot():ReturnType<SocialExperience['diagnostics']>;voice():ReturnType<SocialExperience['voice']['diagnostics']>}}}
/** Test-build observation only: no input, connection, permission or pose controls. */
export function attachSocialDiagnostics(social:SocialExperience):()=>void{
  Object.defineProperty(window,'__SOCIAL_DEBUG__',{value:Object.freeze({snapshot:()=>social.diagnostics(),voice:()=>social.voice.diagnostics()}),configurable:true});
  return ()=>{Reflect.deleteProperty(window,'__SOCIAL_DEBUG__');};
}
