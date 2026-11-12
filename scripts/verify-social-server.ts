import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { io, type Socket } from 'socket.io-client';
import type { JoinResult, RoomSnapshot } from '../shared/social.ts';

const publicOrigin='https://mango040730.github.io';

/** Exercise the same cross-origin handshake and membership used by the website. */
export async function verifySocialServer(address:string,origin=publicOrigin,timeout=15000){
  const url=new URL(address);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('공개 HTTPS 서버의 루트 주소가 필요합니다.');
  const health=await fetch(new URL('/health',url),{signal:AbortSignal.timeout(timeout)});
  if(!health.ok||(await health.json() as {ok?:boolean}).ok!==true)throw new Error('실시간 서버의 /health 응답을 확인해 주세요.');
  const sockets:Socket[]=[];
  const room='verify-'+randomUUID().slice(0,24);
  try{
    for(const nickname of ['배포 확인 A','배포 확인 B']){
      const socket=io(url.origin,{autoConnect:false,reconnection:false,timeout,transports:['websocket'],extraHeaders:{Origin:origin}});sockets.push(socket);
      await new Promise<void>((resolve,reject)=>{
        socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect();
      });
      const joined=await socket.timeout(timeout).emitWithAck('room:join',{world:'my-room',room,nickname}) as JoinResult;
      if(joined.error||!joined.self||joined.self.id!==socket.id||!joined.snapshot?.users.some(u=>u.id===socket.id))throw new Error(joined.error??'서버의 실제 참여 응답이 올바르지 않습니다.');
    }
    const peers=await new Promise<number>((resolve,reject)=>{
      const onSnapshot=(snapshot:RoomSnapshot)=>{
        if(snapshot.room!==`my-room:${room}`||!sockets.every(s=>snapshot.users.some(u=>u.id===s.id)))return;
        clearTimeout(timer);sockets[0].off('room:snapshot',onSnapshot);resolve(snapshot.users.length);
      };
      const timer=setTimeout(()=>{sockets[0].off('room:snapshot',onSnapshot);reject(new Error('두 사용자의 위치 목록이 공유되지 않습니다.'));},timeout);
      sockets[0].on('room:snapshot',onSnapshot);
    });
    return {server:url.origin,origin,world:'my-room',peers,transport:sockets[0].io.engine.transport.name};
  }finally{for(const socket of sockets)socket.disconnect();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const address=process.argv[2]||process.env.VITE_SOCIAL_SERVER_URL;
    if(!address)throw new Error('사용법: npm run verify:social -- https://실제-서버-주소');
    // Free instances can take about a minute to wake after inactivity.
    console.log(JSON.stringify(await verifySocialServer(address,publicOrigin,90000),null,2));
  }catch(error){console.error(error instanceof Error?error.message:'실시간 서버 검사 실패');process.exitCode=1;}
}
