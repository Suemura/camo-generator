// 共有: リンクコピー / Web Share API (docs/02-spec.md §3.5)

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function canShareFiles(): boolean {
  return typeof navigator.share === "function" && typeof navigator.canShare === "function";
}

export function canShareUrl(): boolean {
  return typeof navigator.share === "function";
}

/** 画像 + URL を共有。ファイル共有不可なら URL のみ。戻り値: 共有ダイアログを開けたか */
export async function shareImage(
  blob: Blob | null,
  filename: string,
  url: string,
  title: string,
): Promise<boolean> {
  if (!canShareUrl()) return false;
  try {
    if (blob && canShareFiles()) {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, url });
        return true;
      }
    }
    await navigator.share({ title, url });
    return true;
  } catch (e) {
    // ユーザーがキャンセルした場合も AbortError で来る
    return (e as Error)?.name === "AbortError";
  }
}
