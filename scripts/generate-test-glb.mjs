import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BoxGeometry } from 'three';

const layout = JSON.parse(await readFile(new URL('../src/worlds/glb-test-room/layout.json', import.meta.url), 'utf8'));
const geometry = new BoxGeometry(1, 1, 1);
// Build a small self-contained glTF 2.0 binary; no Blender, exporter or remote assets.
const arrays = [geometry.attributes.position.array, geometry.attributes.normal.array, geometry.index.array];
const chunks = arrays.map(array => Buffer.from(array.buffer, array.byteOffset, array.byteLength));
let offset = 0;
const bufferViews = chunks.map((chunk, index) => {
  const view = { buffer: 0, byteOffset: offset, byteLength: chunk.byteLength, target: index === 2 ? 34963 : 34962 };
  offset += chunk.byteLength;
  return view;
});
const binary = Buffer.concat(chunks);
const document = {
  asset: { version: '2.0', generator: 'XR Spatial Platform procedural room generator' },
  scene: 0, scenes: [{ name: 'Procedural test room', nodes: layout.boxes.map((_, i) => i) }],
  nodes: layout.boxes.map(box => ({ name: box.name, mesh: box.material, translation: box.position, scale: box.size })),
  meshes: layout.materials.map((material, index) => ({ name: material.name, primitives: [{
    attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: index,
  }] })),
  materials: layout.materials.map(material => ({ name: material.name, pbrMetallicRoughness: {
    baseColorFactor: material.color, metallicFactor: 0, roughnessFactor: 0.85,
  } })),
  buffers: [{ byteLength: binary.length }], bufferViews,
  accessors: [
    { bufferView: 0, componentType: 5126, count: arrays[0].length / 3, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: arrays[1].length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: arrays[2].length, type: 'SCALAR' },
  ],
};
const pad = (buffer, byte) => Buffer.concat([buffer, Buffer.alloc((4 - buffer.length % 4) % 4, byte)]);
const json = pad(Buffer.from(JSON.stringify(document)), 0x20);
const bin = pad(binary, 0);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const chunkHeader = (buffer, type) => {
  const result = Buffer.alloc(8); result.writeUInt32LE(buffer.length, 0); result.writeUInt32LE(type, 4); return result;
};
const target = new URL('../public/assets/models/test-room/scene.glb', import.meta.url);
await mkdir(new URL('.', target), { recursive: true });
await writeFile(target, Buffer.concat([header, chunkHeader(json, 0x4e4f534a), json, chunkHeader(bin, 0x004e4942), bin]));
geometry.dispose();
console.log(`Generated ${fileURLToPath(target)} (${header.readUInt32LE(8)} bytes)`);
