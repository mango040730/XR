import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEntryState, AVATARS } from '../src/entry-state.js';
import { formatBirthDate } from '../src/entry-input.js';
import { fieldError } from '../src/entry-validation.js';
const selectedLocation = {lat:37.56,lng:126.97,address:'위치 테스트 주소',placeId:'test-place',source:'manual',accuracy:null,confirmedAt:null};

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
    state.setLocation(selectedLocation);
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
  assert.equal(state.setLocation({lat:91,lng:0,address:'잘못된 좌표'}),false);
  assert.equal(state.setLocation(selectedLocation),true);
  assert.deepEqual(state.profile, { avatar: 'yellow', nickname: '우리 동네', location:selectedLocation });
  const copy = state.profile; copy.location.lat = 0;
  assert.equal(state.location.lat, selectedLocation.lat);
});

test('실제 좌표와 주소가 확보되기 전에는 접속 설정을 완료하지 않는다',()=>{
  const state=createEntryState();
  assert.equal(state.location,null); assert.equal(state.complete(),false);
  assert.equal(state.setLocation({lat:0,lng:0}),false);
  assert.equal(state.complete(),false);
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

test('아바타별 기본 닉네임을 실제 값으로 부여하고 편집한 닉네임은 같은 선택에서 유지한다',()=>{
  const state=createEntryState();
  for(const [index,name] of ['롤리','마이','시론','뮤티'].entries()) {
    if(index)state.selectAvatar(1);
    assert.equal(state.nickname,name);
    assert.equal(state.profile.nickname,name);
  }
  state.setNickname('직접 정한 이름');state.selectAvatar(1);
  assert.equal(state.nickname,'직접 정한 이름');
  state.selectAvatar(-1);assert.equal(state.nickname,'시론');
});

test('필수 입력·이메일·날짜·전화번호·인증번호·길이 조건을 필드별로 검증한다',()=>{
  for(const name of ['email','password','name','birth','phone','code','nickname']) {
    assert.ok(fieldError({name,value:'   ',required:true}));
  }
  for(const [name,value] of [['email','wrong-email'],['birth','2000.02.31'],['birth','2999.01.01'],['phone','abcdefghi'],['phone','01012'],['code','12345'],['code','12345a']]) {
    assert.ok(fieldError({name,value,required:true}));
  }
  for(const [name,value] of [['email','preview@example.com'],['birth','2000.02.29'],['phone','010-1234-5678'],['phone','+82 10 1234 5678'],['code','123456'],['nickname','롤리'],['password','preview']]) {
    assert.equal(fieldError({name,value,required:true}),'');
  }
  assert.ok(fieldError({name:'nickname',value:'a'.repeat(21),maxLength:20,required:true}));
  assert.equal(fieldError({name:'location-search',value:'',required:false}),'');
  assert.ok(fieldError({name:'location-search',value:''},{required:true}));
});
