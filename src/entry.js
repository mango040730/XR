import './entry.css';
import { AVATARS, entrySession as state } from './entry-state.js';

const root = document.getElementById('entry-root');
const asset = file => `${import.meta.env.BASE_URL}ui/entry/${file}`;
const titles = { login: '로그인', identity: '본인 인증', avatar: '아바타 설정', nickname: '아바타 설정', location: '동네가 설정되었어요!' };
let editingLocation = false, loadingError = false;

function field(name, label, placeholder, attrs = '') {
  return `<label class="entry-field"><span>${label}</span><input name="${name}" placeholder="${placeholder}" ${attrs} required></label>`;
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
    case 'identity': return `<div class="entry-fields">${field('name', '이름', '홍길동', 'autocomplete="off" maxlength="40"')}${field('birth', '생년월일', '2000.01.01', 'inputmode="numeric" pattern="[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}" maxlength="10" autocomplete="off"')}${field('code', '인증번호', '숫자 6자리', 'inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off"')}</div><div class="entry-actions">${button('다음')}${button('PASS로 인증하기', 'pass-preview', true)}</div>`;
    case 'avatar': return `<div class="entry-carousel" role="group" aria-label="캐릭터 선택"><button class="entry-arrow" type="button" data-action="previous-avatar" aria-label="이전 캐릭터"><img src="${asset('caret-left.svg')}" alt="" width="40" height="40"></button><div class="entry-avatar-slot">${avatar()}</div><button class="entry-arrow" type="button" data-action="next-avatar" aria-label="다음 캐릭터"><img src="${asset('caret-right.svg')}" alt="" width="40" height="40"></button><span class="entry-sr" aria-live="polite">${state.avatar + 1} / ${AVATARS.length}</span></div><div class="entry-actions">${button('다음')}</div>`;
    case 'nickname': return `<div class="entry-nickname"><div class="entry-summary">${avatar(true)}</div>${field('nickname', '닉네임', '억울한 머쉬룸', 'maxlength="20" autocomplete="off"')}</div><div class="entry-actions">${button('생성')}</div>`;
    case 'location': return `<div class="entry-map${editingLocation ? ' is-editing' : ''}" tabindex="0" role="group" aria-label="동네 지도${editingLocation ? ', 클릭하거나 방향키로 위치를 선택하세요' : ''}"><img class="entry-map-image" src="${asset('neighborhood-map.png')}" alt="건대입구역 주변 동네 지도" draggable="false"><img class="entry-map-marker" src="${asset('map-marker.svg')}" alt="선택한 위치" width="24" height="24" style="left:${state.location.x * 100}%;top:${state.location.y * 100}%"></div><div class="entry-actions">${button(editingLocation ? '이 위치로 설정' : '좋아요')}${button('위치 재설정', 'reset-location', true)}</div>`;
  }
}
function render({ keepFocus = false } = {}) {
  const focused = keepFocus ? document.activeElement?.dataset.action : null;
  root.dataset.entryStep = state.step;
  root.innerHTML = `<div class="entry-backdrop" aria-hidden="true"></div><form class="entry-card" data-step="${state.step}" aria-labelledby="entry-title"><h1 id="entry-title" tabindex="-1">${titles[state.step]}</h1>${content()}<p class="entry-feedback" role="status" aria-live="polite"></p></form>`;
  if (state.step === 'nickname') root.querySelector('[name="nickname"]').value = state.nickname;
  if (focused) root.querySelector(`[data-action="${focused}"]`)?.focus({ preventScroll: true });
  else if (state.step !== 'login') root.querySelector('h1').focus({ preventScroll: true });
  if (loadingError) showLoadingError();
}
function go(step) { state.step = step; render(); }
function reveal() {
  document.documentElement.dataset.entry = 'entered';
  root.classList.add('is-leaving'); root.inert = true;
  window.dispatchEvent(new CustomEvent('space-enter', { detail: state.profile }));
  setTimeout(() => { root.remove(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250);
}
function showLoadingError() {
  root.querySelector('.entry-feedback').textContent = '공간을 불러오지 못했어요. 다시 시도해 주세요.';
  if (state.step === 'location') {
    const submit = root.querySelector('[type="submit"]'); submit.disabled = false; submit.textContent = '다시 시도';
  }
}
root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target; if (!form.reportValidity()) return;
  if (state.step === 'login') { form.reset(); go('identity'); }
  else if (state.step === 'identity') {
    const date = form.elements.birth.value.split('.').map(Number), actual = new Date(date[0], date[1] - 1, date[2]);
    if (actual.getFullYear() !== date[0] || actual.getMonth() !== date[1] - 1 || actual.getDate() !== date[2] || actual > new Date()) {
      form.elements.birth.setCustomValidity('올바른 생년월일을 입력해 주세요.'); form.elements.birth.reportValidity(); return;
    }
    form.reset(); go('avatar');
  } else if (state.step === 'avatar') go('nickname');
  else if (state.step === 'nickname') {
    if (!state.setNickname(form.elements.nickname.value)) { form.elements.nickname.setCustomValidity('닉네임을 입력해 주세요.'); form.elements.nickname.reportValidity(); return; }
    go('location');
  } else if (state.step === 'location') {
    if (editingLocation) { editingLocation = false; render(); return; }
    if (loadingError) { location.reload(); return; }
    if (state.complete()) reveal();
    else { const submit = form.querySelector('[type="submit"]'); submit.disabled = true; submit.textContent = '공간을 준비하고 있어요…'; }
  }
});
root.addEventListener('input', event => { if (event.target instanceof HTMLInputElement) event.target.setCustomValidity(''); });
root.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'signup') go('identity');
  else if (action === 'pass-preview') go('avatar');
  else if (action === 'previous-avatar' || action === 'next-avatar') { state.selectAvatar(action === 'next-avatar' ? 1 : -1); render({ keepFocus: true }); }
  else if (action === 'reset-location') { editingLocation = true; render(); root.querySelector('.entry-map').focus(); }
  else if (editingLocation && event.target.closest('.entry-map')) {
    const map = root.querySelector('.entry-map'), bounds = map.getBoundingClientRect();
    state.setLocation((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
    const marker = map.querySelector('.entry-map-marker'); marker.style.left = `${state.location.x * 100}%`; marker.style.top = `${state.location.y * 100}%`;
  }
});
root.addEventListener('keydown', event => {
  if (state.step === 'avatar' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); state.selectAvatar(event.key === 'ArrowRight' ? 1 : -1); render({ keepFocus: true });
  } else if (editingLocation && event.target.closest('.entry-map') && event.key.startsWith('Arrow')) {
    event.preventDefault(); state.setLocation(state.location.x + (event.key === 'ArrowRight' ? 0.02 : event.key === 'ArrowLeft' ? -0.02 : 0), state.location.y + (event.key === 'ArrowDown' ? 0.02 : event.key === 'ArrowUp' ? -0.02 : 0));
    render(); root.querySelector('.entry-map').focus();
  }
});
window.addEventListener('space-ready', () => { if (state.ready()) reveal(); });
window.addEventListener('space-error', () => { loadingError = true; showLoadingError(); });
window.addEventListener('space-backdrop', event => { root.style.setProperty('--entry-backdrop', `url("${event.detail}")`); });
document.documentElement.dataset.entry = 'pending';
render();
// Show the light DOM UI before parsing and preparing the large WebGL scene.
requestAnimationFrame(() => setTimeout(() => { void import('./main.js').catch(() => { loadingError = true; showLoadingError(); }); }, 0));
