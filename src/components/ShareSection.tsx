import { useI18n } from "@/i18n";

interface Props {
  onCopyLink: () => void;
  onShare?: () => void;
  busy: boolean;
}

export function ShareSection({ onCopyLink, onShare, busy }: Props) {
  const { t } = useI18n();
  return (
    <div className="section">
      <h2 className="sectionTitle">{t("share.title")}</h2>
      <div className="row">
        <button type="button" className="btn grow" onClick={onCopyLink}>
          {t("share.copyLink")}
        </button>
        {onShare && (
          <button type="button" className="btn primary grow" disabled={busy} onClick={onShare}>
            {t("share.share")}
          </button>
        )}
      </div>
      <p className="hint">{t("share.hint")}</p>
    </div>
  );
}
