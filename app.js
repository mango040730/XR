import { createThreeWorld } from "./three-world.js";

const MODES = [
  { id: 1, eyebrow: "혼자 놀기", title: "MODE 01", subtitle: "낚시터", scene: "숲속 낚시터" },
  { id: 2, eyebrow: "친목도모", title: "MODE 02", subtitle: "비즈 만들기", scene: "함께하는 비즈 공방" },
  { id: 3, eyebrow: "협력", title: "MODE 03", subtitle: "방탈출", scene: "방탈출" },
];

const ICONS = {
  users: "./assets/users.svg", settings: "./assets/settings.svg", bell: "./assets/bell.svg",
  notification: "./assets/notification.svg", logout: "./assets/logout.svg", phone: "./assets/phone.svg",
  chat: "./assets/chat.svg", heart: "./assets/heart.svg", filled: "./assets/star-filled.svg", empty: "./assets/star-empty.svg",
};

const state = { screen: "home", mode: 1, section: 0, nav: "chat", stereo: false, modeRating: 3, connectionRating: 2 };
const initialParams = new URLSearchParams(location.search);
if (["home","settings","world","square","review"].includes(initialParams.get("screen"))) state.screen = initialParams.get("screen");
if ([1,2,3].includes(Number(initialParams.get("mode")))) state.mode = Number(initialParams.get("mode"));
const eyes = [...document.querySelectorAll(".eye")];
let toastTimer;
let lastTap = 0;
let activeWorlds = [];
const homeLook = { x: 0, y: 0 };
const worldPlayer = { x: 0, z: 3, yaw: 0, pitch: 0, bob: 0 };
const movement = { keys: new Set(), x: 0, y: 0 };
let navigationFrame = 0;
let navigationTime = performance.now();
let lookDrag = null;

function iconButton(src, label) {
  return `<button class="icon-button" type="button" aria-label="${label}" data-toast="${label}"><img src="${src}" alt="" /></button>`;
}

function actionCluster(withPeople = false) {
  return `<div class="top-actions">
    ${withPeople ? `<div class="icon-cluster people-cluster">${iconButton(ICONS.users,"참여자")}<span class="count">10</span>${iconButton(ICONS.settings,"설정")}</div>` : ""}
    <div class="icon-cluster">${iconButton(ICONS.bell,"알림")}${iconButton(ICONS.notification,"메시지")}</div>
  </div>`;
}

function topbar(label, { logout = false, people = false, homeAction = true } = {}) {
  return `<div class="topbar">
    <div class="top-left">
      ${logout ? `<button class="pill icon-only" type="button" data-action="home" aria-label="나가기"><img src="${ICONS.logout}" width="20" height="20" alt="" /></button>` : ""}
      <button class="pill" type="button" ${homeAction ? `data-action="home"` : ""}>${label}</button>
    </div>
    ${actionCluster(people)}
  </div>`;
}

function bottomNav() {
  const items = [["phone",ICONS.phone,"통화"],["chat",ICONS.chat,"채팅"],["heart",ICONS.heart,"리뷰"]];
  return `<nav class="bottom-nav" aria-label="VR 도구">${items.map(([id,src,label]) => `<button class="nav-item ${state.nav===id?"active":""}" type="button" data-nav="${id}" aria-label="${label}"><img src="${src}" alt="" /></button>`).join("")}</nav>`;
}

function shared3DBackdrop(theme = "room") {
  return `<canvas class="home-3d home-3d--${theme}" data-theme="${theme}" width="1280" height="720" aria-hidden="true"></canvas><div class="home-3d-wash home-3d-wash--${theme}"></div>`;
}

function homeScene() {
  return `${shared3DBackdrop()}
    <section class="ui-zone panel-zone" aria-label="모드 선택">
      <div class="topbar"><div class="top-left"><button class="pill home-pill" type="button" data-action="square">Go to SQUARE →</button></div>${actionCluster(false)}</div>
      <div class="home-copy"><h1>Chose your mode</h1><p>Choose an experience to configure your VR environment.</p></div>
      <div class="mode-grid">${MODES.map(mode => `<article class="mode-card ${state.mode===mode.id?"selected":""}" data-mode-card="${mode.id}">
        <div class="eyebrow">${mode.eyebrow}</div><h2>${mode.title}</h2><p>${mode.subtitle}</p>
        <button class="enter" type="button" data-enter="${mode.id}">ENTER&nbsp; →</button>
      </article>`).join("")}</div>
    </section>`;
}

function sectionData() {
  if (state.mode === 1) return ["숲속 낚시터","배 낚시터","강릉 부둣가","산책"];
  if (state.mode === 2) return ["비즈 팔찌","비즈 반지","키링 만들기","자유 공예"];
  return ["초급 방","탐정 사무실","금고실","최종 탈출"];
}

function settingsScene() {
  const mode = MODES[state.mode-1];
  const sections = sectionData();
  return `${shared3DBackdrop()}
    <section class="ui-zone panel-zone" aria-label="환경 설정">
      ${topbar(mode.title,{logout:true,homeAction:false})}
      <aside class="settings-sidebar"><div class="panel-kicker">SECTIONS</div><div class="section-list">
        ${sections.map((label,i)=>`<button class="section-item ${state.section===i?"active":""}" type="button" data-section="${i}"><span class="section-index">0${i+1}</span><span class="section-label">${label}</span></button>`).join("")}
      </div></aside>
      <section class="settings-main"><div class="panel-kicker">Environment Settings</div>
        <div class="setting-rows">
          <div class="setting-row"><span>무슨</span><button class="value-pill active" type="button" data-cycle="DEFAULT">DEFAULT</button></div>
          <div class="setting-row"><span>조건을</span><button class="value-pill" type="button" data-cycle="STANDARD">STANDARD</button></div>
          <div class="setting-row"><span>넣을까</span><button class="value-pill" type="button" data-cycle="ENABLED">ENABLED</button></div>
        </div>
        <button class="settings-enter" type="button" data-action="world">ENTER&nbsp; →</button>
      </section>
    </section>`;
}

function worldHud({square=false,dimmed=false}={}) {
  const mode=MODES[state.mode-1];
  return `<section class="ui-zone ${dimmed?"dimmed":""}" aria-label="${square?"SQAURE":mode.scene}">
    ${topbar(square?"SQAURE":mode.scene,{logout:square,people:!square&&state.mode===1})}
    ${bottomNav()}
  </section>`;
}

function worldScene(square=false) {
  const themes = { 1: "fishing", 2: "beads", 3: "escape" };
  const theme = square ? "room" : themes[state.mode];
  return `${shared3DBackdrop(theme)}${worldHud({square})}`;
}

