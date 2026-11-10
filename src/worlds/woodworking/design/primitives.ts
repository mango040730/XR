// Static scene port from the user-supplied 목공방 디자인.zip. No React runtime.
import { sceneNode } from './runtime';
import { buildValue as useMemo, type SceneChild as ReactNode } from './runtime';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { P, seeded } from './palette';
import { createBeveledBox, createBeveledCylinder, proportionalBevel } from './geometry';
export type V3 = [
    number,
    number,
    number
];
import { resources } from './runtime';
export function woodSurface() {
    const scope = resources();
    if (scope.surface)
        return scope.surface;
    const width = 128, normal = new Uint8Array(width * width * 4), roughness = new Uint8Array(width * width * 4);
    const height = (u: number, v: number) => .5 + .16 * Math.sin(v * Math.PI * 34 + .22 * Math.sin(u * Math.PI * 6)) + .04 * Math.sin(v * Math.PI * 78 + .17 * Math.cos(u * Math.PI * 18));
    for (let y = 0; y < width; y++)
        for (let x = 0; x < width; x++) {
            const u = x / width, v = y / width, i = (y * width + x) * 4;
            const n = new THREE.Vector3((height(u - 1 / width, v) - height(u + 1 / width, v)) * 2.5, (height(u, v - 1 / width) - height(u, v + 1 / width)) * 2.5, 1).normalize();
            normal[i] = Math.round((n.x * .5 + .5) * 255);
            normal[i + 1] = Math.round((n.y * .5 + .5) * 255);
            normal[i + 2] = Math.round((n.z * .5 + .5) * 255);
            normal[i + 3] = 255;
            const r = Math.round((.93 + (height(u, v) - .5) * .17) * 255);
            roughness.set([r, r, r, 255], i);
        }
    const make = (data: Uint8Array) => { const tex = new THREE.DataTexture(data, width, width, THREE.RGBAFormat); tex.colorSpace = THREE.NoColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4; tex.needsUpdate = true; return tex; };
    scope.surface = { normalMap: make(normal), roughnessMap: make(roughness) };
    return scope.surface;
}
function woodTexture() {
    const scope = resources();
    if (scope.grain)
        return scope.grain;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#fffdf8';
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 55; i++) {
        const y = seeded(i) * 256;
        x.beginPath();
        x.moveTo(-5, y);
        x.bezierCurveTo(72, y + seeded(i + 3) * 7 - 3, 180, y - 4, 260, y + 1);
        x.strokeStyle = `rgba(74,45,22,${0.018 + seeded(i + 99) * 0.04})`;
        x.lineWidth = 0.5 + seeded(i + 5);
        x.stroke();
    }
    for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.ellipse(38 + i * 78, 45 + i * 71, 12, 2.6, 0, 0, Math.PI * 2);
        x.strokeStyle = 'rgba(80,48,24,0.05)';
        x.stroke();
    }
    scope.grain = new THREE.CanvasTexture(c);
    scope.grain.colorSpace = THREE.SRGBColorSpace;
    scope.grain.wrapS = scope.grain.wrapT = THREE.RepeatWrapping;
    scope.grain.anisotropy = 4;
    return scope.grain;
}
export function mat(color: string, wood = false, metal = false) {
    const { materials } = resources();
    const key = color + wood + metal;
    if (!materials.has(key))
        materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: metal ? .5 : wood ? .84 : .92, metalness: metal ? .65 : 0, map: wood ? woodTexture() : null, ...(wood ? woodSurface() : {}), normalScale: new THREE.Vector2(.14, .14), flatShading: false }));
    return materials.get(key)!;
}
export function boxGeo(size: V3, bevel = 0.025) {
    const { geometries } = resources();
    const r = proportionalBevel(size, bevel);
    const key = `bevel2:${size.join(':')}:${r}`;
    if (!geometries.has(key))
        geometries.set(key, createBeveledBox(size, r));
    return geometries.get(key)!;
}
export function Block({ size, position = [0, 0, 0], rotation = [0, 0, 0], color = P.trail, wood = false, bevel = 0.02, metal = false, cast = true, name, children }: {
    size: V3;
    position?: V3;
    rotation?: V3;
    color?: string;
    wood?: boolean;
    bevel?: number;
    metal?: boolean;
    cast?: boolean;
    name?: string;
    children?: ReactNode;
}) {
    return sceneNode("mesh", { "name": name, "geometry": boxGeo(size, bevel), "material": mat(color, wood, metal), "position": position, "rotation": rotation, "castShadow": cast, "receiveShadow": true }, children);
}
export function Cylinder({ position = [0, 0, 0], rotation = [0, 0, 0], r = 0.1, top, h = 1, color = P.leather, n = 10, metal = false, wood = [P.leather, P.fall, P.trail].includes(color) }: {
    position?: V3;
    rotation?: V3;
    r?: number;
    top?: number;
    h?: number;
    color?: string;
    n?: number;
    metal?: boolean;
    wood?: boolean;
}) {
    const { geometries } = resources();
    const key = `cylinder2:${r}:${top ?? r}:${h}:${n}`;
    if (!geometries.has(key))
        geometries.set(key, createBeveledCylinder(r, top ?? r, h, n));
    return sceneNode("mesh", { "geometry": geometries.get(key), "position": position, "rotation": rotation, "castShadow": true, "receiveShadow": true, "material": mat(color, wood && !metal, metal || color === P.steel) });
}
export function Beam({ a, b, r = 0.03, color = P.leather, wood = true }: {
    a: V3;
    b: V3;
    r?: number;
    color?: string;
    wood?: boolean;
}) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), mid = av.clone().add(bv).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.clone().sub(av).normalize());
    return sceneNode("mesh", { "geometry": boxGeo([r * 2, av.distanceTo(bv), r * 2], r * .2), "material": mat(color, wood), "position": [mid.x, mid.y, mid.z], "quaternion": [q.x, q.y, q.z, q.w], "castShadow": true, "receiveShadow": true });
}
export function Facet({ position = [0, 0, 0], scale = [1, 1, 1], color = P.moss, detail = 1, rotation = [0, 0, 0] }: {
    position?: V3;
    scale?: V3;
    color?: string;
    detail?: number;
    rotation?: V3;
}) {
    const geo = useMemo(() => {
        const source = new THREE.IcosahedronGeometry(1, detail);
        const g = source.index ? source.toNonIndexed() : source;
        const norm = g.attributes.normal, colors = [];
        const c = new THREE.Color(color);
        for (let i = 0; i < norm.count; i += 3) {
            const tint = c.clone().multiplyScalar(.88 + seeded(i + 15) * .22);
            for (let j = 0; j < 3; j++)
                colors.push(tint.r, tint.g, tint.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        return g;
    }, [detail, color]);
    return sceneNode("mesh", { "geometry": geo, "position": position, "scale": scale, "rotation": rotation, "castShadow": true, "receiveShadow": true }, sceneNode("meshStandardMaterial", { "vertexColors": true, "flatShading": true, "roughness": .95 }));
}
export function Label({ text, width = 2, height = .6, position = [0, 0, 0], rotation = [0, 0, 0], background = P.leather, ink = P.cream, font = 64, serif = false }: {
    text: string;
    width?: number;
    height?: number;
    position?: V3;
    rotation?: V3;
    background?: string;
    ink?: string;
    font?: number;
    serif?: boolean;
}) {
    const texture = useMemo(() => {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = Math.round(1024 * height / width);
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${serif ? '500' : '600'} ${font}px ${serif ? 'Georgia' : 'Arial'}, sans-serif`;
        ctx.fillText(text, 512, c.height / 2, 940);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, [text, width, height, background, ink, font, serif]);
    return sceneNode("mesh", { "position": position, "rotation": rotation }, sceneNode("planeGeometry", { "args": [width, height] }), sceneNode("meshStandardMaterial", { "map": texture, "roughness": 1 }));
}
export function Floor() {
    const geo = useMemo(() => {
        const parts = [];
        for (let row = 0; row < 28; row++)
            for (let col = 0; col < 8; col++) {
                const z = -6.75 + row * .5;
                const x = -7 + col * 2;
                const g = boxGeo([1.985, .085, .486], .012).clone();
                g.translate(x, -.0425, z);
                const base = new THREE.Color([P.trail, '#c5ac83', '#cfba96', '#c0a57e', '#d3bd99'][Math.floor(seeded(row * 8 + col) * 5)]);
                const colors = new Float32Array(g.attributes.position.count * 3);
                for (let k = 0; k < colors.length; k += 3) {
                    colors[k] = base.r;
                    colors[k + 1] = base.g;
                    colors[k + 2] = base.b;
                }
                g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                parts.push(g);
            }
        const merged = mergeGeometries(parts);
        parts.forEach(g => g.dispose());
        return merged;
    }, []);
    return sceneNode("mesh", { "geometry": geo, "receiveShadow": true }, sceneNode("meshStandardMaterial", { "vertexColors": true, "map": woodTexture(), ...woodSurface(), "normalScale": [.12, .12], "roughness": .86 }));
}
