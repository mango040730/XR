export const modes = [
    { id: 'solo', name: '혼자 활동해요', description: '다른 사람들과 같은 공간에서 혼자 활동하며 즐겨요.', count: 12, world: 'woodworking' },
    { id: 'social', name: '친목을 다져요', description: '간단한 콘텐츠를 즐기며 사람들과 이야기를 나눠요.', count: 32, world: 'indoor-fishing' },
    { id: 'team', name: '협력하며 즐겨요', description: '사람들과 힘을 합쳐 재밌는 놀이를 즐겨요.', count: 21, world: 'bowling' },
] as const;
export type ModeId = typeof modes[number]['id'];
export const participants = [{ id: 'chang', name: '창용' }, { id: 'ryo', name: '료굥' }, { id: '707', name: '707' }];
export const neighborhoods = [{ id: 'hwayang', name: '화양동', people: 128, places: 12 }, { id: 'jayang', name: '자양동', people: 132, places: 9 }];
export const avatars = [{ id: 'mint', name: '민트 아바타', color: '#79cbb1' }, { id: 'amber', name: '앰버 아바타', color: '#d9b279' }];
export const places = [{ id: 'umai', name: '우마이도 건대점' }, { id: 'park', name: '어린이대공원 입구' }, { id: 'cafe', name: '동네 카페 (데모 장소)' }];
export const initialRooms = [
    { id: 'fish', name: '야르 낚시 즐겨요~', current: 4, capacity: 10 },
    { id: 'hungry', name: '배고프다', current: 15, capacity: 30 },
    { id: 'fire', name: '불멍팟', current: 2, capacity: 10 },
];
export const demoMessages = [
    { id: 'seed1', author: '김개똥', text: '아니 방금 개꿀잼' },
    { id: 'seed2', author: '제주사랑', text: 'ㄹㅇㅋㅋ 이따 한번 더 ㄱ?' },
    { id: 'seed3', author: '화이트하임', text: '탁센님 내일 찐으로 만나실?' },
    { id: 'seed4', author: '탁센', text: '낼은 쫌;; 학원 가야돼요' },
];