function stars(group,value) {
  return Array.from({length:5},(_,i)=>`<button class="star" type="button" data-rating="${group}" data-value="${i+1}" aria-label="${i+1}점"><img src="${i<value?ICONS.filled:ICONS.empty}" alt="" /></button>`).join("");
}

function reviewScene() {
  const themes = { 1: "fishing", 2: "beads", 3: "escape" };
  return `${shared3DBackdrop(themes[state.mode])}${worldHud({dimmed:true})}
    <section class="ui-zone panel-zone" aria-label="리뷰">
      <button class="pill review-title" type="button" data-action="home">REVIEW</button>
      <div class="review-grid">
        <div class="rating-card"><div class="panel-kicker">Mode</div><div class="rating-row">${stars("mode",state.modeRating)}</div></div>
        <div class="rating-card"><div class="panel-kicker">Connection</div><div class="rating-row">${stars("connection",state.connectionRating)}</div></div>
      </div>
    </section>`;
}

function sceneMarkup() {
  let body=homeScene();
  if(state.screen==="settings") body=settingsScene();
  if(state.screen==="world") body=worldScene(false);
  if(state.screen==="square") body=worldScene(true);
  if(state.screen==="review") body=reviewScene();
  return `<div class="scene" data-screen="${state.screen}">${body}</div>`;
}

function render() {
  activeWorlds.forEach(world => world.dispose());
  activeWorlds = [];
  const html=sceneMarkup();
  eyes.forEach(eye=>eye.innerHTML=html);
  bindInteractions();
  document.querySelectorAll(".home-3d").forEach(canvas => activeWorlds.push(startHomeWorld(canvas)));
  requestAnimationFrame(fitScenes);
}

function startHomeWorld(canvas) {
  try {
    return createThreeWorld(canvas, {
      getCameraState: () => ({
        x: worldPlayer.x,
        y: 3.4 + worldPlayer.bob,
        z: worldPlayer.z,
        yaw: worldPlayer.yaw + homeLook.x * .055,
        pitch: worldPlayer.pitch + homeLook.y * .035
      }),
      modelUrl: canvas.dataset.model || null
    });
  } catch (error) {
    console.error("Three.js WebGL initialization failed; using the Canvas fallback.", error);
    return { dispose: startLegacyCanvasWorld(canvas) };
  }
}

