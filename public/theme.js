// テーマと言語の初期化: 描画前に data-theme と lang を確定してフラッシュを防ぐ。
// CSP (default-src 'self') でインラインスクリプトを禁止しているため外部ファイルにしている。
// 言語は URL に載せない (共有 URL は閲覧者の言語で表示する)。localStorage → ブラウザ言語 (ja 系なら ja、他は en)。
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

  var l;
  try {
    l = localStorage.getItem("lang");
    if (l !== "ja" && l !== "en") {
      var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "";
      l = /^ja(-|$)/i.test(nav) ? "ja" : "en";
    }
  } catch (e) {
    l = "en";
  }
  document.documentElement.lang = l;
})();
