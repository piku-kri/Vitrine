import { TxStatus } from "../lib/contract";

interface TxStatusBannerProps {
  status: TxStatus;
  hash: string | null;
  errorMessage: string | null;
}

const LABELS: Record<TxStatus, string> = {
  idle: "",
  building: "Preparing the piece for the wall…",
  simulating: "Checking with the registry…",
  pending: "Submitted — waiting for the network to confirm…",
  success: "Minted — now on display",
  error: "The mint didn't go through",
};

export function TxStatusBanner({ status, hash, errorMessage }: TxStatusBannerProps) {
  if (status === "idle") return null;

  return (
    <div className={`status-strip status-strip--${status}`} role="status">
      <span className="status-strip__label">{LABELS[status]}</span>
      {errorMessage && <span className="status-strip__detail">{errorMessage}</span>}
      {hash && status === "success" && (
        <a
          className="status-strip__link"
          href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          view on Stellar Expert →
        </a>
      )}
    </div>
  );
}
