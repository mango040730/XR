import { createThreeWorld } from "./three-world.js?v=threejs-phase1";

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
