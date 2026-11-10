import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const ids=[700,715,750,742,764,552,472,494,407,450,635,574,618];
const browser=await chromium.launch({channel:'chromium'});const page=await browser.newPage();
await mkdir('test-results/design-comparison',{recursive:true});const metrics=[];
for(const id of ids){
 const urls=await Promise.all([`tests/design-reference/reference-${id}.png`,`test-results/screenshots/figma-${id}.png`].map(async path=>'data:image/png;base64,'+(await readFile(path)).toString('base64')));
 const result=await page.evaluate(async({urls})=>{
  const imgs=await Promise.all(urls.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.src=src;})));
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=600;const c=canvas.getContext('2d');
  c.drawImage(imgs[0],0,0);const a=c.getImageData(0,0,1200,600);c.clearRect(0,0,1200,600);c.drawImage(imgs[1],0,0);const b=c.getImageData(0,0,1200,600);let total=0,different=0;
  const diff=c.createImageData(1200,600);for(let i=0;i<a.data.length;i+=4){let d=0;for(let j=0;j<3;j++){const delta=Math.abs(a.data[i+j]-b.data[i+j]);total+=delta;d=Math.max(d,delta);diff.data[i+j]=delta*3;}diff.data[i+3]=255;if(d>20)different++;}
  const pixels=[0,(300*1200+300)*4].map(i=>({reference:[...a.data.slice(i,i+3)],implementation:[...b.data.slice(i,i+3)]}));
  c.putImageData(diff,0,0);const difference=canvas.toDataURL();canvas.width=1200;canvas.height=300;c.drawImage(imgs[0],0,0,600,300);c.drawImage(imgs[1],600,0,600,300);
  return {meanAbsoluteChannelError:total/(1200*600*3),changedPixelsOver20Percent:different/(1200*600)*100,pixels,pair:canvas.toDataURL(),difference};
 },{urls});
 for(const [name,url]of [['pair',result.pair],['difference',result.difference]])await writeFile(`test-results/design-comparison/${id}-${name}.png`,Buffer.from(url.split(',')[1],'base64'));
 delete result.pair;delete result.difference;metrics.push({id,...result});
}
await writeFile('test-results/design-comparison/metrics.json',JSON.stringify(metrics,null,2));console.log(metrics.map(m=>({id:m.id,mae:m.meanAbsoluteChannelError.toFixed(2),changed:m.changedPixelsOver20Percent.toFixed(1),corner:m.pixels[0]})));await browser.close();
