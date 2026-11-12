import {afterEach,describe,expect,it} from 'vitest';
import {createSocialServer} from '../server/app';
import {verifySocialServer} from '../scripts/verify-social-server';

const origin='https://mango040730.github.io';
const servers:ReturnType<typeof createSocialServer>[]=[];
async function start(origins=[origin]){
  const server=createSocialServer({origins});servers.push(server);
  await new Promise<void>((resolve,reject)=>{server.http.once('error',reject);server.http.listen(0,'127.0.0.1',resolve);});
  const address=server.http.address();if(!address||typeof address==='string')throw new Error('서버 주소가 없습니다.');
  return {server,url:`http://127.0.0.1:${address.port}`};
}
afterEach(async()=>{for(const server of servers.splice(0))await server.close();});
describe('public social deployment verification',()=>{
  it('verifies the Pages origin, two actual WebSocket memberships and cleanup',async()=>{
    const {server,url}=await start();
    await expect(verifySocialServer(url,origin,2000)).resolves.toMatchObject({origin,peers:2,transport:'websocket'});
    await expect.poll(()=>server.service.membership.size).toBe(0);
    expect(server.service.rooms.size).toBe(0);
  });
  it('rejects a backend that excludes the actual Pages origin',async()=>{
    const {server,url}=await start(['https://another.example']);
    await expect(verifySocialServer(url,origin,1000)).rejects.toThrow();
    expect(server.service.membership.size).toBe(0);
  });
  it('rejects insecure remote URLs, credentials and repository paths',async()=>{
    for(const url of ['http://example.com','https://user:secret@example.com','https://github.com/mango040730/XR','https://example.com/?key=secret'])await expect(verifySocialServer(url)).rejects.toThrow('루트 주소');
  });
});
