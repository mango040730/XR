import { CanvasTexture, SRGBColorSpace } from 'three';
import { parsePanelShadows } from './panelShadows';
/** Paint live, measured component elements, never a screenshot of a Figma frame.
 * Browser layout owns wrapping; Range rectangles provide the exact text positions.
 * Canvas reproduces solid surfaces and outer/inset component shadows; backdrop blur remains PC-only. */
export class DomPanelTexture {
    readonly canvas = document.createElement('canvas');
    readonly texture: CanvasTexture;
    private images = new Map<string, HTMLImageElement>();
    constructor() { this.canvas.width = 1200; this.canvas.height = 600; this.texture = new CanvasTexture(this.canvas); this.texture.colorSpace = SRGBColorSpace; }
    paint(root: HTMLElement): void {
        const ctx = this.canvas.getContext('2d')!;
        ctx.clearRect(0, 0, 1200, 600);
        const base = root.getBoundingClientRect();
        const scale = base.width / 1200;
        if (!scale)
            return;
        const rect = (r: DOMRect) => ({ x: (r.left - base.left) / scale, y: (r.top - base.top) / scale, w: r.width / scale, h: r.height / scale });
        const visit = (node: HTMLElement) => {
            const css = getComputedStyle(node);
            if (css.display === 'none' || css.visibility === 'hidden')
                return;
            if (css.display === 'contents') {
                for (const child of Array.from(node.children))
                    if (child instanceof HTMLElement)
                        visit(child);
                return;
            }
            const b = rect(node.getBoundingClientRect());
            if (!b.w || !b.h)
                return;
            ctx.save();
            ctx.globalAlpha *= Number(css.opacity);
            const radius = Math.min(parseFloat(css.borderTopLeftRadius) || 0, b.w / 2, b.h / 2);
            const path = () => { ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, radius); };
            const neumorphic=css.getPropertyValue('--ui-theme').trim()==='neumorphic';
            const shadows=neumorphic?parsePanelShadows(css.boxShadow,css.color):[];
            for(const shadow of shadows.filter(s=>!s.inset).reverse()){
                ctx.save();ctx.shadowColor=shadow.color;ctx.shadowBlur=shadow.blur;
                ctx.shadowOffsetX=shadow.x;ctx.shadowOffsetY=shadow.y;
                const spread=shadow.spread;ctx.beginPath();
                ctx.roundRect(b.x-spread,b.y-spread,Math.max(0,b.w+spread*2),Math.max(0,b.h+spread*2),Math.max(0,radius+spread));
                ctx.fillStyle=css.backgroundColor;ctx.fill();ctx.restore();
            }
            if (css.backgroundColor !== 'rgba(0, 0, 0, 0)' && css.backgroundColor !== 'transparent') {
                path();
                ctx.fillStyle = css.backgroundColor;
                ctx.fill();
            }
            for(const shadow of shadows.filter(s=>s.inset).reverse()){
                ctx.save();path();ctx.clip();
                ctx.shadowColor=shadow.color;ctx.shadowBlur=shadow.blur;ctx.shadowOffsetX=shadow.x;ctx.shadowOffsetY=shadow.y;
                const margin=Math.max(b.w,b.h)+shadow.blur*4+Math.abs(shadow.x)+Math.abs(shadow.y)+20;
                ctx.beginPath();ctx.rect(b.x-margin,b.y-margin,b.w+margin*2,b.h+margin*2);
                ctx.roundRect(b.x+shadow.spread,b.y+shadow.spread,Math.max(0,b.w-shadow.spread*2),Math.max(0,b.h-shadow.spread*2),Math.max(0,radius-shadow.spread));
                ctx.fillStyle='#000';ctx.fill('evenodd');ctx.restore();
            }
            if(neumorphic&&parseFloat(css.borderTopWidth)>0){
                path();ctx.strokeStyle=css.borderTopColor;ctx.lineWidth=parseFloat(css.borderTopWidth);ctx.stroke();
            }
            if (node.dataset.glass !== undefined&&!neumorphic) {
                path();
                ctx.strokeStyle = 'rgba(255,255,255,.25)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            if (node.dataset.selected === 'true' || node.classList.contains('gaze-focus')) {
                path();
                ctx.strokeStyle = neumorphic?css.getPropertyValue('--ui-accent').trim():'rgba(255,255,255,.85)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            if (css.overflow === 'hidden' || css.overflow === 'clip' || css.overflowY === 'auto') {
                path();
                ctx.clip();
            }
            if (node instanceof HTMLImageElement) {
                if(neumorphic&&css.filter!=='none')ctx.filter=css.filter;
                let img = this.images.get(node.src);
                if (!img) {
                    img = new Image();
                    img.src = node.src;
                    this.images.set(node.src, img);
                }
                if (img.complete && img.naturalWidth) {
                    const nw = img.naturalWidth, nh = img.naturalHeight;
                    if (css.objectFit === 'cover') {
                        const f = Math.max(b.w / nw, b.h / nh);
                        ctx.save();
                        ctx.beginPath();
                        ctx.rect(b.x, b.y, b.w, b.h);
                        ctx.clip();
                        ctx.drawImage(img, b.x + (b.w - nw * f) / 2, b.y + (b.h - nh * f) / 2, nw * f, nh * f);
                        ctx.restore();
                    }
                    else if (css.objectFit === 'contain') {
                        const f = Math.min(b.w / nw, b.h / nh);
                        ctx.drawImage(img, b.x + (b.w - nw * f) / 2, b.y + (b.h - nh * f) / 2, nw * f, nh * f);
                    }
                    else
                        ctx.drawImage(img, b.x, b.y, b.w, b.h);
                }
            }
            else if (node instanceof HTMLInputElement) {
                ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
                ctx.fillStyle = css.color;
                ctx.textBaseline = 'middle';
                ctx.fillText(node.type === 'password' ? '••••••' : node.value || node.placeholder, b.x + 12, b.y + b.h / 2, b.w - 24);
            }
            else
                for (const child of Array.from(node.childNodes)) {
                    if (child instanceof HTMLElement) {
                        visit(child);
                        continue;
                    }
                    if (child.nodeType !== Node.TEXT_NODE || !child.textContent?.trim())
                        continue;
                    ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
                    ctx.fillStyle = css.color;
                    ctx.textBaseline = 'middle';
                    const value = child.textContent;
                    const range = document.createRange();
                    // A range per character respects flex, centering, line breaks and spans.
                    for (let i = 0; i < value.length; i++) {
                        if (/\s/.test(value[i]))
                            continue;
                        range.setStart(child, i);
                        range.setEnd(child, i + 1);
                        const r = rect(range.getBoundingClientRect());
                        ctx.fillText(value[i], r.x, r.y + r.h / 2);
                    }
                }
            ctx.restore();
        };
        visit(root);
        this.texture.needsUpdate = true;
    }
    dispose(): void { this.texture.dispose(); this.images.clear(); }
}
