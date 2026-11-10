// Static scene port from the user-supplied 목공방 디자인.zip. No React runtime.
import { buildQuality } from './runtime';
import { sceneNode } from './runtime';
import { buildValue as useMemo } from './runtime';
import * as THREE from 'three';
import { Block, Beam, Cylinder, Facet, Floor, Label, mat, type V3 } from './primitives';
import { Birdhouse, Crate, DisplayShelf, Pegboard, Plant, Stool, TimberRack, Workbench } from './props';
import { P, seeded } from './palette';
import { cleanCreaseNormals } from './geometry';
import { LIGHTING } from './renderConfig';
function archPath(center: number, r: number, sill: number, spring: number) {
    const p = new THREE.Path();
    p.moveTo(center - r, sill);
    p.lineTo(center + r, sill);
    p.lineTo(center + r, spring);
    p.absarc(center, spring, r, 0, Math.PI, false);
    p.lineTo(center - r, sill);
    return p;
}
function Wall({ width, windows, position, rotation = 0 }: {
    width: number;
    windows: number[];
    position: V3;
    rotation?: number;
}) {
    const geometry = useMemo(() => {
        const s = new THREE.Shape();
        s.moveTo(-width / 2, 0);
        s.lineTo(width / 2, 0);
        s.lineTo(width / 2, 4.5);
        s.lineTo(-width / 2, 4.5);
        s.closePath();
        windows.forEach(c => s.holes.push(archPath(c, 1.34, .72, 2.75)));
        return cleanCreaseNormals(new THREE.ExtrudeGeometry(s, { depth: .23, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, steps: 1, curveSegments: 14 }));
    }, [width, windows]);
    return sceneNode("group", { "position": position, "rotation": [0, rotation, 0] }, sceneNode("mesh", { "name": "plaster-wall", "geometry": geometry, "material": mat(P.cream), "castShadow": true, "receiveShadow": true }), sceneNode(Block, { "size": [width, .18, .15], "position": [0, .1, .28], "color": P.leather, "wood": true }), sceneNode(Block, { "size": [width, .08, .12], "position": [0, .6, .27], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [width, .17, .23], "position": [0, 4.37, .2], "color": P.leather, "wood": true }), windows.map(c => sceneNode(Window, { "key": c, "center": c })));
}
function Window({ center }: {
    center: number;
}) {
    const frame = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(center + 1.465, 2.75);
        shape.absarc(center, 2.75, 1.465, 0, Math.PI, false);
        shape.lineTo(center - 1.295, 2.75);
        shape.absarc(center, 2.75, 1.295, Math.PI, 0, true);
        shape.closePath();
        return cleanCreaseNormals(new THREE.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: true, bevelSegments: 2, bevelSize: .006, bevelThickness: .006, curveSegments: 14, steps: 1 }));
    }, [center]);
    return sceneNode("group", {}, sceneNode("mesh", { "name": "arched-window-frame", "geometry": frame, "position": [0, 0, .1], "material": mat(P.fall, true), "castShadow": true, "receiveShadow": true }), [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [.13, 2.05, .19], "position": [center + s * 1.38, 1.72, .18], "color": P.fall, "wood": true })), sceneNode(Block, { "size": [2.96, .14, .46], "position": [center, .71, .28], "color": P.trail, "wood": true }), sceneNode(Block, { "size": [.075, 3.35, .1], "position": [center, 2.41, .14], "color": P.leather, "wood": true }), sceneNode(Block, { "size": [2.72, .075, .1], "position": [center, 2.31, .14], "color": P.leather, "wood": true }), sceneNode("mesh", { "position": [center, 1.5, .02] }, sceneNode("planeGeometry", { "args": [2.62, 1.5] }), sceneNode("meshPhysicalMaterial", { "color": '#e6ead7', "transparent": true, "opacity": .045, "roughness": .1, "depthWrite": false, "side": THREE.DoubleSide })));
}
function Pendant({ position }: {
    position: V3;
}) {
    const quality: string = buildQuality();
    const target = useMemo(() => { const object = new THREE.Object3D(); object.position.set(0, -2.4, 0); return object; }, []);
    return sceneNode("group", { "position": position }, sceneNode(Cylinder, { "r": .018, "h": 1.09, "position": [0, .645, 0], "color": P.dark, "n": 6 }), sceneNode(Cylinder, { "r": .12, "h": .06, "position": [0, 1.17, 0], "color": P.leather }), sceneNode("mesh", { "position": [0, .04, 0], "castShadow": true }, sceneNode("cylinderGeometry", { "args": [.11, .43, .27, 14, 1, true] }), sceneNode("meshStandardMaterial", { "color": P.moss, "side": THREE.DoubleSide, "roughness": .74 })), sceneNode(Cylinder, { "r": .437, "h": .035, "position": [0, -.1, 0], "color": P.mustard, "n": 14 }), sceneNode("mesh", { "name": "lit-pendant-diffuser", "position": [0, -.122, 0], "rotation": [Math.PI / 2, 0, 0] }, sceneNode("circleGeometry", { "args": [.397, 14] }), sceneNode("meshStandardMaterial", { "color": '#fff1db', "emissive": LIGHTING.pendant.color, "emissiveIntensity": 3.4 })), sceneNode("primitive", { "object": target }), sceneNode("spotLight", { "key": quality, "name": "pendant-work-light", "target": target, "position": [0, -.18, 0], "color": LIGHTING.pendant.color, "intensity": LIGHTING.pendant.intensity, "decay": 2, "distance": 6.5, "angle": .86, "penumbra": .45, "castShadow": quality === 'high' && (position[2] === 1 || position[0] === 0), "shadow-mapSize": [1024, 1024], "shadow-bias": -.00006, "shadow-normalBias": .006, "shadow-camera-near": .08, "shadow-camera-far": 6.5, "shadow-radius": 1.5 }), sceneNode("pointLight", { "position": [0, -.1, 0], "color": LIGHTING.pendant.color, "intensity": .6, "decay": 2, "distance": 1.1 }));
}
function ShelfWorkLight({ position, target: aim }: {
    position: V3;
    target: V3;
}) {
    const quality = buildQuality(), side = Math.sign(position[0]);
    const target = useMemo(() => { const t = new THREE.Object3D(); t.position.set(aim[0] - position[0], aim[1] - position[1], aim[2] - position[2]); return t; }, [...position, ...aim]);
    return sceneNode("group", { "position": position, "name": "shelf-work-lamp" }, sceneNode(Block, { "size": [.1, .38, .14], "position": [side * 1.5, .15, 0], "color": P.leather, "wood": true, "bevel": .003 }), sceneNode(Block, { "size": [1.5, .055, .075], "position": [side * .75, .15, 0], "color": P.dark, "bevel": .002 }), sceneNode(Block, { "size": [.085, .12, .085], "position": [0, .15, 0], "color": P.leather, "bevel": .003 }), sceneNode(Cylinder, { "r": .2, "top": .06, "h": .15, "position": [0, .015, 0], "color": P.moss, "n": 10 }), sceneNode("mesh", { "name": "lit-shelf-diffuser", "position": [0, -.066, 0], "rotation": [Math.PI / 2, 0, 0] }, sceneNode("circleGeometry", { "args": [.17, 10] }), sceneNode("meshStandardMaterial", { "color": P.cream, "emissive": LIGHTING.shelf.color, "emissiveIntensity": 3.4 })), sceneNode("primitive", { "object": target }), sceneNode("spotLight", { "key": quality, "name": "shelf-task-light", "position": [0, -.09, 0], "target": target, "color": LIGHTING.shelf.color, "intensity": LIGHTING.shelf.intensity, "angle": .68, "penumbra": .48, "distance": 5.2, "decay": 2, "castShadow": quality === 'high', "shadow-mapSize": [1024, 1024], "shadow-camera-near": .08, "shadow-camera-far": 5.2, "shadow-normalBias": .004, "shadow-bias": -.00005 }));
}
function ToolWallLight() {
    const quality: string = buildQuality();
    const target = useMemo(() => { const t = new THREE.Object3D(); t.position.set(0, 1.7, -6.6); return t; }, []);
    return sceneNode("group", { "name": "tool-wall-work-lamp" }, sceneNode(Block, { "size": [1.6, .065, .18], "position": [0, 3.02, -6.05], "color": P.fall, "wood": true, "bevel": .003 }), [-.65, .65].map(x => sceneNode(Block, { "key": x, "size": [.045, .045, .7], "position": [x, 3.07, -6.4], "color": P.dark, "bevel": .0015 })), sceneNode(Block, { "size": [1.44, .018, .12], "position": [0, 2.978, -6.05], "color": P.mustard, "bevel": .001 }), sceneNode("mesh", { "name": "lit-tool-diffuser", "position": [0, 2.967, -6.05], "rotation": [Math.PI / 2, 0, 0] }, sceneNode("planeGeometry", { "args": [1.44, .12] }), sceneNode("meshStandardMaterial", { "color": P.cream, "emissive": LIGHTING.pendant.color, "emissiveIntensity": 3.4 })), sceneNode("primitive", { "object": target }), sceneNode("spotLight", { "key": quality, "name": "tool-task-light", "position": [0, 2.96, -6.05], "target": target, "color": LIGHTING.pendant.color, "intensity": 16, "angle": .95, "penumbra": .65, "distance": 3.8, "decay": 2, "castShadow": quality === 'high', "shadow-mapSize": [512, 512], "shadow-camera-near": .06, "shadow-camera-far": 3.8, "shadow-normalBias": .003, "shadow-bias": -.00004 }));
}
function Tree({ position, scale = 1, pine = false, seed = 0 }: {
    position: V3;
    scale?: number;
    pine?: boolean;
    seed?: number;
}) {
    const colors = ['#7e894a', '#8e9953', '#a7ac6e', '#697841', '#b5b483'];
    return sceneNode("group", { "position": position, "scale": scale }, sceneNode(Cylinder, { "r": .22, "top": .13, "h": 2.8, "position": [0, 1.4, 0], "color": P.leather, "n": 7 }), pine ? sceneNode("group", null, [0, 1, 2, 3].map(i => sceneNode("mesh", { "key": i, "position": [0, 1.7 + i * .74, 0], "rotation": [0, i * .4, 0], "castShadow": true, "receiveShadow": true }, sceneNode("coneGeometry", { "args": [1.35 - i * .26, 1.8, 7, 1] }), sceneNode("meshStandardMaterial", { "color": ['#64754c', '#7e8d5a', '#8f9e70', '#b2b98a'][i], "flatShading": true, "roughness": 1 })))) : sceneNode("group", null, sceneNode(Beam, { "a": [0, 1.65, 0], "b": [-.65, 2.7, 0], "r": .105 }), sceneNode(Beam, { "a": [0, 1.8, 0], "b": [.7, 2.8, .2], "r": .09 }), sceneNode(Facet, { "position": [0, 3.1, 0], "scale": [1.25, 1.35, 1.16], "color": colors[seed % colors.length], "detail": 1, "rotation": [0, seed, 0] }), sceneNode(Facet, { "position": [-.75, 2.7, .18], "scale": [.76, .83, .78], "color": colors[(seed + 1) % colors.length], "detail": 1 }), sceneNode(Facet, { "position": [.72, 2.9, -.2], "scale": [.75, .96, .78], "color": colors[(seed + 2) % colors.length], "detail": 1 })));
}
export function Forest() {
    return sceneNode("group", {}, sceneNode("mesh", { "position": [0, -.17, 0], "rotation": [-Math.PI / 2, 0, 0], "receiveShadow": true }, sceneNode("planeGeometry", { "args": [120, 120] }), sceneNode("meshStandardMaterial", { "color": '#a9b080', "roughness": 1 })), Array.from({ length: 31 }, (_, i) => { const a = i / 31 * Math.PI * 2; const rad = 12 + seeded(i) * 11; return sceneNode(Tree, { "key": i, "position": [Math.sin(a) * rad, -.15, Math.cos(a) * rad], "scale": .9 + seeded(i + 10) * .9, "pine": i % 3 === 0, "seed": i }); }), Array.from({ length: 18 }, (_, i) => { const a = i / 18 * Math.PI * 2; const rad = 11 + seeded(i) * 7; return sceneNode(Facet, { "key": i, "position": [Math.sin(a) * rad, .17, Math.cos(a) * rad], "scale": [.8 + seeded(i), .5, .65], "color": i % 3 === 0 ? P.dew : '#8d995e', "detail": 1 }); }), Array.from({ length: 15 }, (_, i) => sceneNode(Facet, { "key": i, "position": [-16 + seeded(i) * 32, -.2, -13 - seeded(i + 3) * 18], "scale": [4 + seeded(i) * 3, 1.2 + seeded(i + 3), 3], "color": i % 2 ? '#b6bb8d' : '#a1af7c', "detail": 1 })));
}
export function Atelier() {
    return sceneNode("group", {}, sceneNode(Floor, {}), sceneNode(Wall, { "width": 16, "windows": [-4.85, 4.85], "position": [0, 0, -7] }), sceneNode(Wall, { "width": 14, "windows": [-.2, 4.3], "position": [-8, 0, 0], "rotation": Math.PI / 2 }), sceneNode(Wall, { "width": 14, "windows": [-3.6, 2.4], "position": [8, 0, 0], "rotation": -Math.PI / 2 }), sceneNode(Block, { "size": [6.85, 4.5, .25], "position": [-4.55, 2.25, 7], "color": P.cream }), sceneNode(Block, { "size": [6.85, 4.5, .25], "position": [4.55, 2.25, 7], "color": P.cream }), sceneNode(Block, { "size": [2.3, 1.6, .25], "position": [0, 3.7, 7], "color": P.cream }), [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [.14, 2.92, .28], "position": [s * 1.12, 1.46, 6.84], "color": P.leather, "wood": true })), sceneNode(Block, { "size": [2.36, .14, .28], "position": [0, 2.9, 6.84], "color": P.leather, "wood": true }), sceneNode(Block, { "size": [2.08, 2.79, .12], "position": [0, 1.4, 6.99], "color": P.fall, "wood": true }), [-.55, .55].map(x => sceneNode(Block, { "key": x, "size": [.78, 1.04, .055], "position": [x, 1.87, 6.89], "color": P.trail, "wood": true })), [-.55, .55].map(x => sceneNode(Block, { "key": x, "size": [.78, .93, .055], "position": [x, .7, 6.89], "color": P.leather, "wood": true })), sceneNode(Cylinder, { "r": .05, "h": .1, "position": [-.8, 1.2, 6.84], "rotation": [Math.PI / 2, 0, 0], "color": P.mustard }), sceneNode(Block, { "name": "solid-ceiling", "size": [16.3, .15, 14.3], "position": [0, 4.63, 0], "color": P.cream }), [-6, -3, 0, 3, 6].map(z => sceneNode(Block, { "key": z, "size": [16, .25, .22], "position": [0, 4.36, z], "color": P.leather, "wood": true })), [-7.7, 7.7].flatMap(x => [-6.7, -.8, 6.7].map(z => sceneNode("group", { "key": `${x}-${z}` }, sceneNode(Block, { "size": [.25, 4.5, .25], "position": [x, 2.25, z], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [.32, .12, .32], "position": [x, .12, z], "color": P.leather }), sceneNode(Beam, { "a": [x, 3.5, z], "b": [x - Math.sign(x) * .85, 4.35, z], "r": .09, "color": P.leather })))), [-3.45, 3.4].flatMap(x => [-3.7, 1].map(z => sceneNode(Pendant, { "key": `${x}-${z}`, "position": [x, 3.36, z] }))), sceneNode(Pendant, { "position": [0, 3.36, 3] }), sceneNode(ShelfWorkLight, { "position": [-6.25, 3.45, -3.8], "target": [-7.1, 1.35, -3.8] }), sceneNode(ShelfWorkLight, { "position": [6.25, 3.45, -3.5], "target": [7.1, 1.35, -3.5] }), sceneNode(ToolWallLight, {}), sceneNode(Workbench, { "position": [-3.45, 0, .2] }), sceneNode(Workbench, { "position": [3.4, 0, -1.7], "rotation": Math.PI, "variant": 1 }), sceneNode(Stool, { "position": [-4.45, 0, 1.92], "rotation": .2 }), sceneNode(Stool, { "position": [-2.3, 0, -1.55], "rotation": -.5 }), sceneNode(Stool, { "position": [4.3, 0, .12] }), sceneNode(Stool, { "position": [2.3, 0, -3.45] }), sceneNode(Pegboard, {}), sceneNode(Block, { "size": [3.9, .12, .77], "position": [0, .86, -6.35], "color": P.fall, "wood": true }), [-1.68, 1.68].map(x => sceneNode(Block, { "key": x, "size": [.12, .82, .58], "position": [x, .41, -6.4], "color": P.leather, "wood": true })), sceneNode(Crate, { "position": [-.75, .01, -6.35], "scale": .85 }), sceneNode(Crate, { "position": [.65, .01, -6.35], "scale": .85 }), sceneNode(Block, { "size": [3.35, .69, .13], "position": [0, 3.5, -6.75], "color": P.leather, "wood": true, "bevel": .07 }), sceneNode(Label, { "text": "FOREST ATELIER", "width": 3.02, "height": .35, "position": [0, 3.57, -6.671], "font": 75, "serif": true }), sceneNode(Label, { "text": "SLOW CRAFT  ·  GOOD COMPANY", "width": 2.9, "height": .14, "position": [0, 3.29, -6.67], "font": 40 }), sceneNode(TimberRack, {}), sceneNode(DisplayShelf, {}), [0, 1, 2, 3, 4].map(i => sceneNode(Block, { "key": i, "size": [.24 + (i % 2) * .1, 1.6 + i * .23, .1], "position": [-7.42 + i * .32, .85 + i * .115, 4.7 + seeded(i) * .16], "rotation": [.13, 0, -.09 + seeded(i) * .12], "color": [P.fall, P.trail, '#b7915f'][i % 3], "wood": true })), sceneNode(Crate, { "position": [-6.25, 0, 5.55], "rotation": -.12 }), sceneNode(Crate, { "position": [-6.15, .5, 5.5], "scale": .8, "closed": true }), sceneNode(Plant, { "position": [-6.93, 0, -6.25], "scale": 1.3, "color": P.dew }), sceneNode(Plant, { "position": [6.8, 0, 5.9], "scale": 1.9 }), sceneNode(Plant, { "position": [-4.85, .81, -6.67], "scale": .58, "color": P.dew }), sceneNode(Plant, { "position": [4.18, .81, -6.69], "scale": .55 }), sceneNode(Birdhouse, { "position": [5.4, .81, -6.63], "scale": .8 }), sceneNode(Plant, { "position": [-7.64, .81, 1.25], "scale": .55 }), sceneNode("group", { "position": [6.7, 0, 3.3], "rotation": [0, -.28, 0] }, sceneNode(Block, { "size": [1.35, .12, 1.1], "position": [0, .7, 0], "color": P.trail, "wood": true }), [-1, 1].flatMap(x => [-1, 1].map(z => sceneNode(Block, { "key": `${x}-${z}`, "size": [.1, .65, .1], "position": [x * .52, .325, z * .4], "color": P.leather, "wood": true }))), sceneNode(Birdhouse, { "position": [0, .77, 0], "scale": 1.25, "rotation": -.2 })), sceneNode(Label, { "text": "THE LITTLE THINGS WE MAKE", "width": 1.6, "height": .16, "position": [7.68, 3.2, -3.5], "rotation": [0, -Math.PI / 2, 0], "background": P.cream, "ink": P.leather, "font": 50 }), sceneNode(Label, { "text": "01 / SELECTED TIMBER", "width": 1.8, "height": .2, "position": [-7.68, 3.05, -3.8], "rotation": [0, Math.PI / 2, 0], "background": P.cream, "ink": P.leather, "font": 55 }), sceneNode("mesh", { "position": [0, .003, 4.8], "rotation": [-Math.PI / 2, 0, 0] }, sceneNode("ringGeometry", { "args": [.43, .445, 48] }), sceneNode("meshStandardMaterial", { "color": P.fall, "transparent": true, "opacity": .45 })));
}