function startLegacyCanvasWorld(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const width = canvas.width;
  const height = canvas.height;
  let frame = 0;
  let running = true;
  let yaw = worldPlayer.yaw;
  let pitch = worldPlayer.pitch;
  const worldTheme = canvas.dataset.theme || "room";

  const project = (point, viewYaw, viewPitch) => {
    const px = point[0] - worldPlayer.x;
    const py = point[1] - (3.4 + worldPlayer.bob);
    const pz = point[2] - worldPlayer.z;
    const cy = Math.cos(viewYaw), sy = Math.sin(viewYaw);
    const cp = Math.cos(viewPitch), sp = Math.sin(viewPitch);
    const x = cy * px - sy * pz;
    const z0 = sy * px + cy * pz;
    const y = cp * py - sp * z0;
    const z = sp * py + cp * z0;
    if (z < 1) return null;
    const focal = 670;
    return { x: width / 2 + x * focal / z, y: height * .48 - y * focal / z, z, s: focal / z };
  };

  const line3d = (a, b, color, size, viewYaw, viewPitch) => {
    const pa = project(a, viewYaw, viewPitch), pb = project(b, viewYaw, viewPitch);
    if (!pa || !pb) return;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = color; ctx.lineWidth = size; ctx.stroke();
  };

  const quad3d = (points, color, stroke, viewYaw, viewPitch) => {
    const projected = points.map(point=>project(point,viewYaw,viewPitch));
    if(projected.some(point=>!point)) return;
    ctx.beginPath(); ctx.moveTo(projected[0].x,projected[0].y);
    projected.slice(1).forEach(point=>ctx.lineTo(point.x,point.y)); ctx.closePath();
    ctx.fillStyle=color; ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  };

  const cuboid = (x, y, z, sx, sy, sz, colors, viewYaw, viewPitch) => {
    const p = [
      [x-sx,y,z-sz],[x+sx,y,z-sz],[x+sx,y+sy,z-sz],[x-sx,y+sy,z-sz],
      [x-sx,y,z+sz],[x+sx,y,z+sz],[x+sx,y+sy,z+sz],[x-sx,y+sy,z+sz]
    ];
    const faces = [[0,1,2,3],[1,5,6,2],[5,4,7,6],[4,0,3,7],[3,2,6,7],[4,5,1,0]]
      .map((indices, i) => ({ indices, color: colors[i % colors.length], depth: indices.reduce((sum,n) => sum + (project(p[n],viewYaw,viewPitch)?.z || 0),0)/4 }))
      .sort((a,b)=>b.depth-a.depth);
    faces.forEach(face => {
      const points = face.indices.map(n=>project(p[n],viewYaw,viewPitch));
      if(points.some(point=>!point)) return;
      ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y);
      points.slice(1).forEach(point=>ctx.lineTo(point.x,point.y)); ctx.closePath();
      ctx.fillStyle=face.color; ctx.fill();
      ctx.strokeStyle="rgba(217,244,238,.12)"; ctx.lineWidth=.7; ctx.stroke();
    });
  };

  const glowOrb = (x,y,z,r,color,viewYaw,viewPitch) => {
    const point=project([x,y,z],viewYaw,viewPitch); if(!point)return;
    const radius=Math.max(2,r*point.s); const gradient=ctx.createRadialGradient(point.x,point.y,0,point.x,point.y,radius*2.6);
    gradient.addColorStop(0,color); gradient.addColorStop(.22,color); gradient.addColorStop(1,"rgba(114,246,222,0)");
    ctx.fillStyle=gradient; ctx.beginPath(); ctx.arc(point.x,point.y,radius*2.6,0,Math.PI*2); ctx.fill();
  };

  const foliageBlob = (x,y,z,r,color,viewYaw,viewPitch) => {
    const point=project([x,y,z],viewYaw,viewPitch); if(!point)return;
    const radius=Math.max(2,r*point.s);
    const gradient=ctx.createRadialGradient(point.x-radius*.28,point.y-radius*.35,radius*.08,point.x,point.y,radius);
    gradient.addColorStop(0,color[0]); gradient.addColorStop(.68,color[1]); gradient.addColorStop(1,color[2]);
    ctx.fillStyle=gradient; ctx.beginPath(); ctx.arc(point.x,point.y,radius,0,Math.PI*2); ctx.fill();
  };

  const polygon3d = (points, color, viewYaw, viewPitch, stroke = null) => {
    const projected=points.map(point=>project(point,viewYaw,viewPitch));
    if(projected.some(point=>!point))return;
    ctx.beginPath();ctx.moveTo(projected[0].x,projected[0].y);
    projected.slice(1).forEach(point=>ctx.lineTo(point.x,point.y));ctx.closePath();
    ctx.fillStyle=color;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  };

  const drawTree = (x,z,scale,shade,viewYaw,viewPitch) => {
    cuboid(x,0,z,.22*scale,3.4*scale,.22*scale,["#3f3427","#2c291f","#594536"],viewYaw,viewPitch);
    const palette = shade % 3 === 0
      ? ["#668052","#344c31","rgba(24,47,27,.15)"]
      : shade % 3 === 1
        ? ["#758d5d","#405a3a","rgba(29,49,30,.18)"]
        : ["#526e44","#2d4b32","rgba(17,39,24,.18)"];
    [[0,5.6,0,2.7],[-1.4,4.8,.1,2.1],[1.45,4.7,.15,2.15],[-.45,7,.2,2.15],[.75,6.4,-.15,2.25]].forEach(([dx,y,dz,r])=>
      foliageBlob(x+dx*scale,y*scale,z+dz*scale,r*scale,palette,viewYaw,viewPitch));
  };

  const drawFishingGear = time => {
    const sway=Math.sin(time*.0011)*3;
    const roundedRect=(x,y,w,h,r)=>{
      const radius=Math.min(r,w/2,h/2);
      ctx.beginPath();ctx.moveTo(x+radius,y);ctx.lineTo(x+w-radius,y);ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
      ctx.lineTo(x+w,y+h-radius);ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);ctx.lineTo(x+radius,y+h);
      ctx.quadraticCurveTo(x,y+h,x,y+h-radius);ctx.lineTo(x,y+radius);ctx.quadraticCurveTo(x,y,x+radius,y);ctx.closePath();
    };
    const drawRod=(fromX,fromY,toX,toY,flip=false)=>{
      ctx.save();
      ctx.lineCap="round";
      ctx.strokeStyle="rgba(8,12,13,.58)";ctx.lineWidth=12;
      ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.quadraticCurveTo((fromX+toX)/2+sway,fromY-170,toX,toY);ctx.stroke();
      ctx.strokeStyle="#1e2528";ctx.lineWidth=7;
      ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.quadraticCurveTo((fromX+toX)/2+sway,fromY-170,toX,toY);ctx.stroke();
      ctx.strokeStyle="#b34d3e";ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(fromX,fromY);ctx.lineTo(fromX+(flip?-34:34),fromY-96);ctx.stroke();
      ctx.strokeStyle="rgba(221,234,224,.55)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(toX,toY);ctx.quadraticCurveTo(width*.5,height*.39,width*.5+sway,height*.47);ctx.stroke();
      ctx.restore();
    };
    drawRod(width*.18,height*1.05,width*.46+sway,height*.36,false);
    drawRod(width*.82,height*1.05,width*.54+sway,height*.36,true);

    const drawHand=(x,y,flip=false)=>{
      ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.rotate(-.16);
      ctx.fillStyle="#d4a18a";ctx.strokeStyle="rgba(79,47,37,.34)";ctx.lineWidth=2;
      ctx.beginPath();ctx.ellipse(0,0,82,45,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(45,-22,53,17,-.38,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle="#59605b";roundedRect(-110,16,110,84,28);ctx.fill();
      ctx.fillStyle="#303b39";roundedRect(12,-21,25,97,12);ctx.fill();
      ctx.restore();
    };
    drawHand(width*.12,height*.86,false);drawHand(width*.88,height*.86,true);
  };

  const drawFishingWorld = (time,viewYaw,viewPitch) => {
    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,"#809494");sky.addColorStop(.5,"#9aaa8f");sky.addColorStop(1,"#465846");
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const mist=ctx.createLinearGradient(0,height*.16,0,height*.62);
    mist.addColorStop(0,"rgba(220,229,213,.2)");mist.addColorStop(1,"rgba(93,116,91,0)");
    ctx.fillStyle=mist;ctx.fillRect(0,0,width,height*.7);

    polygon3d([[-45,-.25,2],[45,-.25,2],[45,-.25,72],[-45,-.25,72]],"#364d33",viewYaw,viewPitch);
    // Pond surface and soft, layered banks.
    const pond=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;pond.push([Math.cos(a)*16,.035,27+Math.sin(a)*17]);}
    polygon3d(pond,"#314947",viewYaw,viewPitch,"rgba(174,198,167,.14)");
    const inner=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;inner.push([Math.cos(a)*12.8,.05,27+Math.sin(a)*13.5]);}
    polygon3d(inner,"rgba(70,98,82,.82)",viewYaw,viewPitch);
    for(let z=15;z<39;z+=2.8){
      const span=11.5*Math.sqrt(Math.max(0,1-Math.pow((z-27)/14,2)));
      line3d([-span,.07,z],[span,.07,z],`rgba(190,211,176,${.055+(z%3)*.01})`,1,viewYaw,viewPitch);
    }

    // Mossy stones create the irregular shoreline from the reference image.
    [[-15,11,2.4],[-10,10,2],[-5,9.5,2.2],[1,9.3,2.7],[7,10,2.2],[13,11.5,2.8],[-16,18,2.2],[16,19,2.5],[-14,37,2.8],[14,38,2.4]].forEach(([x,z,s],i)=>{
      cuboid(x,-.12,z,s,.34,s*.72,[i%2?"#5d6d50":"#536047","#3b4938","#778064"],viewYaw,viewPitch);
      foliageBlob(x,.33,z,s*.42,["#77925d","#4c6c43","rgba(38,66,37,.06)"],viewYaw,viewPitch);
    });

    // Deep forest: two staggered rows keep the space full while the pond stays open.
    const backTrees=[[-24,46,1.7],[-18,49,1.45],[-12,47,1.8],[-6,51,1.5],[0,48,1.8],[7,51,1.45],[13,47,1.75],[19,50,1.5],[25,46,1.7],[-30,39,1.45],[30,39,1.45]];
    const sideTrees=[[-21,13,1.25],[-22,21,1.35],[-23,30,1.45],[-21,38,1.5],[21,13,1.25],[22,21,1.35],[23,30,1.45],[21,38,1.5]];
    [...backTrees,...sideTrees].forEach(([x,z,s],i)=>drawTree(x,z,s,i,viewYaw,viewPitch));

    // Fern-like foreground vegetation.
    [[-13,8],[-9,7],[-5,8],[6,7],[10,8],[14,7]].forEach(([x,z],i)=>{
      for(let j=0;j<5;j++)line3d([x,.05,z],[x+(j-2)*.42,1.1+(j%2)*.35,z+.4+j*.15],i%2?"#708959":"#567047",3,viewYaw,viewPitch);
    });

    drawFishingGear(time);
    const vignette=ctx.createRadialGradient(width/2,height*.48,height*.18,width/2,height*.5,width*.73);
    vignette.addColorStop(.48,"rgba(17,31,22,0)");vignette.addColorStop(1,"rgba(14,25,18,.52)");
    ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
  };

  const drawBeadStudio = (time,viewYaw,viewPitch) => {
    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,"#eee4d5");sky.addColorStop(.58,"#d9c8b3");sky.addColorStop(1,"#9b816b");
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);

    const cream=["#e7ddcf","#cfc1b0","#f4ebdf"];
    const oak=["#a97c55","#7f593d","#c29469"];
    cuboid(0,-.35,23,21,.35,21,["#8b674d","#6f503d","#a77e5d"],viewYaw,viewPitch);
    cuboid(0,0,44,21,14,.3,cream,viewYaw,viewPitch);
    cuboid(-21,0,23,.3,14,21,["#d7cabb","#bcae9e"],viewYaw,viewPitch);
    cuboid(21,0,23,.3,14,21,["#d7cabb","#bcae9e"],viewYaw,viewPitch);
    cuboid(0,14,23,21,.3,21,["#f6eee4","#d7ccbf"],viewYaw,viewPitch);
    for(let z=3;z<44;z+=2.2)line3d([-20.5,.01,z],[20.5,.01,z],"rgba(75,48,32,.12)",1,viewYaw,viewPitch);

    // Back-wall storage shows that this is a shared craft studio.
    cuboid(-12,1,42.8,6.3,8.2,.45,["#b99069","#8a674c","#d3ad83"],viewYaw,viewPitch);
    for(let x=-17;x<=-7;x+=3.3)line3d([x,1.2,42.2],[x,8.9,42.2],"rgba(75,48,33,.28)",2,viewYaw,viewPitch);
    for(let y=3;y<=8;y+=2.4)line3d([-18, y,42.15],[-6,y,42.15],"rgba(75,48,33,.28)",2,viewYaw,viewPitch);
    const jarColors=[["#f2a6a2","#cf6c72","rgba(0,0,0,0)"],["#76b9c5","#367e91","rgba(0,0,0,0)"],["#f0c76b","#c69a3c","rgba(0,0,0,0)"],["#9ac784","#61934f","rgba(0,0,0,0)"]];
    [[-16,3.8],[-12.7,3.8],[-9.3,3.8],[-16,6.2],[-12.7,6.2],[-9.3,6.2]].forEach(([x,y],i)=>
      foliageBlob(x,y,41.6,.28,jarColors[i%jarColors.length],viewYaw,viewPitch));

    cuboid(11,4.3,43.3,7.5,6.2,.2,["#7d9997","#547474","#9eb3ac"],viewYaw,viewPitch);
    cuboid(11,4,42.9,.16,6,.25,["#f0e5d7","#bdaa96"],viewYaw,viewPitch);
    cuboid(3.4,4,42.9,.22,6,.25,["#f0e5d7","#bdaa96"],viewYaw,viewPitch);
    cuboid(18.6,4,42.9,.22,6,.25,["#f0e5d7","#bdaa96"],viewYaw,viewPitch);

    // Three visible seats plus the viewer position make a four-person arrangement.
    [[-10,17,1.57],[10,17,-1.57],[0,27,3.14]].forEach(([x,z,rotation],i)=>{
      cuboid(x,.1,z,2.25,.55,2.05,["#6e8277","#50645c","#91a096"],viewYaw,viewPitch);
      cuboid(x,.65,z+(i===2?1.65:0),2.25,3.1,.3,["#71877c","#53685f"],viewYaw,viewPitch);
      [[-1.7,-1.4],[1.7,-1.4],[-1.7,1.4],[1.7,1.4]].forEach(([dx,dz])=>cuboid(x+dx,.05,z+dz,.16,1.1,.16,["#493f37"],viewYaw,viewPitch));
    });

    // Large round communal work table.
    cuboid(0,.05,19,1.25,2.2,1.25,["#6e4a32","#4f3829","#8d6242"],viewYaw,viewPitch);
    const tableBottom=[],tableTop=[];
    for(let i=0;i<48;i++){
      const a=i/48*Math.PI*2;
      tableBottom.push([Math.cos(a)*9.1,2.22,19+Math.sin(a)*6.8]);
      tableTop.push([Math.cos(a)*9.2,2.55,19+Math.sin(a)*6.9]);
    }
    polygon3d(tableBottom,"#765237",viewYaw,viewPitch);
    polygon3d(tableTop,"#bd8d61",viewYaw,viewPitch,"rgba(255,239,218,.32)");

    // Four separate bead-making stations around the same table.
    const stations=[[-4.6,16.5],[4.6,16.5],[-4.3,21.5],[4.3,21.5]];
    stations.forEach(([x,z],station)=>{
      cuboid(x,2.57,z,2.3,.09,1.18,[station%2?"#e7d2bc":"#d9e2d8","#9d8771"],viewYaw,viewPitch);
      const palette=[
        ["#ffd4d0","#e97278","rgba(0,0,0,0)"],
        ["#d1ecf2","#4ba1b7","rgba(0,0,0,0)"],
        ["#ffe9aa","#dda936","rgba(0,0,0,0)"],
        ["#d9c8f3","#8c6ac4","rgba(0,0,0,0)"]
      ];
      for(let b=0;b<14;b++){
        const bx=x-1.65+(b%7)*.52;const bz=z-.55+Math.floor(b/7)*.48;
        foliageBlob(bx,2.76,bz,.095,palette[(b+station)%palette.length],viewYaw,viewPitch);
      }
      line3d([x-1.6,2.78,z+.72],[x+1.55,2.78,z+.72],"rgba(251,247,236,.8)",2,viewYaw,viewPitch);
    });
    foliageBlob(0,2.86,19,1.05,["rgba(255,248,235,.95)","rgba(226,209,188,.9)","rgba(115,87,62,.05)"],viewYaw,viewPitch);

    // Warm pendants visually gather everyone around the shared surface.
    [-5,5].forEach(x=>{
      line3d([x,14,19],[x,10.8,19],"rgba(79,60,45,.72)",2,viewYaw,viewPitch);
      glowOrb(x,10.25,19,.3,"rgba(255,214,141,.92)",viewYaw,viewPitch);
    });
    const warm=ctx.createRadialGradient(width*.5,height*.48,20,width*.5,height*.48,width*.48);
    warm.addColorStop(0,"rgba(255,225,178,.1)");warm.addColorStop(1,"rgba(80,49,31,.2)");
    ctx.fillStyle=warm;ctx.fillRect(0,0,width,height);
  };

  const drawEscapeRoom = (time,viewYaw,viewPitch) => {
    const backdrop=ctx.createLinearGradient(0,0,0,height);
    backdrop.addColorStop(0,"#263035");backdrop.addColorStop(.62,"#1d2528");backdrop.addColorStop(1,"#111719");
    ctx.fillStyle=backdrop;ctx.fillRect(0,0,width,height);
    const stone=["#343c3e","#252d2f","#465052"];
    cuboid(0,-.4,23,18,.4,20,["#242b2c","#171e20","#333b3c"],viewYaw,viewPitch);
    cuboid(0,0,43,18,13,.35,stone,viewYaw,viewPitch);
    cuboid(-18,0,23,.35,13,20,["#30383a","#20282a","#41494a"],viewYaw,viewPitch);
    cuboid(18,0,23,.35,13,20,["#30383a","#20282a","#41494a"],viewYaw,viewPitch);
    cuboid(0,13,23,18,.35,20,["#1d2426","#111719"],viewYaw,viewPitch);
    for(let z=4;z<43;z+=3)line3d([-17.5,.02,z],[17.5,.02,z],"rgba(127,143,143,.14)",1,viewYaw,viewPitch);
    for(let x=-17;x<=17;x+=3)line3d([x,.02,3],[x,.02,42],"rgba(127,143,143,.09)",1,viewYaw,viewPitch);
    for(let y=2;y<13;y+=2.2)line3d([-17.5,y,42.55],[17.5,y,42.55],"rgba(132,146,145,.16)",1,viewYaw,viewPitch);

    // Locked exit, keypad, and warning light establish the escape objective.
    cuboid(0,.05,42.25,4.3,10,.4,["#171d1f","#0d1214","#273034"],viewYaw,viewPitch);
    cuboid(0,.4,41.75,3.55,8.9,.2,["#485052","#252d30","#5b6465"],viewYaw,viewPitch);
    for(let y=2.5;y<9;y+=2.3)line3d([-3.3,y,41.45],[3.3,y,41.45],"rgba(12,17,18,.55)",3,viewYaw,viewPitch);
    cuboid(4.8,4.2,41.65,1.05,2.3,.25,["#171d20","#0b1012"],viewYaw,viewPitch);
    for(let y=5;y<=7;y+=.65)for(let x=4.35;x<=5.25;x+=.45)glowOrb(x,y,41.3,.035,"rgba(105,201,175,.9)",viewYaw,viewPitch);
    cuboid(0,10.8,41.5,2.3,.72,.24,["#5c1f22","#351315"],viewYaw,viewPitch);
    glowOrb(0,11.25,41.15,.12,"rgba(255,67,61,.88)",viewYaw,viewPitch);

    // Safe, evidence desk, wall clues and pipework.
    cuboid(-12,.1,34,3.6,6,3.2,["#343b3c","#202729","#4b5353"],viewYaw,viewPitch);
    cuboid(-12,1,30.65,2.9,4.5,.18,["#151b1d","#50595a"],viewYaw,viewPitch);
    foliageBlob(-12,4.25,30.35,.38,["#aab4ad","#4d5955","rgba(0,0,0,.12)"],viewYaw,viewPitch);
    cuboid(10,3.1,30,5,.35,2.4,["#5b4533","#3d3027","#715842"],viewYaw,viewPitch);
    [[6,28],[14,28],[6,32],[14,32]].forEach(([x,z])=>cuboid(x,.05,z,.2,3.1,.2,["#272727"],viewYaw,viewPitch));
    cuboid(9,3.48,29.2,2.1,.05,1.25,["#c5b99d","#8b8069"],viewYaw,viewPitch);
    line3d([8,3.56,29],[10.2,3.56,29.7],"rgba(106,36,31,.8)",3,viewYaw,viewPitch);

    [[-10,8],[-5,10],[8,8],[13,10]].forEach(([x,y],i)=>{
      cuboid(x,y,42.1,2.2,1.65,.12,[i%2?"#aa9f83":"#cbc0a2","#6f6654"],viewYaw,viewPitch);
    });
    line3d([-12,9.2,41.8],[-3,10.2,41.8],"rgba(146,49,43,.78)",2,viewYaw,viewPitch);
    line3d([-3,10.2,41.8],[10,8.4,41.8],"rgba(146,49,43,.78)",2,viewYaw,viewPitch);
    line3d([10,8.4,41.8],[14,10.5,41.8],"rgba(146,49,43,.78)",2,viewYaw,viewPitch);
    line3d([-17.3,11,12],[-17.3,11,36],"#4b5555",5,viewYaw,viewPitch);
    line3d([-17.3,11,36],[-12,11,40],"#4b5555",5,viewYaw,viewPitch);

    [12,31].forEach((z,i)=>{
      line3d([i?7:-5,13,z],[i?7:-5,10.3,z],"rgba(22,18,14,.9)",2,viewYaw,viewPitch);
      glowOrb(i?7:-5,9.8,z,.22,"rgba(239,181,93,.72)",viewYaw,viewPitch);
    });
    const pulse=.055+Math.sin(time*.003)*.012;
    const beam=ctx.createRadialGradient(width*.52,height*.5,15,width*.52,height*.5,width*.58);
    beam.addColorStop(0,`rgba(237,217,170,${pulse})`);beam.addColorStop(.55,"rgba(154,139,111,.025)");beam.addColorStop(1,"rgba(0,0,0,.58)");
    ctx.fillStyle=beam;ctx.fillRect(0,0,width,height);
  };

  const draw = time => {
    if (!running) return;
    const targetYaw = worldPlayer.yaw + homeLook.x * .055 + Math.sin(time * .00012) * .006;
    const targetPitch = worldPlayer.pitch + homeLook.y * .035;
    yaw += (targetYaw-yaw)*.035; pitch += (targetPitch-pitch)*.035;

    if(worldTheme==="fishing"){
      drawFishingWorld(time,yaw,pitch);
      frame=requestAnimationFrame(draw);
      return;
    }
    if(worldTheme==="beads"){
      drawBeadStudio(time,yaw,pitch);
      frame=requestAnimationFrame(draw);
      return;
    }
    if(worldTheme==="escape"){
      drawEscapeRoom(time,yaw,pitch);
      frame=requestAnimationFrame(draw);
      return;
    }

    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,"#d7c9b8"); sky.addColorStop(.52,"#b9aa98"); sky.addColorStop(1,"#796b5d");
    ctx.fillStyle=sky; ctx.fillRect(0,0,width,height);
    const aura=ctx.createRadialGradient(width*.5,height*.38,10,width*.5,height*.38,width*.58);
    aura.addColorStop(0,"rgba(255,238,199,.45)"); aura.addColorStop(.45,"rgba(221,188,142,.12)"); aura.addColorStop(1,"rgba(61,43,31,0)");
    ctx.fillStyle=aura; ctx.fillRect(0,0,width,height);

    const wall=["#d9cfc0","#c8bcae","#eadfd0"];
    const wood=["#6e4e3b","#5b3f31","#87634b"];
    cuboid(0,-.4,22,20,.4,20,wood,yaw,pitch);
    cuboid(0,0,42,20,14,.3,wall,yaw,pitch);
    cuboid(-20,0,22,.3,14,20,["#b8aa9a","#a99b8c","#cfc2b3"],yaw,pitch);
    cuboid(20,0,22,.3,14,20,["#b8aa9a","#a99b8c","#cfc2b3"],yaw,pitch);
    cuboid(0,14,22,20,.3,20,["#eee7dc","#d7ccbf"],yaw,pitch);

    const gridNear = Math.max(4, worldPlayer.z + 1.15);
    for(let z=4;z<=42;z+=1.7) line3d([-20,0,z],[20,0,z],"rgba(42,27,18,.15)",1,yaw,pitch);
    for(let x=-20;x<=20;x+=3.3) line3d([x,0,gridNear],[x,0,42],"rgba(255,226,190,.09)",1,yaw,pitch);
    line3d([-19.7,.35,41.6],[19.7,.35,41.6],"rgba(114,84,63,.38)",3,yaw,pitch);
    line3d([-19.6,.35,3],[-19.6,.35,41.5],"rgba(114,84,63,.3)",2,yaw,pitch);
    line3d([19.6,.35,3],[19.6,.35,41.5],"rgba(114,84,63,.3)",2,yaw,pitch);

    // Large window with a soft evening city view.
    cuboid(7,4.2,41.45,7.2,7.2,.18,["#182a33","#203845","#0d1c24"],yaw,pitch);
    cuboid(-.35,3.8,41.05,.28,8,.22,["#ece2d6","#c7b7a6"],yaw,pitch);
    cuboid(14.35,3.8,41.05,.28,8,.22,["#ece2d6","#c7b7a6"],yaw,pitch);
    cuboid(7,3.9,41.02,7.4,.25,.22,["#ece2d6","#c7b7a6"],yaw,pitch);
    cuboid(7,11.15,41.02,7.4,.25,.22,["#ece2d6","#c7b7a6"],yaw,pitch);
    cuboid(7,4,41,.16,7,.22,["#9a8b7c","#d8cbbc"],yaw,pitch);
    cuboid(0,4,40.8,1.2,7.4,.25,["#b88c70","#8c6550"],yaw,pitch);
    cuboid(14,4,40.8,1.2,7.4,.25,["#b88c70","#8c6550"],yaw,pitch);
    [[3,6],[6,8],[10,5],[12,9],[4,10],[9,7]].forEach(([x,y],i)=>glowOrb(x,y,40.8,.055,i%2?"rgba(255,205,111,.9)":"rgba(255,240,185,.85)",yaw,pitch));

    // Bed and bedding.
    cuboid(-10,0,27,5.4,1.05,6.6,["#6a4a3a","#52372c","#80614d"],yaw,pitch);
    cuboid(-10,1.05,26.7,5.15,.72,6.25,["#eee7dc","#d4cabd","#faf5ee"],yaw,pitch);
    cuboid(-10,1.76,28.2,5.05,.16,4.6,["#b86f57","#8f5142","#cf8970"],yaw,pitch);
    cuboid(-10,0,33.6,5.6,5,.3,["#775543","#5d4033"],yaw,pitch);
    cuboid(-12.4,1.82,22.2,2.1,.5,1.35,["#f5efe6","#d9d0c4"],yaw,pitch);
    cuboid(-7.7,1.82,22.2,2.1,.5,1.35,["#f5efe6","#d9d0c4"],yaw,pitch);

    // Rug and low coffee table.
    quad3d([[-5,.03,10],[5,.03,10],[5,.03,23],[-5,.03,23]],"#8f7d68","rgba(244,226,201,.28)",yaw,pitch);
    for(let z=11;z<23;z+=1.2) line3d([-4.8,.05,z],[4.8,.05,z],"rgba(242,225,202,.11)",1,yaw,pitch);
    cuboid(0,.2,16,3.3,1.35,2.3,["#7c5a43","#5d4030","#96735a"],yaw,pitch);

    // Desk, monitor and chair.
    cuboid(10,4,24,5,.35,2.3,["#8b684e","#684a38","#a17d60"],yaw,pitch);
    [[5.6,22],[14.4,22],[5.6,26],[14.4,26]].forEach(([x,z])=>cuboid(x,0,z,.28,4,.28,["#55443a","#3f312a"],yaw,pitch));
    cuboid(10,4.35,25.5,2.8,3,.22,["#253237","#151f23","#3a4b50"],yaw,pitch);
    cuboid(10,4.55,25.24,2.35,2.35,.08,["#668f91","#315b61"],yaw,pitch);
    cuboid(10,3.2,25.3,.22,1.2,.22,["#403934"],yaw,pitch);
    cuboid(8.5,1.7,19.2,2.1,.48,2,["#88756a","#66554d"],yaw,pitch);
    cuboid(8.5,2.1,20.8,2.1,3,.35,["#88756a","#66554d"],yaw,pitch);

    // Wardrobe and compact kitchenette.
    cuboid(-16.3,0,36.2,3,10.8,3.2,["#a88d73","#7b624f","#bca087"],yaw,pitch);
    line3d([-16.3,1,32.9],[-16.3,10.1,32.9],"rgba(75,53,40,.45)",2,yaw,pitch);
    glowOrb(-16.6,5.8,32.75,.035,"rgba(224,196,150,.85)",yaw,pitch);
    cuboid(16,0,35,3.6,3.5,4.3,["#b8aa96","#8f806f","#d1c5b4"],yaw,pitch);
    cuboid(16,3.5,35,3.75,.28,4.45,["#5d6664","#414a49"],yaw,pitch);
    cuboid(16,7.2,38,3.5,4.6,1.25,["#d6ccbd","#a99a88"],yaw,pitch);
    cuboid(17.1,3.9,33.5,1.35,.25,1.1,["#1e2525","#303a39"],yaw,pitch);

    // Plant, framed art and warm pendant lights.
    cuboid(-16,0,10,1.3,2,1.3,["#8d5f43","#60402f"],yaw,pitch);
    line3d([-16,2,10],[-16,7,10],"#4b7250",4,yaw,pitch);
    [[-17.3,5.7],[-14.8,5.2],[-16.8,6.8],[-15.1,7.4]].forEach(([x,y])=>glowOrb(x,y,10,.22,"rgba(83,130,82,.82)",yaw,pitch));
    cuboid(-8,6,41.35,3.2,4,.15,["#efe6d9","#8b6652"],yaw,pitch);
    cuboid(-8,6.25,41.05,2.55,3.3,.08,["#7e998e","#526b64"],yaw,pitch);
    [12,27].forEach(z=>{
      line3d([0,14,z],[0,11.8,z],"rgba(77,58,46,.8)",2,yaw,pitch);
      glowOrb(0,11.35,z,.24,"rgba(255,219,155,.88)",yaw,pitch);
    });

    const vignette=ctx.createRadialGradient(width/2,height/2,height*.12,width/2,height/2,width*.7);
    vignette.addColorStop(.45,"rgba(46,28,18,0)"); vignette.addColorStop(1,"rgba(35,22,15,.48)");
    ctx.fillStyle=vignette; ctx.fillRect(0,0,width,height);
    frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return () => { running=false; cancelAnimationFrame(frame); };
}

