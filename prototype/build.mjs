// camo.js を app-template.html にインライン展開して index.html を生成
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const m81src = fs.readFileSync(dir+'m81src.js', 'utf8')
  .replace(/^export /gm, '');
const camo = m81src + '\n' + fs.readFileSync(dir+'camo.js', 'utf8')
  .replace(/^import .*$/gm, '')  // ESM import はインライン化済み
  .replace(/^export /gm, '');    // ブラウザ用に export を除去
const refs = fs.readFileSync(dir+'refs.js', 'utf8');
const tpl = fs.readFileSync(dir+'app-template.html', 'utf8');
fs.writeFileSync(dir+'index.html',
  tpl.replace('//__INLINE_CAMO__', camo).replace('//__INLINE_REFS__', refs));
console.log('built index.html');
