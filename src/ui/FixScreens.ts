import ModeFrame from './figma/Fix51_919';
import RatingFrame from './figma/Fix50_1645';
import DateFrame from './figma/Fix49_807';
import PlaceFrame from './figma/Fix49_1070';
import UpdatedModeFrame from './figma/Update115_330';
import SimulationFrame from './figma/Update115_855';
import RatingOneFrame from './figma/Update115_403';
import RatingTwoFrame from './figma/Update115_442';
import { bind, button, element } from '../components/designSystem';
import { modes, participants, places } from '../data/demo';
import type { Draft } from './ServiceScreens';
import type { Screen } from '../routing/ServiceRouter';

export const fixFrames: Partial<Record<Screen, () => HTMLElement>> = {
    modes: ModeFrame, rating: RatingFrame,
    'appointment-date': DateFrame, 'appointment-place': PlaceFrame,
};
// rating2 is prepared for future pages; live rating always uses rating1.
export const updatedFrames = { modes: UpdatedModeFrame, simulation: SimulationFrame, rating1: RatingOneFrame, rating2: RatingTwoFrame };

export function renderUpdatedReview(which: keyof typeof updatedFrames): HTMLElement {
    const root = updatedFrames[which]();
    root.classList.add('design-frame', 'fix-frame', 'updated-frame');
    return root;
}

function socialControl(root: HTMLElement, id: string, control: string, label: string): HTMLButtonElement {
    const node = action(root, id, '', label) as HTMLButtonElement;
    delete node.dataset.action;
    node.dataset.socialControl = control;
    node.disabled = true;
    return node;
}

/** Only mounted once the requested mode world has successfully opened. */
export function renderSimulationScreen(): HTMLElement {
    const root = renderUpdatedReview('simulation');
    root.classList.add('live-world-frame', 'explorable-frame', 'simulation-frame');
    action(root, '115:867', 'finish', '마이룸 · 종료하고 평가하기');
    socialControl(root, '115:871', 'panel', '알림 및 참여 정보');
    const mic = socialControl(root, '115:857', 'mic', '마이크 켜기');
    mic.classList.add('simulation-mic');
    mic.setAttribute('aria-pressed', 'false');
    const log = find(root, '115:861');
    log.className = 'simulation-log';
    log.replaceChildren();
    log.setAttribute('role', 'log'); log.setAttribute('aria-live', 'polite');
    log.setAttribute('aria-label', '방 채팅');
    const source = find(root, '115:862');
    const form = element('form', 'simulation-chat-form');
    form.dataset.socialControl = 'chat'; form.dataset.nodeId = '115:862';
    const input = element('input');
    input.name = 'chat'; input.maxLength = 500; input.required = true;
    input.placeholder = '채팅 입력하기'; input.setAttribute('aria-label', '채팅 입력하기'); input.disabled = true;
    const send = action(root, '115:864', '', '메시지 보내기') as HTMLButtonElement;
    delete send.dataset.action; send.type = 'submit'; send.disabled = true;
    form.append(input, send); source.replaceWith(form);
    find(root, '115:860').classList.add('simulation-chat');
    return root;
}

function find(root: HTMLElement, id: string): HTMLElement {
    const node = root.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (!node) throw new Error('1차 픽스 노드 누락: ' + id);
    return node;
}
function action(root: HTMLElement, id: string, name: string, label: string): HTMLElement {
    return bind(find(root, id), name, label);
}
function selected(node: HTMLElement, value: boolean): void {
    node.dataset.selected = String(value);
    node.setAttribute('aria-pressed', String(value));
}
function notice(node: HTMLElement, kind: string): void {
    node.classList.add('fix-notice', kind);
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
}

/** Reuse the first-fix pill button's actual markup and typography. */
export function renderSpaceNavigation(label: string, name: string): HTMLElement {
    const source = RatingFrame();
    const next = action(source, '50:1678', name, label);
    find(next, '50:1681').textContent = label;
    next.classList.add('fix-space-next');
    const root = element('div', 'design-frame fix-frame fix-space-navigation explorable-frame');
    root.append(next);
    return root;
}
export function renderFixReview(which: Screen): HTMLElement {
    const root = fixFrames[which]!();
    root.classList.add('design-frame', 'fix-frame');
    root.dataset.screen = which;
    return root;
}

