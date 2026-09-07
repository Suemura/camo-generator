// 翻訳の素関数。React 外 (ErrorBoundary / lib) からも使う。
import { en } from "./en";
import { ja, type MessageKey } from "./ja";
import { isLang, type Lang } from "./types";

const DICT: Record<Lang, Record<MessageKey, string>> = { ja, en };

export type Params = Record<string, string | number>;

export function t(lang: Lang, key: MessageKey, params?: Params): string {
  const s = DICT[lang][key];
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** 描画前に public/theme.js が <html lang> を確定している。Provider 外 (ErrorBoundary 等) はここから読む */
export function readLang(): Lang {
  const v = typeof document === "undefined" ? undefined : document.documentElement.lang;
  return isLang(v) ? v : "ja";
}
