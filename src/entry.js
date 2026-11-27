import './entry.css';
import { AVATARS, entrySession as state } from './entry-state.js';
import { formatBirthInput } from './entry-input.js';
import { mountLocationView } from './location-view.js';
import { validateEntryForm, validateField } from './entry-validation.js';
import { LOCATION_MODE } from './location-mode.js';
import { demoLocationMarkup } from './demo-location-view.js';

const root = document.getElementById('entry-root');
const asset = file => `${import.meta.env.BASE_URL}ui/entry/${file}`;
const titles = { login: '로그인', identity: '본인 인증', avatar: '아바타 설정', nickname: '아바타 설정', location: '동네가 설정되었어요!', connecting: '접속중' };
let locationView, loadingError = false;
let avatarRevision = 0, avatarAnimations = [];
let navigationRevision = 0;
let sceneStarted = false;
function prepareScene() {
  if (sceneStarted) return;
  sceneStarted = true;
  root.setAttribute('aria-busy', 'true');
  // Paint the waiting state before starting synchronous geometry/BVH/GPU work.
  // Keep that work out of every editable step, including the first login keystroke.
  requestAnimationFrame(() => setTimeout(() => {
    void import('./main.js').catch(() => { loadingError = true; showLoadingError(); });
  }, 0));
}
const avatarImages = new Map();
function preloadAvatar(file) {
  if (!avatarImages.has(file)) {
    const image = new Image(); image.draggable = false; image.src = asset(file);
    const ready = image.decode().catch(error => { avatarImages.delete(file); throw error; });
    avatarImages.set(file, { image, ready });
  }
  return avatarImages.get(file).ready;
}
function prepareAvatars() { return Promise.all(AVATARS.map(item => preloadAvatar(item.file))); }
function mountPreparedAvatar(container, file) {
  const image = avatarImages.get(file)?.image;
  if (!image?.complete || !image.naturalWidth) return;
  const placeholder = container.querySelector('img');
  image.alt = placeholder.alt; placeholder.replaceWith(image);
}
function updateAvatarNavigation() {
  root.querySelectorAll('.entry-dot').forEach((dot, index) => dot.setAttribute('aria-current', String(index === state.avatar)));
  const focused = document.activeElement;
  root.querySelector('[data-action="previous-avatar"]').hidden = !state.canPreviousAvatar;
  root.querySelector('[data-action="next-avatar"]').hidden = !state.canNextAvatar;
  if (focused?.matches('.entry-arrow[hidden]')) root.querySelector('.entry-carousel').focus({ preventScroll: true });
}

