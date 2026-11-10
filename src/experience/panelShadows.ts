export interface PanelShadow { inset:boolean;color:string;x:number;y:number;blur:number;spread:number }
/** Split CSS shadows without splitting commas inside rgb()/rgba() colour values. */
export function parsePanelShadows(value:string,fallback='#303238'):PanelShadow[]{
 if(!value||value==='none')return [];
 return value.split(/,(?![^()]*\))/).flatMap(part=>{
  const color=part.match(/(?:rgba?|hsla?|color)\([^)]*\)|#[\da-f]{3,8}/i)?.[0]??fallback;
  const numbers=part.replace(color,'').replace(/\binset\b/g,'').trim().split(/\s+/).map(parseFloat);
  if(numbers.length<2||numbers.some(n=>!Number.isFinite(n)))return [];
  return [{inset:/\binset\b/.test(part),color,x:numbers[0],y:numbers[1],blur:Math.max(0,numbers[2]??0),spread:numbers[3]??0}];
 });
}