function modeCards(root: HTMLElement, strict: boolean): void {
    const compact = find(root, strict ? '115:332' : '51:921');
    const expanded = find(root, strict ? '115:370' : '51:972');
    const compactImage = compact.querySelector('img')!.getAttribute('src')!;
    const soloImage = expanded.querySelector('img')!.getAttribute('src')!;
    const peopleIcon = find(root, strict ? '115:377' : '51:978').querySelector('img')!.getAttribute('src')!;
    const compactPeopleIcon = find(root, strict ? '115:348' : '51:937').querySelector('img')!.getAttribute('src')!;
    const list = element('div', 'fix-mode-list');
    // Keep the design's visual order. No card is permanently selected.
    for (const id of ['social', 'solo', 'team'] as const) {
        const mode = modes.find(mode => mode.id === id)!;
        const card = button('', 'mode:' + id);
        card.className = 'fix-mode-card';
        card.setAttribute('aria-label', mode.name + ' 입장하기');
        const image = element('img', 'fix-mode-image');
        image.src = id === 'solo' ? soloImage : compactImage;
        image.dataset.designSlot = strict ? (id === 'solo' ? '115:371' : id === 'social' ? '115:342' : '115:361')
            : id === 'solo' ? '51:1011' : id === 'social' ? '51:931' : '51:950';
        image.alt = '';
        const copy = element('span', 'fix-mode-copy');
        const title = element('span', 'fix-mode-title', mode.name);
        const description = element('span', 'fix-mode-description', mode.description);
        const count = element('span', 'fix-mode-count');
        const icon = element('img');
        icon.src = id === 'solo' ? peopleIcon : compactPeopleIcon;
        icon.dataset.designSlot = strict ? (id === 'solo' ? '115:377' : id === 'social' ? '115:348' : '115:367')
            : id === 'solo' ? '51:978' : id === 'social' ? '51:937' : '51:956';
        icon.alt = ''; icon.width = 16; icon.height = 16;
        count.append(icon, strict ? '접속 인원은 입장 후 확인' : `${mode.count}명 참가 중`);
        copy.append(title, description, count);
        card.append(image, copy);
        list.append(card);
    }
    compact.remove(); expanded.remove(); find(root, strict ? '115:351' : '51:940').remove();
    root.append(list);
}

