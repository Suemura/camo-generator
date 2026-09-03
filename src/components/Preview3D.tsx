// 3D プレビュー: 生成結果を実寸相当のモデルに貼って表示。three.js は選択時に動的ロードする
import { useEffect, useRef, useState } from "react";
import type { GenResult } from "@/core/camo.js";
import { drawToCanvas } from "@/lib/export";
import type { Model3D } from "@/lib/preview3d-math";
import type { Scene3D } from "@/lib/scene3d";
import { hasWebGL } from "@/lib/webgl";
import styles from "./Preview.module.scss";

type Status = "loading" | "ready" | "unsupported" | "error";

interface Props {
  res: GenResult | null;
  palette: string[];
  model: Model3D;
  repeat: { x: number; y: number };
}

export function Preview3D({ res, palette, model, repeat }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  // テクスチャ元。DOM に挿入しない作業用 canvas
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [envFailed, setEnvFailed] = useState(false);
  const lastResRef = useRef<GenResult | null>(null);

  // three の読み込みとシーン構築。unmount で dispose
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasWebGL()) {
      setStatus("unsupported");
      return;
    }
    let alive = true;
    setStatus("loading");
    import("@/lib/scene3d")
      .then((m) => {
        if (!alive) return;
        const scene = new m.Scene3D(canvas, {
          onEnvError: () => alive && setEnvFailed(true),
        });
        sceneRef.current = scene;
        const parent = canvas.parentElement;
        if (parent) scene.resize(parent.clientWidth, parent.clientHeight);
        scene.start();
        setStatus("ready");
      })
      .catch((e) => {
        console.error(e);
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      lastResRef.current = null; // 次のシーンには setSource からやり直す
    };
  }, [attempt]);

  // 親サイズに追従
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!parent || status !== "ready") return;
    const ro = new ResizeObserver(() => {
      sceneRef.current?.resize(parent.clientWidth, parent.clientHeight);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [status]);

  // テクスチャ更新。形状 (res) が変われば CanvasTexture を差し替え、パレットだけなら GPU 再アップロードのみ
  // (再生成しない: 形状 / 色分離)
  useEffect(() => {
    if (status !== "ready" || !res) return;
    srcRef.current ??= document.createElement("canvas");
    drawToCanvas(res, palette, srcRef.current);
    if (lastResRef.current !== res) {
      lastResRef.current = res;
      sceneRef.current?.setSource(srcRef.current);
    } else {
      sceneRef.current?.refreshSource();
    }
  }, [res, palette, status]);

  useEffect(() => {
    if (status === "ready") sceneRef.current?.setModel(model);
  }, [model, status]);

  useEffect(() => {
    if (status === "ready") sceneRef.current?.setRepeat(repeat);
  }, [repeat, status, model]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={styles.canvas3d}
        aria-label="生成された迷彩の 3D プレビュー"
        hidden={status === "unsupported" || status === "error"}
      />
      {status === "loading" && (
        <div className={styles.badge} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <span>3D を読み込み中…</span>
        </div>
      )}
      {status === "ready" && envFailed && (
        <p className={`${styles.badge} hint`} role="status">
          環境光の読み込みに失敗したため簡易ライティングで表示しています
        </p>
      )}
      {(status === "unsupported" || status === "error") && (
        <div className={styles.fallback} role="status">
          <p>
            3D プレビューはこの環境では利用できません
            {status === "unsupported" ? "（WebGL 非対応）" : "（3D ライブラリの読み込みに失敗）"}
          </p>
          {status === "error" && (
            <button type="button" className="btn ghost sm" onClick={() => setAttempt((n) => n + 1)}>
              再試行
            </button>
          )}
        </div>
      )}
    </>
  );
}
