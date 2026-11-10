// Static scene port from the user-supplied 목공방 디자인.zip. No React runtime.
import { sceneNode } from './runtime';
import { buildValue as useMemo } from './runtime';
import * as THREE from 'three';
import { Block, Beam, Cylinder, Facet, Label, mat, type V3 } from './primitives';
import { P, seeded } from './palette';
import { cleanCreaseNormals } from './geometry';
export function Plant({ position = [0, 0, 0], scale = 1, color = P.clay }: {
    position?: V3;
    scale?: number;
    color?: string;
}) {
    return sceneNode("group", { "position": position, "scale": scale }, sceneNode(Cylinder, { "r": .26, "top": .32, "h": .4, "position": [0, .2, 0], "color": color, "n": 10 }), sceneNode(Cylinder, { "r": .34, "h": .075, "position": [0, .39, 0], "color": color, "n": 10 }), sceneNode(Cylinder, { "r": .275, "h": .025, "position": [0, .43, 0], "color": P.dark }), [0, 1, 2, 3, 4, 5, 6].map(i => {
        const a = i * 2.4;
        const h = .7 + seeded(i) * .6;
        const x = Math.sin(a) * .3, z = Math.cos(a) * .3;
        return sceneNode("group", { "key": i }, sceneNode(Beam, { "a": [0, .42, 0], "b": [x, h, z], "r": .014, "color": P.moss }), sceneNode(Facet, { "position": [x, h, z], "scale": [.13, .3, .075], "color": i % 2 ? P.moss : P.leaf, "detail": 0, "rotation": [.3, a, .45] }), sceneNode(Facet, { "position": [x * .6, h * .74, z * .6], "scale": [.12, .25, .07], "color": P.dew, "detail": 0, "rotation": [-.5, a + 1, 1] }));
    }));
}
export function Stool({ position = [0, 0, 0], rotation = 0, small = false }: {
    position?: V3;
    rotation?: number;
    small?: boolean;
}) {
    return sceneNode("group", { "position": position, "rotation": [0, rotation, 0], "scale": small ? .8 : 1 }, sceneNode(Cylinder, { "position": [0, .63, 0], "r": .3, "h": .11, "color": P.fall, "n": 14 }), sceneNode(Cylinder, { "position": [0, .691, 0], "r": .266, "h": .018, "color": P.trail, "n": 14 }), [0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; return sceneNode(Beam, { "key": i, "a": [Math.sin(a) * .28, .03, Math.cos(a) * .28], "b": [Math.sin(a) * .18, .6, Math.cos(a) * .18], "r": .043, "color": P.leather }); }), sceneNode(Block, { "size": [.47, .045, .045], "position": [0, .27, 0], "color": P.fall }), sceneNode(Block, { "size": [.045, .045, .47], "position": [0, .27, 0], "color": P.fall }));
}
export function Hammer({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
    position?: V3;
    rotation?: V3;
    scale?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": rotation, "scale": scale }, sceneNode(Block, { "size": [.065, .47, .055], "position": [0, 0, 0], "wood": true, "color": P.fall }), sceneNode(Block, { "size": [.08, .19, .07], "position": [0, -.17, 0], "color": P.leather }), sceneNode(Block, { "size": [.3, .12, .1], "position": [.025, .25, 0], "color": P.steel, "metal": true }), sceneNode(Block, { "size": [.07, .16, .12], "position": [-.13, .24, 0], "color": P.dark, "bevel": .016 }), sceneNode(Beam, { "a": [.17, .25, 0], "b": [.24, .32, 0], "r": .025, "color": P.steel }));
}
export function HandPlane({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
    position?: V3;
    rotation?: V3;
    scale?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": rotation, "scale": scale }, sceneNode(Block, { "size": [.18, .055, .46], "position": [0, .025, 0], "color": P.dark, "metal": true }), sceneNode(Block, { "size": [.17, .07, .42], "position": [0, .08, 0], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [.12, .18, .035], "position": [0, .17, -.025], "rotation": [-.45, 0, 0], "color": P.steel, "metal": true }), sceneNode(Cylinder, { "r": .045, "h": .12, "position": [0, .18, .14], "color": P.leather }), sceneNode(Block, { "size": [.055, .2, .08], "position": [0, .2, -.15], "rotation": [-.28, 0, 0], "color": P.leather }));
}
export function Saw({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
    position?: V3;
    rotation?: V3;
    scale?: number;
}) {
    const geo = useMemo(() => {
        const s = new THREE.Shape();
        s.moveTo(-.4, .08);
        s.lineTo(.33, .18);
        s.lineTo(.32, -.12);
        for (let i = 0; i < 18; i++) {
            s.lineTo(.32 - i * .04, -.13 - (i % 2) * .035);
        }
        s.lineTo(-.4, -.12);
        s.closePath();
        return cleanCreaseNormals(new THREE.ExtrudeGeometry(s, { depth: .025, bevelEnabled: true, bevelSegments: 2, bevelSize: .0009, bevelThickness: .0009, steps: 1 }));
    }, []);
    return sceneNode("group", { "position": position, "rotation": rotation, "scale": scale }, sceneNode("mesh", { "geometry": geo, "material": mat('#acafa1', false, true), "castShadow": true }), sceneNode(Block, { "size": [.22, .33, .07], "position": [-.49, .02, .015], "color": P.fall, "wood": true, "bevel": .05 }), sceneNode(Block, { "size": [.09, .18, .078], "position": [-.49, .015, .016], "color": P.dark, "bevel": .024 }), sceneNode(Cylinder, { "r": .018, "h": .08, "rotation": [Math.PI / 2, 0, 0], "position": [-.41, .12, .01], "color": P.mustard }));
}
export function Clamp({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
    position?: V3;
    rotation?: V3;
    scale?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": rotation, "scale": scale }, sceneNode(Block, { "size": [.055, .55, .05], "color": P.dark, "metal": true }), [-.21, .18].map(y => sceneNode(Block, { "key": y, "size": [.24, .055, .075], "position": [.1, y, 0], "color": P.moss })), sceneNode(Cylinder, { "r": .018, "h": .28, "position": [.18, -.23, 0], "color": P.steel, "n": 8 }), sceneNode(Cylinder, { "r": .04, "h": .14, "position": [.18, -.4, 0], "color": P.fall, "n": 8 }), sceneNode(Cylinder, { "r": .05, "h": .025, "position": [.18, -.08, 0], "color": P.dark, "n": 8 }));
}
export function Chisel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: {
    position?: V3;
    rotation?: V3;
    scale?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": rotation, "scale": scale }, sceneNode(Cylinder, { "r": .035, "top": .045, "h": .21, "color": P.fall, "position": [0, .1, 0], "n": 8 }), sceneNode(Cylinder, { "r": .041, "h": .025, "color": P.mustard, "position": [0, -.015, 0] }), sceneNode(Block, { "size": [.041, .2, .016], "color": P.steel, "metal": true, "position": [0, -.12, 0] }), sceneNode(Block, { "size": [.07, .07, .013], "color": P.steel, "metal": true, "position": [0, -.25, 0], "rotation": [0, 0, -.06] }));
}
export function Screwdriver({ position = [0, 0, 0] }: {
    position?: V3;
}) {
    return sceneNode("group", { "position": position }, sceneNode(Cylinder, { "r": .037, "top": .045, "h": .19, "color": P.moss, "position": [0, .1, 0], "n": 8 }), sceneNode(Cylinder, { "r": .012, "h": .25, "position": [0, -.12, 0], "color": P.steel, "n": 6 }), sceneNode(Block, { "size": [.033, .055, .01], "position": [0, -.26, 0], "color": P.steel }));
}
export function Birdhouse({ position = [0, 0, 0], scale = 1, rotation = 0 }: {
    position?: V3;
    scale?: number;
    rotation?: number;
}) {
    return sceneNode("group", { "position": position, "scale": scale, "rotation": [0, rotation, 0] }, sceneNode(Block, { "size": [.4, .42, .33], "position": [0, .24, 0], "color": P.trail, "wood": true }), sceneNode(Block, { "size": [.34, .07, .5], "position": [-.145, .52, 0], "rotation": [0, 0, .7], "color": P.moss }), sceneNode(Block, { "size": [.34, .07, .5], "position": [.145, .52, 0], "rotation": [0, 0, -.7], "color": P.moss }), sceneNode(Cylinder, { "r": .075, "h": .012, "rotation": [Math.PI / 2, 0, 0], "position": [0, .32, .173], "color": P.dark, "n": 16 }), sceneNode(Cylinder, { "r": .022, "h": .16, "rotation": [Math.PI / 2, 0, 0], "position": [0, .18, .24], "color": P.fall }), sceneNode(Block, { "size": [.46, .055, .42], "position": [0, .015, 0], "color": P.fall, "wood": true }));
}
export function Crate({ position = [0, 0, 0], scale = 1, rotation = 0, closed = false }: {
    position?: V3;
    scale?: number;
    rotation?: number;
    closed?: boolean;
}) {
    return sceneNode("group", { "position": position, "scale": scale, "rotation": [0, rotation, 0] }, [-1, 1].flatMap(s => [-1, 1].map(t => sceneNode(Block, { "key": `${s}-${t}`, "size": [.06, .46, .06], "position": [s * .36, .24, t * .26], "color": P.leather, "wood": true }))), [0, 1, 2].map(i => sceneNode("group", { "key": i }, [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [.79, .105, .045], "position": [0, .09 + i * .15, s * .28], "color": i % 2 ? P.trail : P.fall, "wood": true })), [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [.045, .105, .55], "position": [s * .38, .09 + i * .15, 0], "color": P.trail, "wood": true })))), sceneNode(Block, { "size": [.75, .045, .54], "position": [0, .025, 0], "color": P.fall, "wood": true }), closed && sceneNode("group", null, sceneNode(Block, { "size": [.82, .06, .61], "position": [0, .5, 0], "color": P.trail, "wood": true }), sceneNode(Block, { "size": [.09, .07, .055], "position": [0, .47, .32], "color": P.mustard })));
}
export function Workbench({ position = [0, 0, 0], rotation = 0, variant = 0 }: {
    position?: V3;
    rotation?: number;
    variant?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": [0, rotation, 0] }, [-1, 1].flatMap(s => [-1, 1].map(t => sceneNode("group", { "key": `${s}-${t}` }, sceneNode(Block, { "size": [.17, .88, .17], "position": [s * 1.3, .44, t * .51], "wood": true, "color": P.leather, "bevel": .025 }), sceneNode(Block, { "size": [.22, .045, .21], "position": [s * 1.3, .035, t * .51], "color": P.dark }), sceneNode(Cylinder, { "r": .027, "h": .185, "rotation": [Math.PI / 2, 0, 0], "position": [s * 1.3, .73, t * .51], "color": P.mustard, "n": 10 })))), [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [2.8, .15, .11], "position": [0, .73, s * .55], "color": P.fall, "wood": true })), [-1, 1].map(s => sceneNode(Block, { "key": s, "size": [.13, .12, 1.15], "position": [s * 1.3, .28, 0], "color": P.fall, "wood": true })), [0, 1, 2, 3].map(i => sceneNode(Block, { "key": i, "size": [2.75, .065, .25], "position": [0, .29, -.39 + i * .26], "color": P.fall, "wood": true, "bevel": .009 })), [0, 1, 2, 3, 4].map(i => sceneNode(Block, { "key": i, "size": [3.15, .15, .284], "position": [0, .925, -.58 + i * .29], "color": [P.trail, '#d5b88b', '#c3a278', '#d0b38b', P.trail][i], "wood": true, "bevel": .012 })), sceneNode(Block, { "size": [3.22, .18, .1], "position": [0, .91, .76], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [3.22, .18, .1], "position": [0, .91, -.76], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [.52, .24, .11], "position": [-.8, .79, .95], "color": P.fall, "wood": true }), sceneNode(Cylinder, { "r": .047, "h": .35, "rotation": [Math.PI / 2, 0, 0], "position": [-.8, .78, .93], "color": P.dark, "n": 12 }), sceneNode(Cylinder, { "r": .065, "h": .14, "rotation": [Math.PI / 2, 0, 0], "position": [-.8, .78, 1.13], "color": P.leather }), sceneNode(Cylinder, { "r": .028, "h": .44, "rotation": [0, 0, .2], "position": [-.8, .77, 1.2], "color": P.trail }), [-1, 1].map(s => sceneNode(Cylinder, { "key": s, "r": .047, "h": .07, "position": [-.8 + s * .043, .77 + s * .22, 1.2], "color": P.fall })), sceneNode(Crate, { "position": [.65, .33, 0], "scale": .65 }), [0, 1, 2].map(i => sceneNode(Block, { "key": i, "size": [1.1, .09, .22], "position": [-.55, .38 + i * .095, 0], "color": i % 2 ? P.trail : P.fall, "wood": true, "rotation": [0, .03 * i, 0] })), variant === 0 ? sceneNode("group", null, sceneNode(Birdhouse, { "position": [.4, 1.01, -.1], "scale": 1.1, "rotation": -.3 }), sceneNode(Saw, { "position": [-.65, 1.04, -.08], "rotation": [-Math.PI / 2, 0, .35], "scale": .8 }), sceneNode(Hammer, { "position": [.1, 1.045, .42], "rotation": [Math.PI / 2, 0, 1], "scale": .7 }), sceneNode(Block, { "size": [.65, .065, .28], "position": [.95, 1.03, .38], "rotation": [0, .22, 0], "color": P.fall, "wood": true })) : sceneNode("group", null, sceneNode(HandPlane, { "position": [-.85, 1.01, .1], "rotation": [0, .65, 0], "scale": 1.3 }), sceneNode(Block, { "size": [.85, .07, .4], "position": [.45, 1.035, 0], "rotation": [0, .16, 0], "color": P.fall, "wood": true }), sceneNode(Block, { "size": [.07, .42, .4], "position": [.08, 1.25, 0], "rotation": [0, .16, 0], "color": P.trail, "wood": true }), sceneNode(Clamp, { "position": [.55, 1.12, -.54], "rotation": [0, Math.PI / 2, Math.PI / 2], "scale": .65 }), sceneNode(Chisel, { "position": [.98, 1.04, .28], "rotation": [Math.PI / 2, 0, -.2] })), [0, 1, 2].map(i => sceneNode(Block, { "key": i, "size": [.18, .035, .1], "position": [-1.1 + i * .18, 1.02, -.5], "rotation": [0, i * .3, 0], "color": P.trail, "wood": true })), [0, 1, 2, 3, 4].map(i => sceneNode("mesh", { "key": i, "position": [.3 + i * .12, 1.006, .6], "rotation": [-Math.PI / 2, 0, i * .8] }, sceneNode("torusGeometry", { "args": [.03, .006, 3, 7, 4.4] }), sceneNode("meshStandardMaterial", { "color": P.fall }))));
}
export function Pegboard() {
    return sceneNode("group", { "position": [0, 1.94, -6.73] }, sceneNode(Block, { "size": [3.9, 1.72, .13], "color": P.leather, "wood": true }), sceneNode(Block, { "size": [3.72, 1.55, .06], "position": [0, 0, .085], "color": P.trail }), Array.from({ length: 16 }, (_, x) => Array.from({ length: 6 }, (_, y) => sceneNode(Cylinder, { "key": `${x}-${y}`, "position": [-1.68 + x * .225, -.59 + y * .23, .122], "rotation": [Math.PI / 2, 0, 0], "r": .012, "h": .006, "color": '#8c7555', "n": 6 }))), sceneNode(Saw, { "position": [-1.05, .29, .18], "rotation": [0, 0, -.1], "scale": 1.05 }), sceneNode(Hammer, { "position": [-1.42, -.4, .2], "rotation": [0, 0, -.15], "scale": .8 }), sceneNode(Clamp, { "position": [1.22, .18, .19], "scale": 1.1 }), sceneNode(Clamp, { "position": [1.6, .18, .19], "scale": .9 }), sceneNode(Chisel, { "position": [-.4, -.21, .2] }), sceneNode(Chisel, { "position": [-.16, -.21, .2], "scale": .9 }), sceneNode(Screwdriver, { "position": [.16, -.18, .2] }), sceneNode(Screwdriver, { "position": [.38, -.18, .2] }), sceneNode(Block, { "size": [.5, .06, .04], "position": [.25, .43, .18], "color": P.mustard }), sceneNode(Block, { "size": [.06, .44, .04], "position": [.02, .23, .18], "color": P.mustard }), sceneNode(Block, { "size": [.85, .07, .25], "position": [-.8, -.69, .22], "color": P.fall, "wood": true }), sceneNode(HandPlane, { "position": [-.7, -.65, .18], "rotation": [0, Math.PI / 2, 0], "scale": .8 }), sceneNode(Block, { "size": [.07, .87, .05], "position": [.77, -.03, .18], "color": P.mustard }), Array.from({ length: 14 }, (_, i) => sceneNode(Block, { "key": i, "size": [i % 5 === 0 ? .04 : .025, .006, .006], "position": [.78, -.4 + i * .056, .21], "color": P.dark })));
}
export function TimberRack({ position = [-7.35, 0, -3.8], rotation = Math.PI / 2 }: {
    position?: V3;
    rotation?: number;
}) {
    return sceneNode("group", { "position": position, "rotation": [0, rotation, 0] }, [-1.3, 1.3].map(x => sceneNode(Block, { "key": x, "size": [.13, 2.5, .16], "position": [x, 1.25, 0], "color": P.leather, "wood": true })), [.3, 1.05, 1.8, 2.5].map((y, j) => sceneNode("group", { "key": y }, sceneNode(Block, { "size": [2.9, .11, .72], "position": [0, y, .18], "color": P.fall, "wood": true }), j < 3 && Array.from({ length: 5 }, (_, i) => sceneNode(Block, { "key": i, "size": [2.35 - seeded(i + j) * .4, .09 + (i % 2) * .04, .13], "position": [(seeded(i + j) - .5) * .2, y + .12 + (i % 2) * .055, -.05 + i * .12], "rotation": [0, (seeded(i) - .5) * .03, 0], "color": [P.trail, P.fall, '#ddc299'][i % 3], "wood": true })))), sceneNode(Label, { "text": "TIMBER LIBRARY", "width": 1.4, "height": .17, "position": [0, 2.53, .56], "background": P.fall, "font": 70 }));
}
function SmallChair({ position = [0, 0, 0] }: {
    position?: V3;
}) {
    return sceneNode("group", { "position": position, "scale": .75 }, [-1, 1].flatMap(x => [-1, 1].map(z => sceneNode(Beam, { "key": `${x}-${z}`, "a": [x * .24, .02, z * .22], "b": [x * .2, .49, z * .18], "r": .032, "color": P.fall }))), [0, 1, 2, 3].map(i => sceneNode(Block, { "key": i, "size": [.5, .055, .115], "position": [0, .5, -.18 + i * .12], "color": P.trail, "wood": true })), [-1, 1].map(x => sceneNode(Block, { "key": x, "size": [.055, .49, .055], "position": [x * .22, .74, -.23], "color": P.fall, "wood": true })), [.7, .85, .99].map(y => sceneNode(Block, { "key": y, "size": [.5, .1, .04], "position": [0, y, -.24], "color": P.trail, "wood": true })), sceneNode(Block, { "size": [.43, .035, .035], "position": [0, .23, .18], "color": P.leather }));
}
function ToyHouse({ position = [0, 0, 0] }: {
    position?: V3;
}) {
    return sceneNode("group", { "position": position }, sceneNode(Block, { "size": [.37, .35, .31], "position": [0, .18, 0], "color": P.fall, "wood": true }), [-1, 1].map(x => sceneNode(Block, { "key": x, "size": [.3, .045, .42], "position": [x * .12, .43, 0], "rotation": [0, 0, -x * .65], "color": P.mustard })), sceneNode(Block, { "size": [.075, .2, .035], "position": [0, .11, .17], "color": P.leather, "wood": true }), [-1, 1].map(x => sceneNode(Block, { "key": x, "size": [.075, .085, .028], "position": [x * .12, .25, .17], "color": P.cream })), sceneNode(Block, { "size": [.07, .17, .08], "position": [.12, .47, -.08], "color": P.leather }));
}
function WoodenBird({ position = [0, 0, 0] }: {
    position?: V3;
}) {
    return sceneNode("group", { "position": position, "rotation": [0, -.4, 0] }, sceneNode(Facet, { "position": [0, .13, 0], "scale": [.17, .115, .1], "color": P.trail, "detail": 1 }), sceneNode(Facet, { "position": [.14, .25, 0], "scale": [.09, .1, .08], "color": P.fall, "detail": 1 }), sceneNode(Facet, { "position": [.24, .24, 0], "scale": [.06, .025, .03], "color": P.mustard, "detail": 0 }), sceneNode(Block, { "size": [.04, .16, .025], "position": [0, .03, 0], "color": P.leather }), sceneNode(Block, { "size": [.25, .035, .17], "position": [0, 0, 0], "color": P.fall, "wood": true }));
}
export function DisplayShelf() {
    return sceneNode("group", { "position": [7.3, 0, -3.5], "rotation": [0, -Math.PI / 2, 0] }, [-1.4, 1.4].map(x => sceneNode(Block, { "key": x, "size": [.1, 2.7, .1], "position": [x, 1.35, 0], "color": P.leather, "wood": true })), [.25, 1.05, 1.9, 2.68].map(y => sceneNode(Block, { "key": y, "size": [3.05, .09, .75], "position": [0, y, .12], "color": P.trail, "wood": true })), sceneNode(Birdhouse, { "position": [-.8, 1.1, .08], "scale": 1.05 }), sceneNode(Crate, { "position": [.38, 1.1, .1], "scale": .85, "closed": true }), sceneNode(SmallChair, { "position": [-.8, .3, .07] }), sceneNode(Birdhouse, { "position": [.88, 1.95, .07], "scale": .75 }), sceneNode(Plant, { "position": [-.96, 1.95, 0], "scale": .5, "color": P.dew }), sceneNode(ToyHouse, { "position": [-.05, 1.95, .1] }), sceneNode(WoodenBird, { "position": [-.08, .32, .14] }), sceneNode(Label, { "text": "MADE BY OUR HANDS", "width": 1.9, "height": .2, "position": [0, 2.72, .51], "background": P.trail, "ink": P.leather, "font": 60 }), sceneNode(Crate, { "position": [.72, .3, .06], "scale": .7 }));
}
