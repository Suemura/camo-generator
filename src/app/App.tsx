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
import { I18nProvider, useI18n } from "@/i18n";
import { colorRole } from "@/i18n/color-roles";
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
  // 言語 Provider は About にも掛ける。ErrorBoundary は Provider の内側 (Provider 自体は状態 1 つで落ちない)
  const about = window.location.pathname.replace(/\/$/, "") === "/about";
  return (
    <I18nProvider>
      {about ? (
        <About />
      ) : (
        <ErrorBoundary>
          <ToastProvider>
            <Generator />
          </ToastProvider>
        </ErrorBoundary>
      )}
    </I18nProvider>
  );
}

type Tab = "pattern" | "palette" | "export";

function Generator() {
  const [state, update] = useUrlState();
  const { t, lang, pick } = useI18n();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("single");
  const [tab, setTab] = useState<Tab>("pattern");
  const [librarySlot, setLibrarySlot] = useState<number | null>(null);
  const [extractOpen, setExtractOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [busyProgress, setBusyProgress] = useState<number | null>(null);
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
  const slotNames = PRESETS[state.preset].colors.map((c) => colorRole(c.name, lang));

  const renderFull = useCallback(async () => {
    const px = outputPx(state);
    setBusy(t("app.busy.generating", { w: px.w, h: px.h }));
    setBusyProgress(0);
    try {
      return await generateAsync(
        {
          preset: state.preset,
          w: px.w,
          h: px.h,
          seed: state.seed,
          scale: state.scale,
          tileable: state.tileable,
        },
        setBusyProgress,
      );
    } finally {
      setBusy(null);
      setBusyProgress(null);
    }
  }, [state, t]);

  const onExport = useCallback(
    async (format: Format) => {
      try {
        const res = await renderFull();
        const name = exportFilename(state.preset, state.seed, res.w, res.h, format);
        if (format === "svg") {
          downloadBlob(new Blob([gridToSvg(res, palette)], { type: "image/svg+xml" }), name);
        } else {
          setBusy(t("app.busy.encoding"));
          const dpi = state.unit !== "px" ? state.dpi : undefined;
          downloadBlob(await exportRaster(res, palette, format, dpi), name);
        }
        toast(t("app.toast.exported", { name }), "success");
      } catch (e) {
        toast(t("app.toast.exportFailed", { message: (e as Error).message }), "error");
      } finally {
        setBusy(null);
      }
    },
    [renderFull, state, palette, toast, t],
  );

  const onCopyLink = useCallback(async () => {
    toast(
      (await copyLink(window.location.href))
        ? t("app.toast.linkCopied")
        : t("app.toast.copyFailed"),
      "success",
    );
  }, [toast, t]);

  const onShare = useCallback(async () => {
    try {
      // 共有用画像は長辺 2048px 上限
      const px = outputPx(state);
      const k = Math.min(1, 2048 / Math.max(px.w, px.h));
      setBusy(t("app.busy.shareImage"));
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
        `Camo Generator – ${pick(PRESET_META[state.preset].label)}`,
      );
      if (!ok) toast(t("app.toast.shareUnavailable"), "error");
    } catch (e) {
      toast(t("app.toast.shareFailed", { message: (e as Error).message }), "error");
    } finally {
      setBusy(null);
    }
  }, [state, palette, toast, t, pick]);

  const shareAvailable = canShareUrl();

  return (
    <div className={styles.layout}>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        onCopyLink={onCopyLink}
        onShare={shareAvailable ? onShare : undefined}
      />
      <Preview state={state} mode={mode} onMode={setMode} busy={busy} busyProgress={busyProgress} />
      <aside className={styles.panel} aria-label={t("app.settings")}>
        <div className={`${styles.tabs} seg`} role="tablist" aria-label={t("app.settingsTabs")}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pattern"}
            aria-pressed={tab === "pattern"}
            onClick={() => setTab("pattern")}
          >
            {t("app.tab.pattern")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "palette"}
            aria-pressed={tab === "palette"}
            onClick={() => setTab("palette")}
          >
            {t("app.tab.palette")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "export"}
            aria-pressed={tab === "export"}
            onClick={() => setTab("export")}
          >
            {t("app.tab.export")}
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
          toast(t("app.toast.extractApplied"), "success");
        }}
      />
    </div>
  );
}
