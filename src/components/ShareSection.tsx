interface Props {
  onCopyLink: () => void;
  onShare?: () => void;
  busy: boolean;
}

export function ShareSection({ onCopyLink, onShare, busy }: Props) {
  return (
    <div className="section">
      <h2 className="sectionTitle">共有</h2>
      <div className="row">
        <button type="button" className="btn grow" onClick={onCopyLink}>
          リンクをコピー
        </button>
        {onShare && (
          <button type="button" className="btn primary grow" disabled={busy} onClick={onShare}>
            共有…
          </button>
        )}
      </div>
      <p className="hint">
        URL にパターン・シード・色・サイズがすべて含まれます。リンクを開けば同じ模様が再現されます。
      </p>
    </div>
  );
}
