import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEntryState, AVATARS } from '../src/entry-state.js';

test('접속 설정 완료와 공간 준비가 어떤 순서로 도착해도 둘 다 끝나야 한 번만 입장한다', () => {
  for (const order of [['ready', 'complete'], ['complete', 'ready']]) {
    const state = createEntryState();
    assert.equal(state[order[0]](), false); assert.equal(state.entered, false);
    assert.equal(state[order[1]](), true); assert.equal(state.entered, true);
    assert.equal(state.ready(), false); assert.equal(state.complete(), false);
  }
});

test('네 캐릭터가 한 명씩 순환하고 선택한 캐릭터·닉네임·위치가 접속 프로필에 유지된다', () => {
  const state = createEntryState();
  assert.equal(AVATARS.length, 4);
  state.selectAvatar(-1); assert.equal(AVATARS[state.avatar].id, 'violet');
  state.selectAvatar(1); assert.equal(AVATARS[state.avatar].id, 'cream');
  state.selectAvatar(2); assert.equal(AVATARS[state.avatar].id, 'yellow');
  assert.equal(state.setNickname('   '), false);
  assert.equal(state.setNickname('a'.repeat(21)), false);
  assert.equal(state.setNickname('  우리 동네  '), true);
  state.setLocation(1.2, -0.5);
  assert.deepEqual(state.profile, { avatar: 'yellow', nickname: '우리 동네', location: { x: .95, y: .05 } });
  const copy = state.profile; copy.location.x = 0;
  assert.equal(state.location.x, .95);
});