function resetPlayer(showMessage = true) {
  worldPlayer.x = 0;
  worldPlayer.z = 3;
  worldPlayer.yaw = 0;
  worldPlayer.pitch = 0;
  worldPlayer.bob = 0;
  homeLook.x = 0;
  homeLook.y = 0;
  if (showMessage) showToast("시작 위치로 돌아왔습니다");
}

function updateNavigation(time) {
  const delta = Math.min((time - navigationTime) / 1000, .05);
  navigationTime = time;
  const keys = movement.keys;
  let forward = movement.y;
  let strafe = movement.x;
  if (keys.has("w") || keys.has("arrowup")) forward += 1;
  if (keys.has("s") || keys.has("arrowdown")) forward -= 1;
  if (keys.has("d") || keys.has("arrowright")) strafe += 1;
  if (keys.has("a") || keys.has("arrowleft")) strafe -= 1;
  if (keys.has("q")) worldPlayer.yaw -= 1.7 * delta;
  if (keys.has("e")) worldPlayer.yaw += 1.7 * delta;

  const length = Math.hypot(forward, strafe);
  if (length > 1) { forward /= length; strafe /= length; }
  if (Math.abs(forward) > .01 || Math.abs(strafe) > .01) {
    const speed = (keys.has("shift") ? 8.4 : 4.8) * delta;
    const sin = Math.sin(worldPlayer.yaw), cos = Math.cos(worldPlayer.yaw);
    const inThemedWorld = ["world","review"].includes(state.screen);
    const activeTheme = inThemedWorld ? ({1:"fishing",2:"beads",3:"escape"}[state.mode]) : "room";
    const bounds = activeTheme === "fishing" ? { x: 14.5, near: 2.5, far: 9.2 }
      : activeTheme === "beads" ? { x: 18.5, near: 2.5, far: 40 }
      : activeTheme === "escape" ? { x: 16.5, near: 2.5, far: 39.5 }
      : { x: 18.5, near: 2.5, far: 39 };
    const nextX = Math.max(-bounds.x, Math.min(bounds.x, worldPlayer.x + (sin * forward + cos * strafe) * speed));
    const nextZ = Math.max(bounds.near, Math.min(bounds.far, worldPlayer.z + (cos * forward - sin * strafe) * speed));
    const obstacles = activeTheme === "fishing" ? []
      : activeTheme === "beads" ? [[0,19,9.7],[-10,17,2.6],[10,17,2.6],[0,27,2.8]]
      : activeTheme === "escape" ? [[-12,34,5],[10,30,5.5],[0,42,5]]
      : [[-10,27,7],[0,16,3.5],[10,24,5],[8.5,19,2.5],[-16.3,36,4],[16,35,5],[-16,10,2]];
    const isClear = (x,z) => obstacles.every(([ox,oz,radius]) => Math.hypot(x-ox,z-oz) > radius);
    if (isClear(nextX,worldPlayer.z)) worldPlayer.x = nextX;
    if (isClear(worldPlayer.x,nextZ)) worldPlayer.z = nextZ;
    worldPlayer.bob = Math.sin(time * .012) * .055;
  } else {
    worldPlayer.bob *= .84;
  }
  navigationFrame = requestAnimationFrame(updateNavigation);
}

