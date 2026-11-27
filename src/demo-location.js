export const DEMO_LOCATION_KEY = 'meet-join.demo-location.v1';
export const DEMO_AREAS = Object.freeze([
  {id:'hanbit',name:'한빛동',detail:'중앙공원 인근',x:.5,y:.5},
  {id:'saebom',name:'새봄동',detail:'마을도서관 인근',x:.30,y:.38},
  {id:'dodam',name:'도담동',detail:'문화거리 인근',x:.70,y:.64},
]);
const clamp = value => Math.max(.24,Math.min(.76,value));
export function demoSelection(x=.5,y=.5,confirmedAt=null) {
  x=clamp(x);y=clamp(y);
  const area=DEMO_AREAS.reduce((best,item)=>(item.x-x)**2+(item.y-y)**2<(best.x-x)**2+(best.y-y)**2?item:best);
  return {mode:'demo',x,y,areaId:area.id,label:`${area.name} · ${area.detail}`,confirmedAt};
}
export function validDemoSelection(value) {
  return Boolean(value?.mode==='demo'&&Number.isFinite(value.x)&&Number.isFinite(value.y)
    &&value.x>=.24&&value.x<=.76&&value.y>=.24&&value.y<=.76
    &&DEMO_AREAS.some(area=>area.id===value.areaId));
}
export function copyDemoSelection(value) {
  return validDemoSelection(value)?demoSelection(value.x,value.y,value.confirmedAt??null):null;
}
export function readDemoSelection(storage=globalThis.localStorage) {
  try {return copyDemoSelection(JSON.parse(storage.getItem(DEMO_LOCATION_KEY)))??demoSelection();}
  catch {return demoSelection();}
}
export function saveDemoSelection(value,storage=globalThis.localStorage) {
  const selected=copyDemoSelection(value);if(!selected)throw new Error('INVALID_DEMO_LOCATION');
  storage.setItem(DEMO_LOCATION_KEY,JSON.stringify(selected));
}
