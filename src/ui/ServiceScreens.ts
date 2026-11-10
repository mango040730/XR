import { calendar } from './calendar';
import * as frames from './figma';
import { bind, button, element, field, panel, row, screen } from '../components/designSystem';
import { avatars, modes, neighborhoods, participants, places } from '../data/demo';
import type { ModeId } from '../data/demo';
import type { DemoData } from '../state/types';
import type { Screen } from '../routing/ServiceRouter';
import { fixFrames, renderFixScreen } from './FixScreens';
export interface Draft {
    mode: ModeId;
    avatar: string;
    date: string;
    time: string;
    place: string;
    people: string[];
    month: number;
    year: number;
    modeRating: number;
    peopleRating: number;
    ratings: Record<string, number>;
    message: string;
    error: string;
    progress: string;
    sensor: string;
    edit: string;
}
export const sourceFrames: Partial<Record<Screen, () => HTMLElement>> = {
    login: frames.Frame1144_700, avatar: frames.Frame1144_715,
    'neighborhood-prompt': frames.Frame1144_750, 'neighborhood-map': frames.Frame1144_742, 'neighborhood-choice': frames.Frame1144_764,
    'my-room': frames.Frame1144_552, modes: frames.Frame1144_472, servers: frames.Frame1144_494,
    rating: frames.Frame1144_407, 'rating-done': frames.Frame1144_450,
    'appointment-date': frames.Frame1144_635, 'appointment-place': frames.Frame1144_574, 'appointment-done': frames.Frame1144_618,
};
function find(root: HTMLElement, id: string): HTMLElement { const node = root.querySelector<HTMLElement>(`[data-node-id="${id.includes(':') ? id : '1144:' + id}"]`); if (!node)
    throw new Error('디자인 노드 누락: ' + id); return node; }
