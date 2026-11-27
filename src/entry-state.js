export const AVATARS = Object.freeze([
  { id: 'cream', file: 'avatar-default.png', summary: 'avatar-summary.png', ratio: 1107 / 1421, crop: null, label: '크림색 니트 캐릭터' },
  { id: 'hoodie', file: 'avatar-2-sheet.png', ratio: 1107 / 1441, crop: 'left', label: '베이지 후드 캐릭터' },
  { id: 'yellow', file: 'avatar-3-sheet.png', ratio: 1107 / 1441, crop: 'right', label: '노란색 니트 캐릭터' },
  { id: 'violet', file: 'avatar-4.png', ratio: 1107 / 1359, crop: null, label: '보라색 니트 캐릭터' },
]);

// UI preview only: credentials and identity fields never leave their forms.
// Completion and scene readiness can arrive in either order.
export function createEntryState(avatars = AVATARS) {
  return {
    step: 'login', avatar: 0, nickname: '', location: { x: 0.5, y: 0.5 },
    sceneReady: false, completed: false, entered: false,
    get canPreviousAvatar() { return this.avatar > 0; },
    get canNextAvatar() { return this.avatar < avatars.length - 1; },
    selectAvatar(delta) {
      const next = Math.max(0, Math.min(avatars.length - 1, this.avatar + delta));
      if (next === this.avatar) return false;
      this.avatar = next; return true;
    },
    setNickname(value) { this.nickname = value.trim(); return this.nickname.length > 0 && this.nickname.length <= 20; },
    setLocation(x, y) { this.location = { x: Math.max(0.05, Math.min(0.95, x)), y: Math.max(0.05, Math.min(0.95, y)) }; },
    complete() { this.completed = true; return this.enterIfReady(); },
    ready() { this.sceneReady = true; return this.enterIfReady(); },
    enterIfReady() {
      if (this.entered || !this.completed || !this.sceneReady) return false;
      this.entered = true; return true;
    },
    get profile() { return { avatar: avatars[this.avatar].id, nickname: this.nickname, location: { ...this.location } }; },
  };
}
export const entrySession = createEntryState();
