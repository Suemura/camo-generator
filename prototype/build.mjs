// camo.js を app-template.html にインライン展開して index.html を生成
// buildIndexHtml() は副作用なしで HTML を返す。tests/prototype-sync.test.ts が
// これと index.html を比較し、生成コアを変えて再ビルドを忘れたら落ちるようにしている
// （プロトタイプは camo.js のスナップショットなので、再ビルドしないと古い実装が焼き付いたまま残る）
//
// 出力は 2 つ:
//   index.html        git 管理。参照画像を持たない配布物（Artifact の実体）
//   index.local.html  gitignore。refs/private/ の画像を data URI で埋め込んだ手元用
// 実物と左右比較したいときは index.local.html を開く。refs/private/ が空なら作られない。
import fs from 'node:fs';
import { findRef } from '../tools/image.mjs';
const dir = new URL('.', import.meta.url).pathname;
const core = new URL('../src/core/', import.meta.url).pathname;
// ソースマップ類は camo.js より前にインライン展開する
// dbdu / cce はブロブ層に dcusrc / m81src を共有するので専用ソースは要らない
const srcFiles = ['m81src.js', 'dcusrc.js', 'jgsdf2src.js', 'dpmsrc.js', 'auscamsrc.js', 'digsrc.js'];

export function buildIndexHtml(refsJs){
  const srcInline = srcFiles
    .map(f => fs.readFileSync(core+f, 'utf8').replace(/^export /gm, ''))
    .join('\n');
  const camo = srcInline + '\n' + fs.readFileSync(core+'camo.js', 'utf8')
    .replace(/^import .*$/gm, '')  // ESM import はインライン化済み
    .replace(/^export /gm, '')     // ブラウザ用に export を除去
    + '\nregisterSources({AOR1_SRC_W, AOR1_SRC_H, AOR1_SRC_RLE, AOR2_SRC_W, AOR2_SRC_H, AOR2_SRC_RLE});';
  const refs = refsJs ?? fs.readFileSync(dir+'refs.js', 'utf8');
  const tpl = fs.readFileSync(dir+'app-template.html', 'utf8');
  return tpl.replace('//__INLINE_CAMO__', camo).replace('//__INLINE_REFS__', refs);
}

// refs/private/ の画像から REFS の定義文を組み立てる。手元用ビルド専用で、
// この出力を refs.js に書き戻さないこと（画像をリポジトリに戻すことになる）。
// キーは PRESETS[key].ref（ファイル名はプリセットキー = woodland、REFS キーは m81 のように別名がある）。
export async function buildLocalRefsJs(){
  const [{ default: sharp }, { PRESETS }] = await Promise.all([
    import('sharp'),
    import('../src/core/camo.js'),
  ]);
  const entries = [];
  for (const [key, preset] of Object.entries(PRESETS)) {
    const src = findRef(key);
    if (!src) continue;
    // 420px / quality 82 は左右比較に十分な解像度で、17 枚入れても数 MB に収まる
    const buf = await sharp(src).resize(420, 420, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
    entries.push(`  ${preset.ref}: 'data:image/jpeg;base64,${buf.toString('base64')}',`);
  }
  if (!entries.length) return null;
  return `// refs/private/ から生成した手元用の参照画像（index.local.html にのみ埋め込む）\nconst REFS = {\n${entries.join('\n')}\n};\n`;
}

export const indexPath = dir + 'index.html';
export const localIndexPath = dir + 'index.local.html';

// 直接実行時のみ書き出す (import 時は副作用なし)
if(process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url).pathname)){
  fs.writeFileSync(indexPath, buildIndexHtml());
  console.log('built index.html');
  const localRefs = await buildLocalRefsJs();
  if (localRefs) {
    fs.writeFileSync(localIndexPath, buildIndexHtml(localRefs));
    console.log('built index.local.html (refs/private/ の画像を埋め込み)');
  } else {
    console.log('refs/private/ に画像が無いため index.local.html は作りません');
  }
}
