// フェーズ3 骨格: 生成コアが Vite 経由で動くことと、トークン/テーマ切替が効くことを確認する最小 UI。
// 本実装 (docs/02-spec.md §2) はこの上に組む。
import { useEffect, useRef, useState } from "react";
import { generate, PRESETS, type PresetKey, toRGBA } from "@/core/camo.js";
import styles from "./App.module.scss";

const SIZE = 512;

export function App() {
  const [preset, setPreset] = useState<PresetKey>("woodland");
  const [seed, setSeed] = useState(1234);
  const [ms, setMs] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const t0 = performance.now();
    const res = generate(preset, SIZE, SIZE, seed, 1.0);
    const rgba = toRGBA(
      res,
      PRESETS[preset].colors.map((c) => c.hex),
    );
    el.getContext("2d")?.putImageData(new ImageData(rgba, res.w, res.h), 0, 0);
    setMs(Math.round(performance.now() - t0));
  }, [preset, seed]);

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Camo Generator</h1>
        <button type="button" onClick={toggleTheme}>
          テーマ切替
        </button>
      </header>
      <aside className={styles.panel}>
        <label>
          パターン
          <select value={preset} onChange={(e) => setPreset(e.target.value as PresetKey)}>
            {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
              <option key={k} value={k}>
                {PRESETS[k].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          シード
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
        </label>
        <p className={styles.mono}>
          {SIZE}×{SIZE} px / {ms} ms
        </p>
      </aside>
      <main className={styles.preview}>
        <canvas ref={canvas} width={SIZE} height={SIZE} className={styles.canvas} />
      </main>
    </div>
  );
}
