import { expect,it } from 'vitest';
import { parsePanelShadows } from '../src/experience/panelShadows';
it('keeps both raised light and dark shadows when rgba colours contain commas',()=>{
 const shadows=parsePanelShadows('rgba(112, 108, 103, 0.27) 5px 5px 11px 0px, rgba(255, 255, 255, 0.88) -4px -4px 9px 0px');
 expect(shadows).toHaveLength(2);expect(shadows[0]).toMatchObject({color:'rgba(112, 108, 103, 0.27)',x:5,y:5,blur:11,spread:0,inset:false});
 expect(shadows[1]).toMatchObject({x:-4,y:-4,blur:9,inset:false});
});
it('retains inset and signed spread for recessed controls',()=>{
 expect(parsePanelShadows('rgb(20, 30, 40) 3px -2px 6px -1px inset')).toEqual([{color:'rgb(20, 30, 40)',x:3,y:-2,blur:6,spread:-1,inset:true}]);
});
it('ignores missing and invalid shadows and accepts an unblurred outline shadow',()=>{
 expect(parsePanelShadows('none')).toEqual([]);expect(parsePanelShadows('invalid')).toEqual([]);
 expect(parsePanelShadows('0px 1px', '#333333')).toEqual([{color:'#333333',x:0,y:1,blur:0,spread:0,inset:false}]);
});
