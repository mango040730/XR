import { readFile, readdir, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// Download sources returned by Figma get_design_context, never runtime URLs.
const urls = new Set();
for (const file of await readdir('.figma-fix')) {
  const code = await readFile('.figma-fix/' + file, 'utf8');
  for (const [url] of code.matchAll(/https:\/\/www\.figma\.com\/api\/mcp\/asset\/[\w.-]+/g)) urls.add(url);
}
await mkdir('public/assets/figma-fix', { recursive: true });
for (const url of urls) {
  execFileSync('curl', ['-fL', '--retry', '2', '--connect-timeout', '15', '--max-time', '60', '--silent', '--show-error', url, '-o', 'public/assets/figma-fix/' + url.split('/').at(-1)]);
}
const fontRoot = 'https://raw.githubusercontent.com/wanteddev/wanted-sans/v1.0.3/';
for (const [source, target] of [
  ['packages/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2', 'WantedSansVariable.woff2'],
  ['OFL.txt', 'WantedSans-OFL.txt'],
]) execFileSync('curl', ['-fL', '--silent', '--show-error', fontRoot + source, '-o', 'public/assets/fonts/' + target]);
console.log('Downloaded', urls.size, 'Figma assets and Wanted Sans v1.0.3 with license.');
