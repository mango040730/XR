import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEntryState, AVATARS } from '../src/entry-state.js';
import { formatBirthDate } from '../src/entry-input.js';

test('숫자·점·붙여넣은 생년월일을 연월일 포맷으로 정리하고 입력 중인 숫자를 유지한다', () => {
  for (const [value, expected] of [
    ['', ''], ['2000', '2000'], ['20000', '2000.0'], ['200001', '2000.01'],
    ['2000010', '2000.01.0'], ['20000101', '2000.01.01'], ['2000.01.01', '2000.01.01'],
    ['2000-01-01', '2000.01.01'], ['2000010199', '2000.01.01'],
  ]) assert.equal(formatBirthDate(value), expected);
});

test('접속 설정 완료와 공간 준비가 어떤 순서로 도착해도 둘 다 끝나야 한 번만 입장한다', () => {
  for (const order of [['ready', 'complete'], ['complete', 'ready']]) {
    const state = createEntryState();
    assert.equal(state[order[0]](), false); assert.equal(state.entered, false);
    assert.equal(state[order[1]](), true); assert.equal(state.entered, true);
    assert.equal(state.ready(), false); assert.equal(state.complete(), false);
  }
});

test('선택한 캐릭터·닉네임·위치가 접속 프로필에 유지된다', () => {
  const state = createEntryState();
  assert.equal(AVATARS.length, 4);
  state.selectAvatar(2); assert.equal(AVATARS[state.avatar].id, 'yellow');
  assert.equal(state.setNickname('   '), false);
  assert.equal(state.setNickname('a'.repeat(21)), false);
  assert.equal(state.setNickname('  우리 동네  '), true);
  state.setLocation(1.2, -0.5);
  assert.deepEqual(state.profile, { avatar: 'yellow', nickname: '우리 동네', location: { x: .95, y: .05 } });
  const copy = state.profile; copy.location.x = 0;
  assert.equal(state.location.x, .95);
});

test('아바타 개수에 따라 양끝 탐색을 제한하고 단일 아바타는 양쪽 이동을 막는다', () => {
  for (const count of [1, 2, 4, 7]) {
    const avatars = Array.from({ length: count }, (_, i) => ({ id: `avatar-${i}` }));
    const state = createEntryState(avatars);
    assert.equal(state.canPreviousAvatar, false);
    assert.equal(state.selectAvatar(-1), false);
    assert.equal(state.avatar, 0);
    for (let i = 0; i < count; i++) {
      assert.equal(state.avatar, i);
      assert.equal(state.canPreviousAvatar, i > 0);
      assert.equal(state.canNextAvatar, i < count - 1);
      assert.equal(state.profile.avatar, avatars[i].id);
      assert.equal(state.selectAvatar(1), i < count - 1);
    }
    assert.equal(state.selectAvatar(100), false);
    for (let i = count - 1; i >= 0; i--) {
      assert.equal(state.avatar, i);
      assert.equal(state.selectAvatar(-1), i > 0);
    }
    state.selectAvatar(100); assert.equal(state.avatar, count - 1);
    state.selectAvatar(-100); assert.equal(state.avatar, 0);
  }
});
