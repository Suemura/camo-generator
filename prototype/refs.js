// 実物リファレンス画像の data URI（プリセットキー → data:image/...）。
// このリポジトリには画像を同梱しないため既定は空で、参照ペインは「画像なし」表示になる。
// 手元で実物比較したい場合は refs/private/ の画像から自分でこのファイルを生成し、
// node prototype/build.mjs で index.html を作り直す（生成物はコミットしない）。
const REFS = {};
