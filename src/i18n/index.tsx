// 言語状態と t() を配る Context。言語は URL に載せない (共有 URL は閲覧者の言語で表示する。テーマと同じ扱い)。
// 初期値は public/theme.js が localStorage("lang") → navigator.language の順で決めて <html lang> に置いた値。
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MessageKey } from "./ja";
import { type Params, readLang, t } from "./t";
import type { L10n, Lang } from "./types";

interface I18n {
  lang: Lang;
  /** UI 文言 */
  t: (key: MessageKey, params?: Params) => string;
  /** データ側の二言語ラベル */
  pick: (l: L10n) => string;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("lang", lang);
    } catch {
      /* private mode */
    }
  }, [lang]);
  const toggleLang = useCallback(() => setLang((l) => (l === "ja" ? "en" : "ja")), []);
  const value = useMemo<I18n>(
    () => ({
      lang,
      t: (key, params) => t(lang, key, params),
      pick: (l) => l[lang],
      setLang,
      toggleLang,
    }),
    [lang, toggleLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used within I18nProvider");
  return v;
}

export type { MessageKey } from "./ja";
export { readLang, t } from "./t";
export { type L10n, type Lang, pick, pickOr } from "./types";
