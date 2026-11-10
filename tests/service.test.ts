import { describe, expect, it } from 'vitest';
import { ServiceStore } from '../src/state/ServiceStore';
import { DEMO_STORAGE_KEY, initialData, LocalDemoRepository } from '../src/services/LocalDemoRepository';
import { deviceQuaternion, DwellSelection } from '../src/experience/cardboardLogic';
import { Vector3 } from 'three';
function setup(){const data=new Map<string,string>();const repo=new LocalDemoRepository({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}});return{data,repo,store:new ServiceStore(repo)};}
describe('Local demo service flow',()=>{
  it('persists onboarding, session, rating, conversation, invitation and appointment',()=>{
    const {store,repo}=setup();store.login();store.profile({nickname:'테스터',avatar:'amber'});store.neighborhood('jayang');store.join('team','fish');store.finish();
    store.rate(4,5,{chang:4,ryo:5,'707':3});store.chat('다음에 또 만나요');store.invite('창용','social');store.respond('demo-incoming','accepted');
    store.appointment({date:'2026-12-10',time:'17:00',place:'umai',participants:['chang']});
    const next=new ServiceStore(repo).value;expect(next.profile.nickname).toBe('테스터');expect(next.onboarded).toBe(true);expect(next.session?.mode).toBe('team');expect(next.ratings[0].participantRatings.ryo).toBe(5);expect(next.messages.at(-1)?.text).toContain('또');expect(next.invitations[0].status).toBe('accepted');expect(next.appointments).toHaveLength(1);
  });
  it('rejects unknown and full rooms without mutating session',()=>{
    const {data,repo}=setup();const state=initialData();state.rooms[0].current=state.rooms[0].capacity;data.set(DEMO_STORAGE_KEY,JSON.stringify(state));const store=new ServiceStore(repo);
    expect(()=>store.join('solo','missing')).toThrow('서버를 찾을');expect(()=>store.join('solo','fish')).toThrow('정원');expect(store.value.session).toBe(null);
  });
  it('requires ended session, both ratings, and every participant',()=>{const {store}=setup();store.join('social','fish');expect(()=>store.rate(3,4,{chang:3})).toThrow();store.finish();expect(()=>store.rate(3,4,{chang:3})).toThrow();expect(()=>store.rate(0,4,{chang:3,ryo:3,'707':3})).toThrow();expect(store.value.ratings).toHaveLength(0);});
  it('replaces a repeated session rating and returns defensive copies',()=>{const {store}=setup();store.join('solo','fish');store.finish();store.rate(3,4,{chang:3,ryo:3,'707':3});store.rate(5,5,{chang:5,ryo:5,'707':5});const state=store.value;state.ratings.length=0;expect(store.value.ratings).toHaveLength(1);expect(store.value.ratings[0].modeRating).toBe(5);});
  it('recovers corrupted storage and stays usable when writes are blocked',()=>{const repo=new LocalDemoRepository({getItem:()=>'{bad',setItem:()=>{throw new Error('quota');}});const store=new ServiceStore(repo);expect(repo.error).toContain('기본값');store.login();expect(store.value.signedIn).toBe(true);expect(repo.error).toContain('현재 탭');});
  it('rejects impossible dates and unknown participant/place identifiers',()=>{const {store}=setup();expect(()=>store.appointment({date:'2026-02-31',time:'17:00',place:'umai',participants:['chang']})).toThrow();expect(()=>store.appointment({date:'2026-12-10',time:'17:00',place:'unknown',participants:['chang']})).toThrow();expect(()=>store.appointment({date:'2026-12-10',time:'17:00',place:'umai',participants:['unknown']})).toThrow();});
  it('recovers structurally malformed saved messages instead of breaking a screen',()=>{const {data,repo}=setup();const state=initialData();data.set(DEMO_STORAGE_KEY,JSON.stringify({...state,messages:[{text:null}]}));const store=new ServiceStore(repo);expect(store.value.messages).toEqual(initialData().messages);expect(repo.error).toContain('기본값');});
  it('requires appointment fields and a participant',()=>{const {store}=setup();expect(()=>store.appointment({date:'',time:'17:00',place:'umai',participants:[]})).toThrow();expect(store.value.appointments).toHaveLength(0);});
  it('rejects blank names/messages and limits history',()=>{const {store}=setup();expect(()=>store.profile({nickname:' '})).toThrow();expect(()=>store.chat(' ')).toThrow();for(let i=0;i<110;i++)store.chat('인사'+i);expect(store.value.messages).toHaveLength(100);});
});
describe('Cardboard input math (not hardware verification)',()=>{
  it('activates once after an uninterrupted dwell and rearms after leaving',()=>{const dwell=new DwellSelection(1200);expect(dwell.update('a',0).activate).toBe(false);expect(dwell.update('a',1199).activate).toBe(false);expect(dwell.update('a',1200).activate).toBe(true);expect(dwell.update('a',2400).activate).toBe(false);dwell.update('',2500);dwell.update('a',2600);expect(dwell.update('a',3800).activate).toBe(true);});
  it('resets when gaze crosses another control',()=>{const dwell=new DwellSelection();dwell.update('a',0);dwell.update('b',1000);expect(dwell.update('a',1200).progress).toBe(0);});
  it('maps a portrait upright device to a forward-looking camera',()=>{const q=deviceQuaternion(0,90,0,0);expect(new Vector3(0,0,-1).applyQuaternion(q).distanceTo(new Vector3(0,0,-1))).toBeLessThan(.0001);expect(q.length()).toBeCloseTo(1);});
  it('compensates landscape screen rotation without losing normalization',()=>{expect(deviceQuaternion(45,20,10,90).length()).toBeCloseTo(1);expect(deviceQuaternion(45,20,10,90).angleTo(deviceQuaternion(45,20,10,0))).toBeCloseTo(Math.PI/2);});
});
