import { mkdir, readFile, writeFile } from 'node:fs/promises';
import validator from 'gltf-validator';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const asset = process.argv[2] ? pathToFileURL(resolve(process.argv[2])) : new URL('../public/assets/models/test-room/scene.glb', import.meta.url);
const report = await validator.validateBytes(new Uint8Array(await readFile(asset)), { uri: asset.pathname.split('/').pop() });
await mkdir(new URL('../test-results/', import.meta.url), { recursive: true });
await writeFile(new URL('../test-results/gltf-validation.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(`Khronos glTF Validator: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
if (report.issues.numErrors || report.issues.numWarnings) process.exitCode = 1;
