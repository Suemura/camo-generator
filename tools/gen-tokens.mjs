// docs/design/spacious-DESIGN.md の frontmatter からプリミティブトークンを生成する。
// 出力: src/styles/tokens/_primitives.scss（生成物、手で編集しない）
// 依存ゼロ: frontmatter は 2 階層のシンプルな YAML なので自前で読む。
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const md = fs.readFileSync(`${root}docs/design/spacious-DESIGN.md`, "utf8");
const fm = md.match(/^---\n([\s\S]*?)\n---/)?.[1];
if (!fm) throw new Error("frontmatter not found");

// 2 階層 YAML (key:\n  sub: value) → {key: {sub: value}} / key: value
const tokens = {};
let section = null;
for (const raw of fm.split("\n")) {
  const line = raw.replace(/\s+$/, "");
  if (!line) continue;
  const top = line.match(/^([A-Za-z-]+):\s*(.*)$/);
  const sub = line.match(/^ {2}([A-Za-z0-9-]+):\s*(.*)$/);
  const sub2 = line.match(/^ {4}([A-Za-z0-9-]+):\s*(.*)$/);
  const unq = (v) => v.replace(/^"(.*)"$/, "$1");
  if (top) {
    section = top[1];
    tokens[section] = top[2] ? unq(top[2]) : {};
  } else if (sub && section) {
    tokens[section][sub[1]] = sub[2] ? unq(sub[2]) : {};
    tokens[section].__last = sub[1];
  } else if (sub2 && section) {
    tokens[section][tokens[section].__last][sub2[1]] = unq(sub2[2]);
  }
}
for (const s of Object.values(tokens)) if (typeof s === "object") delete s.__last;

const colors = tokens.colors;
const typeScale = tokens.typography.sourceScale.split("/").map(Number); // 12/14/16/18/24/30/36
const fonts = {
  body: tokens.typography["body-md"].fontFamily,
  display: tokens.typography.h1.fontFamily,
  mono: tokens.typography["label-caps"].fontFamily,
};
const radius = tokens.rounded;

// ニュートラル階調: spacious は surface(#fff)/text(#111827) しか持たないので、
// text 色相 (slate 系) を軸に Tailwind slate 相当の階調を採用する。ダークテーマの背景もここから取る。
const neutral = {
  0: "#FFFFFF",
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
  950: "#020617",
};

let out = `// 生成物: tools/gen-tokens.mjs が docs/design/spacious-DESIGN.md から出力。手で編集しない。\n`;
out += `// spacious (awesome-design-skills, MIT) のプリミティブトークン。\n\n`;
for (const [k, v] of Object.entries(colors)) out += `$${k}: ${v};\n`;
out += "\n";
for (const [k, v] of Object.entries(neutral)) out += `$neutral-${k}: ${v};\n`;
out += "\n";
for (const [k, v] of Object.entries(fonts)) out += `$font-${k}: "${v}";\n`;
out += "\n// 文字スケール (px → rem)\n";
const names = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
typeScale.forEach((px, i) => {
  out += `$text-${names[i]}: ${px / 16}rem;\n`;
});
out += "\n// 8pt グリッド\n$space-unit: 8px;\n";
[0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12].forEach((n) => {
  out += `$space-${String(n).replace(".", "_")}: ${n * 8}px;\n`;
});
out += "\n";
for (const [k, v] of Object.entries(radius)) out += `$radius-${k}: ${v};\n`;
out += `$radius-lg: 12px;\n$radius-full: 9999px;\n`;

fs.mkdirSync(`${root}src/styles/tokens`, { recursive: true });
fs.writeFileSync(`${root}src/styles/tokens/_primitives.scss`, out);
console.log("generated src/styles/tokens/_primitives.scss");