function action(root: HTMLElement, id: string, name: string, label: string): HTMLElement { return bind(find(root, id), name, label); }
function text(root: HTMLElement, id: string, value: string): void { const node = find(root, id); const target = node.children.length === 1 && node.firstElementChild?.tagName === 'P' ? node.firstElementChild : node; target.textContent = value; }
function input(root: HTMLElement, id: string, name: string, label: string, value = '', type = 'text'): void {
    const old = find(root, id);
    const node = element('input', old.className);
    node.type = type;
    node.name = name;
    node.value = value;
    node.setAttribute('aria-label', label);
    node.dataset.action = 'edit:' + name;
    old.replaceWith(node);
}
function bottom(root: HTMLElement, ...nodes: HTMLElement[]): void { const holder = element('div', 'ds-bottom'); holder.append(...nodes); root.append(holder); }
function select(node: HTMLElement, value: boolean): void { node.dataset.selected = String(value); node.setAttribute('aria-pressed', String(value)); }
function common(root: HTMLElement): void {
    const pairs = [['bell-01', 'nav:invitations', '초대함'], ['menu-01', 'nav:profile', '프로필'], ['home-05', 'home', '마이룸'], ['calendar-check-01', 'nav:appointments', '작당모의'], ['users-03', 'nav:invite', '친구 초대'], ['akar-icons:bell', 'nav:invitations', '초대함'], ['akar-icons:three-line-horizontal', 'nav:profile', '프로필']] as const;
    for (const [name, act, label] of pairs)
        root.querySelectorAll<HTMLElement>(`[data-name="${name}"]`).forEach(node => bind(node, act, label));
}
function source(which: Screen): HTMLElement { const node = sourceFrames[which]!(); node.classList.add('design-frame'); node.dataset.screen = which; return node; }
export function renderReview(which: Screen): HTMLElement { return source(which); }
export function renderScreen(which: Screen, data: DemoData, draft: Draft): HTMLElement {
    if (fixFrames[which]) return renderFixScreen(which, draft, calendar(draft));
    let root: HTMLElement;
    if (sourceFrames[which]) {
        root = source(which);
        common(root);
        switch (which) {
            case 'login':
                input(root, '706', 'email', '이메일 (데모 입력)', '', 'email');
                input(root, '709', 'password', '비밀번호 (저장하지 않음)', '', 'password');
                action(root, '711', 'login', '데모 로그인');
                action(root, '713', 'login', '데모 사용자로 시작');
                break;
            case 'avatar':
                input(root, '724', 'nickname', '닉네임', data.profile.nickname);
                input(root, '737', 'birthday', '생년월일', data.profile.birthday, 'date');
                [['729', '여성'], ['731', '남성'], ['733', '기타']].forEach(([id, value]) => select(action(root, id, 'gender:' + value, value), data.profile.gender === value));
                action(root, '739', 'avatar-next', '다음 단계');
                action(root, '741', 'nav:avatar-picker', '아바타 선택');
                break;
            case 'neighborhood-prompt':
                action(root, '760', 'nav:neighborhood-choice', '좋아요');
                action(root, '762', 'nav:neighborhood-map', '이 위치가 아니에요');
                break;
            case 'neighborhood-map':
                bottom(root, button('생활권 선택하기', 'nav:neighborhood-choice'), button('이전', 'nav:neighborhood-prompt'));
                break;
            case 'neighborhood-choice':
                text(root, '772', `${data.profile.nickname}님의 동네를 선택해 주세요`);
                action(root, '784', 'neighborhood:hwayang', '화양동 선택');
                action(root, '796', 'neighborhood:jayang', '자양동 선택');
                break;
            case 'my-room':
                action(root, '564', 'logout', '로그아웃');
                action(root, '569', 'nav:modes', '시뮬레이션 하기');
                action(root, '560', 'voice', '음성 안내');
                action(root, '554', 'nav:chat', '데모 채팅 입력하기');
                action(root, '557', 'nav:chat', '채팅 열기');
                find(root, '563').replaceChildren(...data.messages.slice(-4).map(m => element('p', 'home-chat-line', `${m.author}: ${m.text}`)));
                break;
            case 'modes':
                action(root, '479', 'home', '마이룸으로');
                action(root, '490', 'nav:invite', '함께할 친구 초대');
                for (let i = 0; i < 3; i++)
                    action(root, `I1144:${475 + i};1045:1145`, 'mode:' + modes[i].id, modes[i].name + ' 입장하기');
                break;
            case 'servers': {
                action(root, '497', 'nav:modes', '모드 선택으로');
                text(root, '495', modes.find(m => m.id === draft.mode)!.name + ' · 서버 선택');
                ['518', '531', '544'].forEach((id, i) => { const room = data.rooms[i]; if (!room)
                    return; action(root, id, 'join:' + room.id, room.name + ' 입장'); text(root, ['512', '525', '538'][i], room.name); text(root, ['517', '530', '543'][i], `${room.current}/${room.capacity}`); });
                action(root, '548', 'create-room', '직접 데모 서버 만들기');
                if (data.rooms.length > 3) {
                    const extra = element('div', 'extra-rooms');
                    data.rooms.slice(3).forEach(r => extra.append(button(`${r.name} ${r.current}/${r.capacity}`, 'join:' + r.id)));
                    root.append(extra);
                }
                break;
            }
            case 'rating': {
                const filled = find(root, '422').querySelector('img')!.src;
                const outline = find(root, '430').querySelector('img')!.src;
                ['422', '424', '426', '428', '430'].forEach((id, i) => { const n = action(root, id, 'mode-rating:' + (i + 1), '모드 ' + (i + 1) + '점'); n.querySelector('img')!.src = i < draft.modeRating ? filled : outline; select(n, i < draft.modeRating); });
                ['437', '439', '441', '443', '445'].forEach((id, i) => { const n = action(root, id, 'people-rating:' + (i + 1), '참여 경험 ' + (i + 1) + '점'); n.querySelector('img')!.src = i < draft.peopleRating ? filled : outline; select(n, i < draft.peopleRating); });
                action(root, '447', 'rate', '평가 완료');
                bottom(root, ...participants.map(p => button(`${p.name} ${draft.ratings[p.id] || '미평가'}점`, 'person-rating:' + p.id)));
                break;
            }
            case 'rating-done':
                action(root, '458', 'home', '마이룸으로');
                [['461', 'chang'], ['464', 'ryo'], ['467', '707']].forEach(([id, name]) => action(root, id, 'person:' + name, participants.find(p => p.id === name)!.name + '와 소통'));
                break;
            case 'appointment-date': {
                action(root, '685', 'home', '취소');
                text(root, '696', '함께 만날 날짜와 시간을 선택해요');
                action(root, '642', 'appointment-simple', '약속만 잡을래요');
                action(root, '644', 'appointment-search', '장소 찾기');
                const holder = find(root, '648');
                holder.replaceChildren(calendar(draft));
                for (let i = 0; i < 14; i++) {
                    const time = String(i + 9).padStart(2, '0') + ':00';
                    select(action(root, String(655 + i * 2), 'time:' + time, time + ' 선택'), draft.time === time);
                }
                const next = button('다음 · 장소 선택', 'appointment-next');
                next.classList.add('appointment-next');
                root.append(next);
                break;
            }
            case 'appointment-place':
                text(root, '614', '함께 만날 장소를 선택해요');
                action(root, '599', 'appointment-create', '약속 생성');
                action(root, '603', 'nav:appointment-date', '날짜로 돌아가기');
                action(root, '591', 'place-search', '장소 검색');
                action(root, '588', 'place-next', '지도에서 데모 장소 선택');
                action(root, '581', 'appointment-simple', '약속만 잡을래요');
                action(root, '583', 'place-search', '장소 검색');
                {
                    const choices = element('div', 'place-choices');
                    places.forEach(p => { const n = button(p.name, 'place:' + p.id); select(n, draft.place === p.id); choices.append(n); });
                    root.append(choices);
                }
                break;
            case 'appointment-done': {
                const appointment = data.appointments.at(-1);
                if (appointment) {
                    text(root, '626', `[${appointment.participants.map(id => participants.find(p => p.id === id)?.name).join(', ')}]과 작당모의 완료!`);
                    text(root, '631', places.find(p => p.id === appointment.place)?.name || appointment.place);
                    text(root, '632', `${appointment.date} ${appointment.time}`);
                }
                action(root, '633', 'nav:appointments', '완료');
                break;
            }
        }
    }
    else {
        const titles: Partial<Record<Screen, [
            string,
            string
        ]>> = {
            'avatar-picker': ['나를 표현할 아바타', '최종 Blender 아바타 대신 임시 3D 아바타를 사용해요.'],
            loading: ['공간으로 이동하고 있어요', draft.progress], simulation: ['', ''], pause: ['잠시 쉬어갈까요?', '이동 입력이 일시정지되었어요.'],
            chat: ['이야기를 이어가요', '이 기기에만 저장되는 데모 채팅이에요. 상대방에게 전송되지 않아요.'], invite: ['함께할 친구를 초대해요', '데모 초대 · 실제 알림은 발송되지 않아요.'],
            'invite-done': ['초대장을 준비했어요', '이 기기에 데모 초대 상태를 저장했어요.'], invitations: ['도착한 초대', '예시 초대장으로 수락과 거절 흐름을 확인해요.'], profile: ['나의 활동', '프로필과 이 기기에 저장된 활동이에요.'],
            appointments: ['작당모의', '함께할 사람과 만날 날을 정해요. 실제 예약은 생성되지 않아요.'],
            'cardboard-guide': ['VR 박스로 들어가요', '스마트폰을 가로로 놓고 센서 권한을 허용해 주세요.'],
            'sensor-help': ['시선으로 선택해요', draft.sensor], 'confirm-home': ['마이룸으로 돌아갈까요?', '진행 중인 데모 시뮬레이션을 종료해요.'], error: ['잠깐, 확인이 필요해요', draft.error],
        };
        const [title, detail] = titles[which] || ['이어서 진행해요', ''];
        root = screen(title, detail);
        root.dataset.screen = which;
        switch (which) {
            case 'avatar-picker':
                root.append(row(...avatars.map(a => { const n = panel(a.name, '임시 3D 아바타 · 색상 ' + a.color); const b = button(data.profile.avatar === a.id ? '선택됨' : '선택하기', 'avatar:' + a.id); select(b, data.profile.avatar === a.id); n.append(b); return n; })));
                bottom(root, button('선택 완료', 'nav:avatar'));
                break;
            case 'loading':
                root.append(panel('3D 모델을 불러오고 있어요', draft.progress));
                bottom(root, button('취소하고 마이룸으로', 'home'));
                break;
            case 'simulation':
                root.classList.add('simulation-hud');
                root.replaceChildren();
                {
                    const top = element('div', 'simulation-top');
                    top.append(button('일시정지', 'nav:pause'), element('span', 'ds-copy', modes.find(m => m.id === data.session?.mode)?.name + ' · ' + (data.session?.serverName || '')), button('시뮬레이션 종료', 'finish'));
                    root.append(top);
                    const instructions = element('div', 'simulation-help', draft.message || '공간을 클릭해 시점 조절 · WASD 이동 · 중앙의 큐브를 클릭해 색상을 바꿔요');
                    root.append(instructions);
                    const move = element('div', 'simulation-move');
                    move.append(button('앞으로', 'step:forward'), button('뒤로', 'step:back'), button('왼쪽 30°', 'turn:left'), button('오른쪽 30°', 'turn:right'));
                    root.append(move);
                }
                break;
            case 'pause':
                root.append(panel('현재 시뮬레이션', data.session?.serverName || ''));
                bottom(root, button('계속하기', 'nav:simulation'), button('경험 평가하기', 'finish'), button('홈으로', 'nav:confirm-home'));
                break;
            case 'chat': {
                const p = panel('함께한 사람들', participants.map(p => p.name).join(' · '));
                const list = element('div', 'ds-list');
                if (!data.messages.length)
                    list.append(element('p', 'ds-copy', '아직 메시지가 없어요. 먼저 인사해 볼까요?'));
                data.messages.slice(-8).forEach(m => list.append(element('p', 'ds-copy', `${m.author}: ${m.text}`)));
                p.append(list);
                root.append(p);
                bottom(root, field('메시지', 'chat', ''), button('보내기', 'chat-send'), button('데모 인사 보내기', 'chat-preset'), button('마이룸으로', 'home'));
                break;
            }
            case 'invite':
                root.append(row(...participants.map(p => { const n = panel(p.name, '함께한 데모 사용자'); n.append(button('초대하기', 'invite:' + p.id)); return n; })));
                bottom(root, button('마이룸으로', 'home'));
                break;
            case 'invite-done':
                root.append(panel('초대 내역', `${data.invitations.at(-1)?.to || ''} · ${modes.find(m => m.id === draft.mode)!.name}`));
                bottom(root, button('초대함', 'nav:invitations'), button('마이룸으로', 'home'));
                break;
            case 'invitations': {
                const list = element('div', 'ds-list');
                for (const inv of data.invitations) {
                    const n = panel(`${inv.from} → ${inv.to}`, `${modes.find(m => m.id === inv.mode)?.name || ''} · ${{ pending: '대기 중', accepted: '수락', declined: '거절' }[inv.status]}`);
                    if (inv.direction === 'incoming' && inv.status === 'pending')
                        n.append(row(button('수락', 'accept:' + inv.id), button('거절', 'decline:' + inv.id)));
                    list.append(n);
                }
                root.append(list);
                bottom(root, button('친구 초대', 'nav:invite'), button('마이룸으로', 'home'));
                break;
            }
            case 'profile':
                root.append(row(panel(data.profile.nickname, `${avatars.find(a => a.id === data.profile.avatar)?.name} · ${neighborhoods.find(n => n.id === data.profile.neighborhood)?.name || '미선택'}`), panel('나의 활동', `시뮬레이션 평가 ${data.ratings.length}회\n약속 ${data.appointments.length}개\n초대 ${data.invitations.length}개`)));
                bottom(root, button('프로필 수정', 'nav:avatar'), button('마이룸으로', 'home'));
                break;
            case 'appointments': {
                const p = panel('함께할 사람을 선택해요');
                p.append(row(...participants.map(person => { const n = button(person.name, 'attendee:' + person.id); select(n, draft.people.includes(person.id)); return n; })));
                root.append(p);
                const list = element('div', 'ds-list');
                list.style.maxHeight = '160px';
                if (!data.appointments.length)
                    list.append(element('p', 'ds-copy', '아직 약속이 없어요.'));
                data.appointments.forEach(a => list.append(element('p', 'ds-copy', `${a.date} ${a.time} · ${places.find(p => p.id === a.place)?.name} · ${a.participants.map(id => participants.find(p => p.id === id)?.name).join(', ')}`)));
                root.append(list);
                bottom(root, button('새 약속 잡기', 'appointment-start'), button('마이룸으로', 'home'));
                break;
            }
            case 'cardboard-guide':
                root.append(panel('몰입형 UI 안내', '같은 공간 패널을 좌우 눈에 렌더링해요. 시선을 1.2초 유지하면 선택해요.\n입력은 데모 문구·선택 버튼으로 대체할 수 있어요. 센서가 없으면 화면을 드래그해 둘러보세요.\n카메라 접근은 사용하지 않아요. HTTPS 환경이 필요해요.'));
                bottom(root, button('센서 허용 후 VR 시작', 'cardboard-start'), button('이전 화면', 'back'));
                break;
            case 'sensor-help':
                root.append(panel('센서 상태', draft.sensor));
                bottom(root, button('권한 다시 요청', 'cardboard-start'), button('드래그 체험 시작', 'cardboard-fallback'), button('이전 화면', 'back'));
                break;
            case 'confirm-home':
                bottom(root, button('돌아가기', 'home'), button('계속하기', 'nav:simulation'));
                break;
            case 'error':
                root.append(panel('복구 안내', '입력값과 공간 로딩 상태를 확인하고 다시 시도해 주세요.'));
                bottom(root, button('이전 화면에서 다시 시도', 'back'), button('마이룸으로', 'home'));
                break;
        }
    }
    return root;
}
