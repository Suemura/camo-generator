// メイン 1 画面 (docs/02-spec.md §2)。/about のみ別ページ。
import { useCallback, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExportSection } from "@/components/ExportSection";
import { ExtractDialog } from "@/components/ExtractDialog";
import { Header } from "@/components/Header";
import { PaletteLibraryDrawer } from "@/components/PaletteLibraryDrawer";
import { PaletteSection } from "@/components/PaletteSection";
import { PatternSection } from "@/components/PatternSection";
import { Preview, type ViewMode } from "@/components/Preview";
import { ShareSection } from "@/components/ShareSection";
import { ToastProvider, useToast } from "@/components/Toast";
import { PRESETS } from "@/core/camo.js";
import { PRESET_META } from "@/data/presets-meta";
import { downloadBlob, exportFilename, exportRaster, type Format, gridToSvg } from "@/lib/export";
import { generateAsync } from "@/lib/generate";
import { canShareUrl, copyLink, shareImage } from "@/lib/share";
import { type AppState, effectivePalette } from "@/lib/state";
import { outputPx } from "@/lib/units";
import { About } from "./About";
import styles from "./App.module.scss";
import { useTheme } from "./useTheme";
import { useUrlState } from "./useUrlState";

export function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/about") return <About />;
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Generator />
      </ToastProvider>
    </ErrorBoundary>
  );
}

type Tab = "pattern" | "palette" | "export";

function Generator() {
  const [state, update] = useUrlState();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("single");
  const [tab, setTab] = useState<Tab>("pattern");
  const [librarySlot, setLibrarySlot] = useState<number | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // ライブラリから選んだ色の id (スロット別)。同 hex が複数規格にある場合の表示名確定用
  const [slotIds, setSlotIds] = useState<(string | undefined)[]>([]);

  const palette = effectivePalette(state);
  const updatePalette = useCallback(
    (patch: Partial<AppState>) => {
      if ("palette" in patch || "preset" in patch) setSlotIds([]);
      update(patch);
    },
    [update],
  );
  const slotNames = PRESETS[state.preset].colors.map((c) => c.name);

  const renderFull = useCallback(async () => {
    const px = outputPx(state);
    setBusy(`${px.w}×${px.h} px を生成中…`);
    try {
      return await generateAsync({
        preset: state.preset,
        w: px.w,
        h: px.h,
        seed: state.seed,
        scale: state.scale,
        tileable: state.tileable,
      });
    } finally {
      setBusy(null);
    }
  }, [state]);

  const onExport = useCallback(
    async (format: Format) => {
      try {
        const res = await renderFull();
        const name = exportFilename(state.preset, state.seed, res.w, res.h, format);
        if (format === "svg") {
          downloadBlob(new Blob([gridToSvg(res, palette)], { type: "image/svg+xml" }), name);
        } else {
          setBusy("エンコード中…");
          const dpi = state.unit !== "px" ? state.dpi : undefined;
          downloadBlob(await exportRaster(res, palette, format, dpi), name);
        }
        toast(`${name} を書き出しました`, "success");
      } catch (e) {
        toast(`書き出しに失敗: ${(e as Error).message}`, "error");
      } finally {
        setBusy(null);
      }
    },
    [renderFull, state, palette, toast],
  );

  const onCopyLink = useCallback(async () => {
    toast(
      (await copyLink(window.location.href)) ? "リンクをコピーしました" : "コピーできませんでした",
      "success",
    );
  }, [toast]);

  const onShare = useCallback(async () => {
    try {
      // 共有用画像は長辺 2048px 上限
      const px = outputPx(state);
      const k = Math.min(1, 2048 / Math.max(px.w, px.h));
      setBusy("共有用画像を生成中…");
      const res = await generateAsync({
        preset: state.preset,
        w: Math.round(px.w * k),
        h: Math.round(px.h * k),
        seed: state.seed,
        scale: state.scale,
        tileable: state.tileable,
      });
      const blob = await exportRaster(res, palette, "png");
      setBusy(null);
      const ok = await shareImage(
        blob,
        exportFilename(state.preset, state.seed, res.w, res.h, "png"),
        window.location.href,
        `Camo Generator – ${PRESET_META[state.preset].label}`,
      );
      if (!ok) toast("この環境では共有できません。リンクをコピーしてください", "error");
    } catch (e) {
      toast(`共有に失敗: ${(e as Error).message}`, "error");
    } finally {
      setBusy(null);
    }
  }, [state, palette, toast]);

  const shareAvailable = canShareUrl();

  return (
    <div className={styles.layout}>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        onCopyLink={onCopyLink}
        onShare={shareAvailable ? onShare : undefined}
      />
      <Preview state={state} mode={mode} onMode={setMode} busy={busy} />
      <aside className={styles.panel} aria-label="設定">
        <div className={`${styles.tabs} seg`} role="tablist" aria-label="設定カテゴリ">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pattern"}
            aria-pressed={tab === "pattern"}
            onClick={() => setTab("pattern")}
          >
            パターン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "palette"}
            aria-pressed={tab === "palette"}
            onClick={() => setTab("palette")}
          >
            色
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "export"}
            aria-pressed={tab === "export"}
            onClick={() => setTab("export")}
          >
            出力 / 共有
          </button>
        </div>
        <div className={styles.sections} data-tab={tab}>
          <div data-section="pattern">
            <PatternSection state={state} onChange={updatePalette} />
          </div>
          <div data-section="palette">
            <PaletteSection
              state={state}
              slotIds={slotIds}
              onChange={updatePalette}
              onPickerChange={(i, hex) => {
                const next = [...palette];
                next[i] = hex.toLowerCase();
                setSlotIds((ids) => {
                  const n = [...ids];
                  n[i] = undefined;
                  return n;
                });
                update({ palette: next });
              }}
              onOpenLibrary={setLibrarySlot}
              onOpenExtract={() => setExtractOpen(true)}
            />
          </div>
          <div data-section="export">
            <ExportSection state={state} onChange={update} onExport={onExport} busy={!!busy} />
            <ShareSection
              onCopyLink={onCopyLink}
              onShare={shareAvailable ? onShare : undefined}
              busy={!!busy}
            />
          </div>
        </div>
      </aside>
      <PaletteLibraryDrawer
        open={librarySlot !== null}
        slotName={librarySlot !== null ? slotNames[librarySlot] : ""}
        onClose={() => setLibrarySlot(null)}
        currentId={librarySlot !== null ? slotIds[librarySlot] : undefined}
        onPick={(color) => {
          if (librarySlot === null) return;
          const next = [...palette];
          next[librarySlot] = color.hex.toLowerCase();
          setSlotIds((ids) => {
            const n = [...ids];
            n[librarySlot] = color.id;
            return n;
          });
          update({ palette: next });
          setLibrarySlot(null);
        }}
      />
      <ExtractDialog
        open={extractOpen}
        slotNames={slotNames}
        onClose={() => setExtractOpen(false)}
        onApply={(colors) => {
          setSlotIds([]);
          update({ palette: colors.map((c) => c.toLowerCase()) });
          setExtractOpen(false);
          toast("抽出したパレットを適用しました", "success");
        }}
      />
    </div>
  );
}
