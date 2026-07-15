import { useEffect, useState } from "react";
import { ConnectWallet } from "./components/ConnectWallet";
import { GalleryCard } from "./components/GalleryCard";
import { MintForm } from "./components/MintForm";
import { TxStatusBanner } from "./components/TxStatusBanner";
import { connectWallet } from "./lib/wallet";
import {
  mintItem,
  loadRecentItems,
  getItem,
  subscribeToMintEvents,
  getGalleryName,
  GalleryItem,
  TxStatus,
  CONTRACT_ID,
} from "./lib/contract";
import { classifyError } from "./lib/errors";

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [galleryName, setGalleryName] = useState<string>("Vitrine");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [newestId, setNewestId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);
        const [name, recent] = await Promise.all([getGalleryName(address), loadRecentItems(address)]);
        if (cancelled) return;
        setGalleryName(name);
        setItems(recent);
      } catch (err) {
        if (!cancelled) setLoadError(classifyError(err).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  // Live sync: any mint from any wallet adds a card to everyone's wall.
  useEffect(() => {
    if (!address) return;
    const unsubscribe = subscribeToMintEvents(async (id) => {
      try {
        const item = await getItem(address, id);
        setItems((prev) => (prev.some((p) => p.id === id) ? prev : [item, ...prev]));
        setNewestId(id);
      } catch {
        // ignore — a later poll or manual refresh will pick it up
      }
    });
    return unsubscribe;
  }, [address]);

  async function handleConnect() {
    setConnecting(true);
    setErrorMessage(null);
    try {
      const { address: connectedAddress } = await connectWallet();
      setAddress(connectedAddress);
    } catch (err) {
      setErrorMessage(classifyError(err).message);
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setItems([]);
  }

  async function handleMint(title: string, medium: string) {
    if (!address) return;
    setMinting(true);
    setErrorMessage(null);
    setTxHash(null);
    try {
      const { hash, item } = await mintItem(address, title, medium, setTxStatus);
      setTxHash(hash);
      setItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [item, ...prev]));
      setNewestId(item.id);
    } catch (err) {
      setErrorMessage(classifyError(err).message);
      setTxStatus("error");
    } finally {
      setMinting(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-mark">{galleryName}</span>
          <span className="app__brand-sub">a live on-chain gallery · Soroban testnet</span>
        </div>
        <ConnectWallet address={address} connecting={connecting} onConnect={handleConnect} onDisconnect={handleDisconnect} />
      </header>

      <TxStatusBanner status={txStatus} hash={txHash} errorMessage={txStatus === "error" ? errorMessage : null} />

      <main className="app__main">
        {!CONTRACT_ID && (
          <div className="callout callout--warn">
            No contract configured. Set <code>VITE_CONTRACT_ID</code> in <code>.env</code> after deploying (see README).
          </div>
        )}

        {!address && CONTRACT_ID && <div className="callout">Connect a wallet to browse the gallery and mint a piece.</div>}

        {address && loadError && <div className="callout callout--error">{loadError}</div>}

        {address && <MintForm connected={!!address} minting={minting} onMint={handleMint} />}

        {errorMessage && txStatus !== "error" && <div className="callout callout--error">{errorMessage}</div>}

        {items.length > 0 && (
          <div className="gallery-grid">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} isNew={item.id === newestId} />
            ))}
          </div>
        )}

        {address && items.length === 0 && !loadError && (
          <div className="callout">The wall is empty — be the first to mint a piece.</div>
        )}
      </main>

      <footer className="app__footer">
        contract: <code>{CONTRACT_ID || "not deployed yet"}</code>
      </footer>
    </div>
  );
}