export function renderFixScreen(which: Screen, draft: Draft, calendar: HTMLElement, strict = false): HTMLElement {
    const root = strict && (which === 'modes' || which === 'rating')
        ? renderUpdatedReview(which === 'rating' ? 'rating1' : 'modes') : renderFixReview(which);
    root.classList.add('live-world-frame');
    // The running world's WebGL canvas is the backdrop for the live service.
    // Keep reference exports intact and retain card thumbnails / map content.
    root.querySelectorAll(':scope > [data-name="image 111"], :scope > [data-name="image 112"]').forEach(node => node.remove());
    for (const [icon, name, label] of strict ? [
        ['akar-icons:bell', 'nav:appointment-date', '작당모의'],
        ['akar-icons:three-line-horizontal', 'nav:modes', '모드 선택'],
    ] : [
        ['akar-icons:bell', 'nav:invitations', '초대함'],
        ['akar-icons:three-line-horizontal', 'nav:profile', '프로필'],
    ]) root.querySelectorAll<HTMLElement>(`[data-name="${icon}"]`).forEach(node => bind(node, name, label));
    switch (which) {
        case 'modes': {
            if (strict) {
                const ghost = find(root, '115:386');
                ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
                socialControl(root, '115:393', 'panel', '알림');
                action(root, '115:397', 'nav:appointment-date', '약속잡기').classList.add('mode-appointment-trigger');
                action(root, '115:399', 'nav:appointment-date', '작당모의');
            } else action(root, '51:960', 'home', '마이룸으로');
            const notice = find(root, strict ? '115:390' : '50:1642');
            notice.classList.add('fix-notice', 'fix-mode-notice');
            notice.setAttribute('role', 'status');
            notice.setAttribute('aria-live', 'polite');
            notice.setAttribute('aria-atomic', 'true');
            if (strict && draft.message) find(root, '115:391').textContent = draft.message;
            modeCards(root, strict);
            break;
        }
        case 'rating': {
            if (strict) {
                notice(find(root, '115:440'), 'fix-rating-notice');
                const complete = action(root, '115:436', 'rate', '평가 완료') as HTMLButtonElement;
                const filled = find(root, '115:411').querySelector('img')!.src;
                const outline = find(root, '115:417').querySelector('img')!.src;
                for (const [ids, name, value, label] of [
                    [[411, 413, 415, 417, 419], 'mode-rating', draft.modeRating, '모드'],
                    [[426, 428, 430, 432, 434], 'people-rating', draft.peopleRating, '참여 경험'],
                ] as const) ids.forEach((id, i) => {
                    const star = action(root, '115:' + id, name + ':' + (i + 1), `${label} ${i + 1}점`);
                    star.classList.add('fix-star');
                    star.querySelector('img')!.src = i < value ? filled : outline;
                    selected(star, i < value);
                });
                complete.disabled = !draft.modeRating || !draft.peopleRating;
                break;
            }
            notice(find(root, '50:1694'), 'fix-rating-notice');
            action(root, '50:1683', 'home', '마이룸으로');
            action(root, '50:1678', 'rate', '평가 완료');
            const filled = find(root, '50:1653').querySelector('img')!.src;
            const outline = find(root, '50:1661').querySelector('img')!.src;
            for (const [ids, name, value, label] of [
                [[1653, 1655, 1657, 1659, 1661], 'mode-rating', draft.modeRating, '모드'],
                [[1668, 1670, 1672, 1674, 1676], 'people-rating', draft.peopleRating, '참여 경험'],
            ] as const) ids.forEach((id, i) => {
                const star = action(root, '50:' + id, name + ':' + (i + 1), `${label} ${i + 1}점`);
                star.classList.add('fix-star');
                star.querySelector('img')!.src = i < value ? filled : outline;
                selected(star, i < value);
            });
            // Legacy regression fixtures retain their former supplemental controls.
            const details = element('div', 'fix-individual-ratings');
            details.setAttribute('aria-label', '개별 참여자 평가');
            const choices = element('div', 'fix-rating-choices');
            participants.forEach(person => choices.append(button(`${person.name} ${draft.ratings[person.id] || '미평가'}점`, 'person-rating:' + person.id)));
            details.append(choices);
            root.append(details);
            break;
        }
        case 'appointment-date':
            action(root, '49:1169', 'home', '마이룸으로');
            action(root, '49:814', 'appointment-simple', '약속만 잡을래요');
            action(root, '49:816', 'appointment-search', '방탈출 검색하기');
            action(root, '50:1700', 'appointment-next', '다음 · 장소 선택');
            if (strict) (find(root, '50:1700') as HTMLButtonElement).disabled = !draft.date || !draft.time;
            find(root, '49:820').replaceChildren(calendar);
            for (let i = 0; i < 14; i++) {
                const time = String(i + 9).padStart(2, '0') + ':00';
                selected(action(root, '49:' + (827 + i * 2), 'time:' + time, time + ' 선택'), draft.time === time);
            }
            break;
        case 'appointment-place': {
            action(root, '49:1123', 'home', '마이룸으로');
            action(root, '49:1078', 'appointment-simple', '약속만 잡을래요');
            action(root, '49:1080', 'place-search', '방탈출 검색하기');
            action(root, '49:1163', 'place-search', '장소 검색하기');
            action(root, '49:1238', 'nav:appointment-date', '날짜로 돌아가기');
            action(root, '50:1703', 'appointment-create', '약속 생성');
            if (strict) {
                const label = places.find(place => place.id === draft.place)!.name;
                find(root, '49:1166').textContent = label;
                find(root, '49:1163').setAttribute('aria-label', '장소 선택: ' + label);
                find(root, '49:1163').title = '클릭하면 다음 장소를 선택합니다.';
                (find(root, '50:1703') as HTMLButtonElement).disabled = !draft.date || !draft.time;
                break;
            }
            const choices = element('div', 'fix-place-choices');
            choices.setAttribute('aria-label', '만날 장소');
            places.forEach(place => {
                const choice = button(place.name, 'place:' + place.id);
                selected(choice, draft.place === place.id);
                choices.append(choice);
            });
            // The Figma map is a static reference; local demo choices remain operable.
            find(root, '49:1134').insertBefore(choices, find(root, '50:1706'));
            break;
        }
    }
    return root;
}