function initTouchControls() {
  const movePad = document.getElementById("movePad");
  const moveStick = document.getElementById("moveStick");
  const lookPad = document.getElementById("lookPad");
  if (!movePad || !moveStick || !lookPad) return;

  let movePointer = null;
  const updateMove = event => {
    const rect = movePad.getBoundingClientRect();
    let x = event.clientX - (rect.left + rect.width / 2);
    let y = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * .34;
    const length = Math.hypot(x,y);
    if (length > radius) { x *= radius/length; y *= radius/length; }
    movement.x = x / radius;
    movement.y = -y / radius;
    moveStick.style.transform = `translate(${x}px,${y}px)`;
  };
  const stopMove = event => {
    if (movePointer !== event.pointerId) return;
    movePointer = null; movement.x = 0; movement.y = 0;
    moveStick.style.transform = "translate(0,0)";
  };
  movePad.addEventListener("pointerdown", event => {
    movePointer = event.pointerId; movePad.setPointerCapture(event.pointerId); updateMove(event); event.preventDefault();
  });
  movePad.addEventListener("pointermove", event => { if(movePointer===event.pointerId) updateMove(event); });
  movePad.addEventListener("pointerup", stopMove);
  movePad.addEventListener("pointercancel", stopMove);

  let lookPointer = null;
  let lastX = 0, lastY = 0;
  lookPad.addEventListener("pointerdown", event => {
    lookPointer=event.pointerId; lastX=event.clientX; lastY=event.clientY;
    lookPad.setPointerCapture(event.pointerId); event.preventDefault();
  });
  lookPad.addEventListener("pointermove", event => {
    if(lookPointer!==event.pointerId) return;
    worldPlayer.yaw += (event.clientX-lastX)*.012;
    worldPlayer.pitch = Math.max(-.34,Math.min(.28,worldPlayer.pitch+(event.clientY-lastY)*.008));
    lastX=event.clientX; lastY=event.clientY;
  });
  const stopLook = event => { if(lookPointer===event.pointerId) lookPointer=null; };
  lookPad.addEventListener("pointerup",stopLook);
  lookPad.addEventListener("pointercancel",stopLook);
}

