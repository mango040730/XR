import { createSocialServer } from './app.ts';
let iceServers:RTCIceServer[];
try{iceServers=JSON.parse(process.env.RTC_ICE_SERVERS??'[]');if(!Array.isArray(iceServers))throw new Error('array');}
catch{throw new Error('RTC_ICE_SERVERS는 ICE 서버 JSON 배열이어야 합니다.');}
const origins=(process.env.ALLOWED_ORIGINS??'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3001,http://localhost:3001').split(',').map(s=>s.trim()).filter(Boolean);
const app=createSocialServer({origins,iceServers,staticDirectory:process.env.STATIC_DIRECTORY??'dist'});
const port=Number(process.env.PORT??3001),host=process.env.HOST??'127.0.0.1';
app.http.listen(port,host,()=>console.log(`Social server http://${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{void app.close().then(()=>process.exit(0));});
