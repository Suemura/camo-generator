// URL ⇄ 状態の 1 本道。変更は replaceState で即時反映 (履歴は汚さない)。
import { useCallback, useEffect, useState } from "react";
import { type AppState, parseState, serializeState } from "@/lib/state";

export function useUrlState() {
  // 初回アクセスでシード未指定なら毎回違う模様を見せる
  const randomSeed = () => Math.floor(Math.random() * 1_000_000);
  const [state, setState] = useState<AppState>(() =>
    parseState(window.location.search, randomSeed()),
  );

  useEffect(() => {
    const q = serializeState(state);
    const next = `${window.location.pathname}${q}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", next);
    }
  }, [state]);

  useEffect(() => {
    const onPop = () => setState(parseState(window.location.search, randomSeed()));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  return [state, update] as const;
}