function field(name, label, placeholder, attrs = '') {
  return `<label class="entry-field"><span>${label}</span><input data-entry-input name="${name}" placeholder="${placeholder}" ${attrs} required><span class="entry-field-error" id="entry-error-${name}" hidden></span></label>`;
}
function button(label, action, secondary = false) {
  return `<button class="entry-button${secondary ? ' secondary' : ''}" ${action ? `type="button" data-action="${action}"` : 'type="submit"'}>${label}</button>`;
}
function avatar(summary = false) {
  const chosen = AVATARS[state.avatar], file = summary && chosen.summary ? chosen.summary : chosen.file;
  return `<div class="entry-avatar" data-avatar="${chosen.id}" ${chosen.crop ? `data-crop="${chosen.crop}"` : ''} style="--avatar-ratio:${chosen.ratio}"><img src="${asset(file)}" alt="${chosen.label}" draggable="false"></div>`;
}
function content() {
  switch (state.step) {
    case 'login': return `<div class="entry-fields">${field('email', '이메일', 'example@email.com', 'type="email" autocomplete="off"')}${field('password', '비밀번호', '비밀번호', 'type="password" autocomplete="off"')}</div><div class="entry-actions">${button('로그인')}${button('회원가입', 'signup', true)}</div>`;
    case 'identity': return `<div class="entry-fields">${field('name', '이름', '홍길동', 'autocomplete="off" maxlength="40"')}${field('birth', '생년월일', '2000.01.01', 'inputmode="numeric" pattern="[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}" maxlength="10" autocomplete="off"')}${field('phone', '전화번호', '01012345678', 'type="tel" inputmode="tel" autocomplete="off" maxlength="20"')}${field('code', '인증번호', '숫자 6자리', 'inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off"')}</div><div class="entry-actions">${button('다음')}${button('PASS로 인증하기', 'pass-preview', true)}</div>`;
    case 'avatar': return `<div class="entry-avatar-picker"><div class="entry-carousel" role="group" tabindex="-1" aria-label="캐릭터 선택"><button class="entry-arrow" type="button" data-action="previous-avatar" aria-label="이전 캐릭터"><img src="${asset('caret-left.svg')}" alt="" width="40" height="40"></button><div class="entry-avatar-slot">${avatar()}</div><button class="entry-arrow" type="button" data-action="next-avatar" aria-label="다음 캐릭터"><img src="${asset('caret-right.svg')}" alt="" width="40" height="40"></button><span class="entry-sr" aria-live="polite">${state.avatar + 1} / ${AVATARS.length}</span></div><div class="entry-pagination" role="group" aria-label="아바타 페이지">${AVATARS.map((item, index) => `<button class="entry-dot" type="button" data-action="select-avatar" data-index="${index}" aria-label="${index + 1}번째 아바타 선택" aria-current="${index === state.avatar}"><span></span></button>`).join('')}</div></div><div class="entry-actions">${button('다음')}</div>`;
    case 'nickname': return `<div class="entry-nickname"><div class="entry-summary">${avatar(true)}</div>${field('nickname', '닉네임', '닉네임을 입력해 주세요.', 'maxlength="20" autocomplete="off"')}</div><div class="entry-actions">${button('생성')}</div>`;
    case 'location': return LOCATION_MODE === 'demo' ? demoLocationMarkup(asset) : `<div class="entry-map" role="group" aria-label="동네 지도"><div class="entry-google-map"></div><div class="entry-map-shade" aria-hidden="true"></div><img class="entry-map-marker" src="${asset('map-marker.svg')}" alt="선택한 위치" width="24" height="24" hidden><div class="entry-map-tools" hidden><div class="entry-map-search-field entry-field"><input data-entry-input name="location-search" aria-label="동네 주소 검색" placeholder="동·도로명·주소 검색" autocomplete="off" maxlength="200"><span class="entry-field-error" id="entry-error-location-search" hidden></span></div><button type="button" data-action="search-location" aria-label="주소 검색">검색</button><button type="button" data-action="current-location" aria-label="현재 위치 다시 찾기">현재 위치</button></div><div class="entry-map-state" role="status" aria-live="polite"><span class="entry-map-message">지도를 불러오고 있어요…</span><button type="button" data-action="retry-location" hidden>다시 시도</button></div><p class="entry-map-address" hidden></p></div><div class="entry-actions">${button('좋아요')}${button('위치 재설정', 'reset-location', true)}</div><p class="entry-map-policies"><a href="${import.meta.env.BASE_URL}location-privacy.html" target="_blank" rel="noopener">위치정보 안내</a> · <a href="${import.meta.env.BASE_URL}terms.html" target="_blank" rel="noopener">이용약관</a></p>`;
  }
}
function render({ keepFocus = false } = {}) {
  locationView?.dispose(); locationView = null;
  const focused = keepFocus ? document.activeElement?.dataset.action : null;
  root.dataset.entryStep = state.step;
  const backdrop = '<div class="entry-backdrop" aria-hidden="true"></div>';
  root.innerHTML = state.step === 'connecting'
    ? `${backdrop}<section class="entry-card entry-notice" data-step="connecting" role="${loadingError ? 'alert' : 'status'}" aria-live="${loadingError ? 'assertive' : 'polite'}" aria-busy="${!loadingError}" aria-labelledby="entry-title"><h1 id="entry-title" tabindex="-1">${loadingError ? '접속하지 못했어요' : titles.connecting}</h1>${loadingError ? `<div class="entry-actions">${button('다시 시도', 'retry-space')}</div>` : ''}</section>`
    : `${backdrop}<form class="entry-card" data-step="${state.step}" aria-labelledby="entry-title" novalidate><h1 id="entry-title" tabindex="-1">${titles[state.step]}</h1>${content()}<p class="entry-feedback" role="status" aria-live="polite"></p></form>`;
  if (state.step === 'avatar') {
    mountPreparedAvatar(root.querySelector('.entry-avatar'), AVATARS[state.avatar].file);
    updateAvatarNavigation();
  }
  if (state.step === 'nickname') root.querySelector('[name="nickname"]').value = state.nickname;
  if (state.step === 'location') locationView = mountLocationView(root, { onConfirm: selected => {
    if (!state.setLocation(selected)) return;
    if (state.complete()) reveal();
    else {
      state.step = 'connecting'; render();
      prepareScene();
    }
  } });
  if (focused) root.querySelector(`[data-action="${focused}"]`)?.focus({ preventScroll: true });
  else if (state.step !== 'login') root.querySelector('h1').focus({ preventScroll: true });
  if (loadingError && state.step !== 'connecting') showLoadingError();
}
async function go(step) {
  const navigation = ++navigationRevision;
  if (step === 'avatar') {
    const buttons = [...root.querySelectorAll('button')]; buttons.forEach(button => { button.disabled = true; });
    try { await prepareAvatars(); }
    catch {
      if (navigation === navigationRevision) {
        buttons.forEach(button => { button.disabled = false; });
        root.querySelector('.entry-feedback').textContent = '아바타를 불러오지 못했어요. 다시 시도해 주세요.';
      }
      return;
    }
    if (navigation !== navigationRevision) return;
  }
  avatarRevision++; avatarAnimations.forEach(animation => animation.cancel()); avatarAnimations = [];
  state.step = step; render();
}
async function changeAvatar(delta) {
  if (!delta) return;
  if (!state.selectAvatar(delta)) return;
  const revision = ++avatarRevision;
  const slot = root.querySelector('.entry-avatar-slot');
  if (!slot) return;
  slot.dataset.switching = 'true';
  const template = document.createElement('template'); template.innerHTML = avatar();
  const incoming = template.content.firstElementChild;
  if (revision !== avatarRevision || state.step !== 'avatar' || !slot.isConnected) return;
  const outgoing = slot.lastElementChild;
  const style = getComputedStyle(outgoing), opacity = style.opacity, transform = style.transform;
  avatarAnimations.forEach(animation => animation.cancel());
  // Reuse the already decoded image after removing any older transition layer.
  slot.replaceChildren(outgoing);
  mountPreparedAvatar(incoming, AVATARS[state.avatar].file);
  slot.replaceChildren(outgoing, incoming);
  outgoing.setAttribute('aria-hidden', 'true');
  root.querySelector('.entry-carousel .entry-sr').textContent = `${state.avatar + 1} / ${AVATARS.length}`;
  updateAvatarNavigation();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    slot.replaceChildren(incoming); delete slot.dataset.switching; return;
  }
  const options = { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' };
  const direction = Math.sign(delta);
  avatarAnimations = [
    outgoing.animate([{ opacity, transform }, { opacity: 0, transform: `translateX(${-direction * 36}px)` }], options),
    incoming.animate([{ opacity: 0, transform: `translateX(${direction * 36}px)` }, { opacity: 1, transform: 'translateX(0)' }], options),
  ];
  await Promise.all(avatarAnimations.map(animation => animation.finished.catch(() => {})));
  if (revision === avatarRevision && slot.isConnected) {
    avatarAnimations.forEach(animation => animation.cancel()); avatarAnimations = [];
    slot.replaceChildren(incoming); delete slot.dataset.switching;
  }
}
function reveal() {
  locationView?.dispose();
  document.documentElement.dataset.entry = 'entered';
  root.classList.add('is-leaving'); root.inert = true;
  window.dispatchEvent(new CustomEvent('space-enter', { detail: state.profile }));
  setTimeout(() => { root.remove(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250);
}
function showLoadingError() {
  root.removeAttribute('aria-busy');
  if (state.step === 'connecting') { render(); return; }
  root.querySelector('.entry-feedback').textContent = '공간을 불러오지 못했어요. 다시 시도해 주세요.';
  if (state.step === 'location') {
    const submit = root.querySelector('[type="submit"]'); submit.disabled = false; submit.textContent = '다시 시도';
  }
}
root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target; if (!validateEntryForm(form)) return;
  if (state.step === 'login') { form.reset(); go('identity'); }
  else if (state.step === 'identity') {
    void go('avatar');
  } else if (state.step === 'avatar') go('nickname');
  else if (state.step === 'nickname') {
    if (!state.setNickname(form.elements.nickname.value)) return;
    go('location');
  } else if (state.step === 'location') {
    if (loadingError) { location.reload(); return; }
    void locationView?.confirm();
  }
});
root.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.name === 'birth' && !event.isComposing) formatBirthInput(event.target);
  if (!event.isComposing && event.target.getAttribute('aria-invalid') === 'true') validateField(event.target, { required: event.target.name === 'location-search' || event.target.required });
});
root.addEventListener('compositionend', event => {
  if (event.target.name === 'birth') formatBirthInput(event.target);
  if (event.target.matches('[data-entry-input][aria-invalid="true"]')) validateField(event.target);
});
root.addEventListener('focusout', event => {
  if (event.target.matches('[data-entry-input]')) validateField(event.target);
});
root.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'signup') go('identity');
  else if (action === 'retry-space') location.reload();
  else if (action === 'pass-preview') go('avatar');
  else if (action === 'previous-avatar' || action === 'next-avatar') { void changeAvatar(action === 'next-avatar' ? 1 : -1); }
  else if (action === 'select-avatar') { void changeAvatar(Number(event.target.closest('[data-index]').dataset.index) - state.avatar); }
});
root.addEventListener('keydown', event => {
  if (state.step === 'avatar' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); void changeAvatar(event.key === 'ArrowRight' ? 1 : -1);
  }
});
window.addEventListener('pagehide', () => locationView?.dispose());
window.addEventListener('pageshow', event => { if (event.persisted && state.step === 'location' && !state.completed) render(); });
window.addEventListener('space-ready', () => { if (state.ready()) reveal(); });
window.addEventListener('space-error', () => { loadingError = true; showLoadingError(); });
window.addEventListener('space-backdrop', event => { root.style.setProperty('--entry-backdrop', `url("${event.detail}")`); });
document.documentElement.dataset.entry = 'pending';
render();
// Only lightweight UI assets prepare during editable steps. The scene starts
// after the final confirmation, so rendering cannot stall text input.
void prepareAvatars().catch(() => {});