function bindInteractions() {
  document.querySelectorAll("[data-action='home']").forEach(el=>el.addEventListener("click",()=>{state.screen="home";state.nav="chat";render();}));
  document.querySelectorAll("[data-action='square']").forEach(el=>el.addEventListener("click",()=>{state.screen="square";state.nav="phone";render();}));
  document.querySelectorAll("[data-action='world']").forEach(el=>el.addEventListener("click",()=>{state.screen="world";state.nav="chat";resetPlayer(false);render();}));
  document.querySelectorAll("[data-mode-card]").forEach(el=>el.addEventListener("click",e=>{if(e.target.closest("[data-enter]"))return;state.mode=Number(el.dataset.modeCard);render();}));
  document.querySelectorAll("[data-enter]").forEach(el=>el.addEventListener("click",()=>{state.mode=Number(el.dataset.enter);state.section=0;state.screen="settings";render();}));
  document.querySelectorAll("[data-section]").forEach(el=>el.addEventListener("click",()=>{state.section=Number(el.dataset.section);render();}));
  document.querySelectorAll("[data-cycle]").forEach(el=>el.addEventListener("click",()=>{el.classList.toggle("active");showToast(el.dataset.cycle);}));
  document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click",()=>{state.nav=el.dataset.nav;if(state.nav==="heart")state.screen="review";render();}));
  document.querySelectorAll("[data-rating]").forEach(el=>el.addEventListener("click",()=>{const key=el.dataset.rating==="mode"?"modeRating":"connectionRating";state[key]=Number(el.dataset.value);render();}));
  document.querySelectorAll("[data-toast]").forEach(el=>el.addEventListener("click",()=>showToast(el.dataset.toast)));
}

