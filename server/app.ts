import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Server } from 'socket.io';
import { RoomService } from './RoomService.ts';
import layouts from '../shared/rooms.json' with { type: 'json' };
import type { JoinRequest, RtcSignal, RoomLayout } from '../shared/social.ts';

export function createSocialServer(options: {origins?:string[];iceServers?:RTCIceServer[];staticDirectory?:string} = {}) {
  const service=new RoomService(layouts as RoomLayout[]);
  const origins=options.origins??['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4173','http://127.0.0.1:4174','http://127.0.0.1:4175'];
  const allowed=(origin:string|undefined)=>!origin||origins.includes(origin);
  const root=resolve(options.staticDirectory??'dist');
  const http=createServer(async(req,res)=>{
    if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true}));return;}
    if(req.url==='/api/social/config'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({iceServers:options.iceServers??[]}));return;}
    try{
      if(req.method!=='GET'&&req.method!=='HEAD')throw new Error('method');
      const pathname=decodeURIComponent(new URL(req.url??'/', 'http://local').pathname);
      const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+sep)||!(await stat(file)).isFile())throw new Error('missing');
      const content=await readFile(file);const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
      res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control',extname(file)==='.html'?'no-cache':'public, max-age=3600');res.end(req.method==='HEAD'?undefined:content);
    }catch{res.statusCode=404;res.end('Not found');}
  });
  const io=new Server(http,{serveClient:false,maxHttpBufferSize:65536,cors:{origin:(origin,cb)=>cb(null,allowed(origin))},allowRequest:(req,cb)=>cb(null,allowed(req.headers.origin)),pingTimeout:10000,pingInterval:5000});
  const broadcast=(key:string|undefined)=>{if(!key)return;const snapshot=service.snapshot(key);io.to(key).emit('room:snapshot',snapshot??{room:key,world:'',time:Date.now(),users:[]});};
  io.on('connection',socket=>{
    let tokens=60,last=Date.now(),generation=0;
    const rate=(cost=1)=>{const now=Date.now();tokens=Math.min(60,tokens+(now-last)*.03);last=now;if(tokens<cost)return false;tokens-=cost;return true;};
    socket.on('room:join',async(input:JoinRequest,ack:((result:unknown)=>void)|undefined)=>{
      if(typeof ack!=='function'||!rate(10))return;
      const request=++generation,old=service.membership.get(socket.id),result=service.join(socket.id,input);
      if(result.error){ack({error:result.error});return;}
      if(old)await socket.leave(old);
      await socket.join(result.key!);
      if(request!==generation||!socket.connected){if(service.membership.get(socket.id)!==result.key)await socket.leave(result.key!);return;}
      ack({self:result.state,snapshot:service.snapshot(result.key!),messages:service.roomFor(socket.id)?.messages,iceServers:options.iceServers??[]});broadcast(old);broadcast(result.key);
    });
    socket.on('room:leave',()=>{++generation;const key=service.leave(socket.id);if(key)void socket.leave(key);broadcast(key);});
    socket.on('player:state',(input:unknown)=>{if(!rate())return;if(!service.update(socket.id,input)){const user=service.user(socket.id);if(user)socket.emit('player:correction',user);}});
    socket.on('player:teleport',(input:unknown)=>{if(!rate(5))return;if(!service.teleport(socket.id,input)){const user=service.user(socket.id);if(user)socket.emit('player:correction',user);}});
    socket.on('player:wave',()=>{if(rate(3)&&service.wave(socket.id))broadcast(service.membership.get(socket.id));});
    socket.on('seat:request',(id:unknown,ack:((result:unknown)=>void)|undefined)=>{
      if(!rate(3)||typeof ack!=='function')return;
      const error=id===null||typeof id==='string'?service.seat(socket.id,id):'잘못된 좌석입니다.';
      ack({error,self:service.user(socket.id)});broadcast(service.membership.get(socket.id));
    });
    socket.on('chat:send',(text:unknown,ack:((result:unknown)=>void)|undefined)=>{
      const message=rate(3)?service.chat(socket.id,text):undefined;
      if(message)io.to(service.membership.get(socket.id)!).emit('chat:message',message);
      if(typeof ack==='function')ack({error:message?undefined:'메시지를 확인하거나 잠시 후 다시 보내 주세요.'});
    });
    socket.on('voice:state',(enabled:unknown)=>{if(typeof enabled!=='boolean'||!rate(2))return;const user=service.user(socket.id);if(user){user.voice=enabled;broadcast(service.membership.get(socket.id));}});
    socket.on('voice:signal',(signal:RtcSignal)=>{
      if(!rate(2)||!signal||typeof signal.to!=='string')return;
      const key=service.membership.get(socket.id),target=service.user(signal.to),self=service.user(socket.id);
      if(!key||service.membership.get(signal.to)!==key||!target?.voice||!self?.voice||signal.to===socket.id)return;
      const description=signal.description,candidate=signal.candidate;
      if(description&&(!['offer','answer'].includes(description.type)||typeof description.sdp!=='string'||description.sdp.length>32768))return;
      if(candidate&&(typeof candidate.candidate!=='string'||candidate.candidate.length>2048))return;
      if(!description&&!candidate)return;
      io.to(signal.to).emit('voice:signal',{from:socket.id,to:signal.to,room:key,description,candidate});
    });
    socket.on('disconnect',()=>{++generation;broadcast(service.leave(socket.id));});
  });
  const interval=setInterval(()=>{for(const key of service.rooms.keys())broadcast(key);},1000/15);interval.unref();
  return {http,io,service,close:async()=>{clearInterval(interval);await new Promise<void>(resolve=>io.close(()=>resolve()));}};
}
