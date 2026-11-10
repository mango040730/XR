export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
}
export function button(label: string, action: string): HTMLButtonElement {
    const node = element('button', 'ds-button', label);
    node.type = 'button';
    node.dataset.action = action;
    return node;
}
export function panel(title: string, detail = ''): HTMLElement {
    const node = element('section', 'ds-panel');
    node.append(element('h2', 'ds-title', title));
    if (detail)
        node.append(element('p', 'ds-copy', detail));
    return node;
}
export function screen(title: string, detail = ''): HTMLElement {
    const root = element('div', 'design-frame ds-screen');
    root.dataset.newDesign = 'true';
    root.append(element('h1', 'ds-heading', title));
    if (detail)
        root.append(element('p', 'ds-subtitle', detail));
    return root;
}
export function field(label: string, name: string, value = '', type = 'text'): HTMLElement {
    const group = element('label', 'ds-field', label);
    const input = element('input');
    input.type = type;
    input.name = name;
    input.value = value;
    input.dataset.action = 'edit:' + name;
    group.append(input);
    return group;
}
export function row(...nodes: HTMLElement[]): HTMLElement { const node = element('div', 'ds-row'); node.append(...nodes); return node; }
export function bind(node: HTMLElement, action: string, label: string): HTMLElement {
    const replacement = element('button', node.className);
    replacement.type = 'button';
    for (const attribute of Array.from(node.attributes))
        replacement.setAttribute(attribute.name, attribute.value);
    replacement.replaceChildren(...Array.from(node.childNodes));
    replacement.dataset.action = action;
    replacement.setAttribute('aria-label', label);
    node.replaceWith(replacement);
    return replacement;
}