async function toggleStereo() {
  state.stereo=!state.stereo; document.body.classList.toggle("stereo",state.stereo); eyes[1].setAttribute("aria-hidden",String(!state.stereo));
  if(state.stereo){
    try {
      if (typeof window.DeviceOrientationEvent?.requestPermission === "function") await window.DeviceOrientationEvent.requestPermission();
    } catch (_) {}
    try{await document.documentElement.requestFullscreen?.();}catch(_){}
    try{await screen.orientation?.lock?.("landscape");}catch(_){}
    showToast("VR 보기 · 아이폰을 헤드셋에 넣어주세요");
  }
  else {try{if(document.fullscreenElement)await document.exitFullscreen();}catch(_){}}
  render();
}

function fitScenes(){eyes.forEach(eye=>{if(!eye.offsetWidth)return;const scene=eye.querySelector(".scene");const base=state.stereo?1040:1920;const scale=Math.max(eye.clientWidth/base,eye.clientHeight/1080);scene.style.transform=`translate(-50%, -50%) scale(${scale})`;});}
function showToast(message){const toast=document.getElementById("toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1800);}

async function loadIconData() {
  await Promise.all(Object.entries(ICONS).map(async ([name, src]) => {
    try {
      const response = await fetch(src);
      if (!response.ok) return;
      const svg = await response.text();
      ICONS[name] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    } catch (_) {}
  }));
}

window.addEventListener("resize",fitScenes);
window.addEventListener("orientationchange",()=>setTimeout(fitScenes,250));
window.addEventListener("deviceorientation", event => {
  if (typeof event.gamma === "number") homeLook.x = Math.max(-1,Math.min(1,event.gamma/35));
  if (typeof event.beta === "number") homeLook.y = Math.max(-1,Math.min(1,(event.beta-70)/35));
}, { passive: true });
window.addEventListener("blur",()=>{movement.keys.clear();movement.x=0;movement.y=0;});
document.addEventListener("pointerdown",event=>{
  if(event.pointerType!=="mouse" || event.button!==0 || event.target.closest("button,[data-mode-card],#touchControls")) return;
  lookDrag={id:event.pointerId,x:event.clientX,y:event.clientY};
  document.body.classList.add("looking");
});
document.addEventListener("pointermove",event=>{
  if(!lookDrag || lookDrag.id!==event.pointerId) return;
  worldPlayer.yaw += (event.clientX-lookDrag.x)*.0045;
  worldPlayer.pitch = Math.max(-.34,Math.min(.28,worldPlayer.pitch+(event.clientY-lookDrag.y)*.0035));
  lookDrag.x=event.clientX;lookDrag.y=event.clientY;
});
const endLookDrag=event=>{
  if(!lookDrag || lookDrag.id!==event.pointerId)return;
  lookDrag=null;document.body.classList.remove("looking");
};
document.addEventListener("pointerup",endLookDrag);
document.addEventListener("pointercancel",endLookDrag);
document.addEventListener("dblclick",event=>{if(!event.target.closest("button,#touchControls"))toggleStereo();});
document.addEventListener("touchend",event=>{
  if(event.target.closest("button,#touchControls"))return;
  const now=Date.now();if(now-lastTap<320)toggleStereo();lastTap=now;
},{passive:true});
document.addEventListener("keydown",event=>{
  const key=event.key.toLowerCase();
  if(["w","a","s","d","q","e","shift","arrowup","arrowdown","arrowleft","arrowright"].includes(key)){
    movement.keys.add(key);event.preventDefault();return;
  }
  if(["1","2","3"].includes(event.key)){state.mode=Number(event.key);state.screen="settings";render();}
  else if(key==="r")resetPlayer();
  else if(event.key==="Escape"||event.key==="Backspace"){state.screen="home";render();}
  else if(key==="v")toggleStereo();
});
document.addEventListener("keyup",event=>movement.keys.delete(event.key.toLowerCase()));

if(navigator.maxTouchPoints>0 || "ontouchstart" in window) document.body.classList.add("touch-capable");
initTouchControls();
navigationFrame=requestAnimationFrame(updateNavigation);
loadIconData().finally(render);
