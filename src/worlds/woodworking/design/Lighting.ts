// Static scene port from the user-supplied 목공방 디자인.zip. No React runtime.
import { buildQuality } from './runtime';
import { sceneNode } from './runtime';
import { buildValue as useMemo } from './runtime';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { LIGHTING } from './renderConfig';
export function Lighting() {
    const quality: string = buildQuality();
    const target = useMemo(() => { const object = new THREE.Object3D(); object.position.set(...LIGHTING.sun.target); return object; }, []);
    RectAreaLightUniformsLib.init();
    return sceneNode("group", null, sceneNode("ambientLight", { "intensity": LIGHTING.ambient, "color": '#f4eee6' }), sceneNode("hemisphereLight", { "args": ['#dbe5ed', '#ab8b68', LIGHTING.sky] }), sceneNode("primitive", { "object": target }), sceneNode("directionalLight", { "key": quality, "name": "afternoon-sun", "target": target, "position": LIGHTING.sun.position, "intensity": LIGHTING.sun.intensity, "color": LIGHTING.sun.color, "castShadow": true, "shadow-mapSize": quality === 'high' ? [4096, 4096] : [2048, 2048], "shadow-camera-left": -11.5, "shadow-camera-right": 11.5, "shadow-camera-top": 9, "shadow-camera-bottom": -9, "shadow-camera-near": 1, "shadow-camera-far": 35, "shadow-normalBias": quality === 'high' ? .006 : .014, "shadow-bias": -.000035, "shadow-radius": 1.15 }), [-4.85, 4.85].map(x => sceneNode("rectAreaLight", { "key": x, "position": [x, 2.35, -6.58], "rotation": [0, Math.PI, 0], "width": 2.4, "height": 2.75, "intensity": 2.8, "color": '#e4e9e4' })), sceneNode("rectAreaLight", { "position": [-7.58, 2.35, .2], "rotation": [0, -Math.PI / 2, 0], "width": 2.4, "height": 2.75, "intensity": 2.3, "color": '#e0e8e5' }), sceneNode("rectAreaLight", { "position": [7.58, 2.35, 2.4], "rotation": [0, Math.PI / 2, 0], "width": 2.4, "height": 2.75, "intensity": 1.7, "color": '#e2e8e7' }), sceneNode("rectAreaLight", { "name": "ceiling-bounce", "position": [0, 3.8, -3.3], "rotation": [-.6, 0, 0], "width": 3.2, "height": 1.2, "intensity": 2.2, "color": '#f0e4d1' }));
}
