import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import ts from 'typescript';

const base = new URL('../', import.meta.url);
await mkdir(new URL('src/ui/figma/', base), { recursive: true });
const tokens = new Set(); const exports = [];
for (const file of await readdir(new URL('.figma-audit/', base))) {
  if (!/^1144-\d+\.txt$/.test(file)) continue;
  let text = (await readFile(new URL('.figma-audit/' + file, base), 'utf8')).split('SUPER CRITICAL:')[0].trim();
  text = text.replace(/"https:\/\/www\.figma\.com\/api\/mcp\/asset\/([a-zA-Z0-9.-]+)"/g, '`${import.meta.env.BASE_URL}assets/figma/$1`');
  const source = ts.createSourceFile('frame.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function walk(node) {
    if (ts.isStringLiteralLike(node) || [ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail].includes(node.kind)) {
      for (const token of node.text.split(/\s+/)) tokens.add(token);
    }
    ts.forEachChild(node, walk);
  }
  walk(source);
  const name = 'Frame' + file.slice(0, -4).replaceAll('-', '_');
  await writeFile(new URL('src/ui/figma/' + name + '.tsx', base), "// Adapted from Figma node " + file.slice(0,-4).replace('-',':') + "; original assets stored locally.\nimport { h } from '../../components/dom';\n\n" + text + '\n');
  exports.push(`import ${name} from './${name}';`);
  exports.push(`export { ${name} };`);
}
await writeFile(new URL('src/ui/figma/index.ts', base), exports.join('\n')+'\n');
function arbitrary(token, prefix) { return token.startsWith(prefix+'-[') && token.endsWith(']') ? token.slice(prefix.length+2,-1).replaceAll('_',' ').replace(/([%\d)])([+-])(?=\d)/g,'$1 $2 ') : null; }
function style(t) {
  const fixed={absolute:'position:absolute',relative:'position:relative',flex:'display:flex',block:'display:block','inline-grid':'display:inline-grid','flex-col':'flex-direction:column','flex-none':'flex:none','shrink-0':'flex-shrink:0','w-full':'width:100%','h-full':'height:100%','size-full':'width:100%;height:100%','max-w-none':'max-width:none','min-w-px':'min-width:1px','min-h-px':'min-height:1px','inset-0':'inset:0','left-0':'left:0','top-0':'top:0','left-1/2':'left:50%','top-1/2':'top:50%','text-white':'color:#fff','bg-white':'background:#fff','text-center':'text-align:center','leading-[normal]':'line-height:normal','leading-[0]':'line-height:0','not-italic':'font-style:normal','whitespace-nowrap':'white-space:nowrap','overflow-clip':'overflow:clip','overflow-hidden':'overflow:hidden','pointer-events-none':'pointer-events:none','content-stretch':'align-content:stretch','items-start':'align-items:flex-start','items-center':'align-items:center','items-end':'align-items:flex-end','self-stretch':'align-self:stretch','justify-center':'justify-content:center','justify-end':'justify-content:flex-end','justify-between':'justify-content:space-between','place-items-start':'place-items:start','object-cover':'object-fit:cover','object-bottom':'object-position:bottom','col-1':'grid-column-start:1','row-1':'grid-row-start:1','ml-0':'margin-left:0','mt-0':'margin-top:0','mb-0':'margin-bottom:0',border:'border-width:1px','border-solid':'border-style:solid','rotate-90':'--rotation:90deg;transform:translate(var(--tx,0),var(--ty,0)) rotate(var(--rotation,0deg))','rotate-180':'--rotation:180deg;transform:translate(var(--tx,0),var(--ty,0)) rotate(var(--rotation,0deg))','-translate-x-1/2':'--tx:-50%;transform:translate(var(--tx,0),var(--ty,0)) rotate(var(--rotation,0deg))','-translate-y-1/2':'--ty:-50%;transform:translate(var(--tx,0),var(--ty,0)) rotate(var(--rotation,0deg))','[word-break:break-word]':'word-break:break-word'};
  if (fixed[t]) return fixed[t];
  if (t.startsWith("font-['Pretendard:")) return `font-family:Pretendard,sans-serif;font-weight:${t.includes('SemiBold')?600:t.includes('Bold')?700:500}`;
  for (const [prefix,property] of Object.entries({w:'width',h:'height',left:'left',right:'right',top:'top',bottom:'bottom',gap:'gap',p:'padding',px:'padding-inline',py:'padding-block',ml:'margin-left',mt:'margin-top',rounded:'border-radius',leading:'line-height',flex:'flex','grid-cols':'grid-template-columns','grid-rows':'grid-template-rows'})) {const value=arbitrary(t,prefix);if(value!==null)return property+':'+value;}
  let v=arbitrary(t,'size');if(v!==null)return 'width:'+v+';height:'+v;
  if(t==='contents') return 'display:contents';
  const blur=arbitrary(t,'backdrop-blur');if(blur!==null)return 'backdrop-filter:blur('+blur+')';
  if(t==='grid') return 'display:grid';
  if(t==='justify-self-stretch') return 'justify-self:stretch';
  v=arbitrary(t,'gap-x');if(v!==null)return 'column-gap:'+v;
  v=arbitrary(t,'gap-y');if(v!==null)return 'row-gap:'+v;
  v=arbitrary(t,'text');if(v!==null)return (v.startsWith('#')||v.startsWith('rgba')?'color:':'font-size:')+v;
  v=arbitrary(t,'bg');if(v!==null)return 'background:'+v;
  v=arbitrary(t,'border');if(v!==null)return 'border-color:'+v;
  v=arbitrary(t,'inset');if(v!==null)return 'inset:'+v;
  return null;
}
const css=[];
for(const t of tokens){const value=style(t);if(!value)continue;const escaped=t.replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c);css.push(`.design-frame.${escaped},.design-frame .${escaped}{${value}}`);}
await writeFile(new URL('src/ui/figma/generated.css',base), '/* Static, scoped CSS translated from inspected Figma styles. No Tailwind runtime. */\n'+css.join('\n')+'\n');
console.log('Imported',exports.length/2,'Figma frames;',css.length,'scoped style rules');
