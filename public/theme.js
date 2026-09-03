// テーマ初期化: 描画前に data-theme を確定してフラッシュを防ぐ。
// CSP (default-src 'self') でインラインスクリプトを禁止しているため外部ファイルにしている。
(function () {
  var t;
  try {
    t = localStorage.getItem("theme");
    if (t !== "light" && t !== "dark") {
      t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  } catch (e) {
    t = "light";
  }
  document.documentElement.dataset.theme = t;
})();
