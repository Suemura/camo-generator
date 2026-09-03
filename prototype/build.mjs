// camo.js を app-template.html にインライン展開して index.html を生成
// buildIndexHtml() は副作用なしで HTML を返す。tests/prototype-sync.test.ts が
// これと index.html を比較し、生成コアを変えて再ビルドを忘れたら落ちるようにしている
// （プロトタイプは camo.js のスナップショットなので、再ビルドしないと古い実装が焼き付いたまま残る）
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname;
const core = new URL('../src/core/', import.meta.url).pathname;
// ソースマップ類は camo.js より前にインライン展開する
const srcFiles = ['m81src.js', 'dcusrc.js', 'digsrc.js'];

export function buildIndexHtml(){
  const srcInline = srcFiles
    .map(f => fs.readFileSync(core+f, 'utf8').replace(/^export /gm, ''))
    .join('\n');
  const camo = srcInline + '\n' + fs.readFileSync(core+'camo.js', 'utf8')
    .replace(/^import .*$/gm, '')  // ESM import はインライン化済み
    .replace(/^export /gm, '')     // ブラウザ用に export を除去
    + '\nregisterSources({AOR1_SRC_W, AOR1_SRC_H, AOR1_SRC_RLE, AOR2_SRC_W, AOR2_SRC_H, AOR2_SRC_RLE});';
  const refs = fs.readFileSync(dir+'refs.js', 'utf8');
  const tpl = fs.readFileSync(dir+'app-template.html', 'utf8');
  return tpl.replace('//__INLINE_CAMO__', camo).replace('//__INLINE_REFS__', refs);
}

export const indexPath = dir + 'index.html';

// 直接実行時のみ書き出す (import 時は副作用なし)
if(process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname)){
  fs.writeFileSync(indexPath, buildIndexHtml());
  console.log('built index.html');
}
