type Child = Node | string | number | boolean | null | undefined | Child[];
export function h(type: string | ((props: Record<string, unknown>) => HTMLElement), props: Record<string, unknown> | null, ...children: Child[]): HTMLElement {
  if (typeof type === 'function') return type(props ?? {});
  const node = document.createElement(type);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key === '__self' || key === '__source') continue;
    if (value === undefined || value === null || value === false) continue;
    if (key === 'className') {
      node.className = String(value);
      if (String(value).includes('bg-[rgba(255,255,255,0.1)]') && String(value).includes('rounded') && !String(value).includes('rounded-[7.691px]')) node.dataset.glass = '';
    }
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  const append = (child: Child): void => {
    if (Array.isArray(child)) child.forEach(append);
    else if (child instanceof Node) node.append(child);
    else if (typeof child === 'string' || typeof child === 'number') node.append(String(child));
  };
  children.forEach(append); return node;
}
