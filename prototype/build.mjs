// camo.js を app-template.html にインライン展開して index.html を生成
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const core = new URL('../src/core/', import.meta.url).pathname;
// ソースマップ類は camo.js より前にインライン展開する
const srcFiles = ['m81src.js', 'digsrc.js'];
const srcInline = srcFiles
  .map(f => fs.readFileSync(core+f, 'utf8').replace(/^export /gm, ''))
  .join('\n');
const camo = srcInline + '\n' + fs.readFileSync(core+'camo.js', 'utf8')
  .replace(/^import .*$/gm, '')  // ESM import はインライン化済み
  .replace(/^export /gm, '');    // ブラウザ用に export を除去
const refs = fs.readFileSync(dir+'refs.js', 'utf8');
const tpl = fs.readFileSync(dir+'app-template.html', 'utf8');
fs.writeFileSync(dir+'index.html',
  tpl.replace('//__INLINE_CAMO__', camo).replace('//__INLINE_REFS__', refs));
console.log('built index.html');
