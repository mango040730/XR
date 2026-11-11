import { Mesh } from 'three';
import type { Group } from 'three';
export const roomVersion='2.7.1';

// Verify the assembled, unbatched scene rather than relying on ZIP names.
export function verifyRoomVersion(root: Group){
  const names: string[]=[],plants: string[]=[],clocks: string[]=[];
  let meshCount=0;
  root.traverse(o=>{
    names.push(o.name);
    if(o instanceof Mesh)meshCount++;
    if(o.userData.plant)plants.push(o.name);
    if(o.userData.decor==='clock')clocks.push(o.name);
  });
  const required=[
    'Signature owner lounge chair',
    'Signature matching ottoman',
    'Signature warm floor reading lamp',
    'Guest wraparound low lounge',
    'Conversation single lounge sofa',
    'Closed gently draped woven cloth',
    'Small ceramic dessert plate',
    'Tea biscuit on dessert plate',
    'Entry rug soft bevelled wool'
  ];
  const missing=required.filter(name=>!names.includes(name));
  const forbidden=names.filter(name=>/Signature soft head pillow|Signature chair floor plant/i.test(name));
  if(missing.length||forbidden.length)throw new Error('마이룸 버전2 모델 확인 실패: '+[...missing,...forbidden].join(', '));
  if(clocks.length!==1||plants.length!==1)throw new Error('마이룸 버전2 소품 구성 확인 실패');
  return {version:roomVersion,scene:'personal-hub-tea-v8',meshCount,requiredFeatures:required,missing,forbidden,plants,clockObjects:clocks};
}
