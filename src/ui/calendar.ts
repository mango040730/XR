import { button, element } from '../components/designSystem';
import type { Draft } from './ServiceScreens';

export function calendar(draft: Draft): HTMLElement {
    const node = element('div', 'calendar');
    const header = element('header');
    header.append(button('‹', 'month:-1'), element('span', '', `${draft.year}년 ${draft.month + 1}월`), button('›', 'month:1'));
    node.append(header);
    ['일', '월', '화', '수', '목', '금', '토'].forEach(day => node.append(element('span', 'weekday', day)));
    const first = new Date(draft.year, draft.month, 1).getDay();
    for (let i = 0; i < first; i++) node.append(element('span'));
    for (let day = 1; day <= new Date(draft.year, draft.month + 1, 0).getDate(); day++) {
        const date = `${draft.year}-${String(draft.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const control = button(String(day), 'date:' + date);
        control.setAttribute('aria-label', date);
        control.dataset.selected = String(date === draft.date);
        control.setAttribute('aria-pressed', String(date === draft.date));
        node.append(control);
    }
    return node;
}
