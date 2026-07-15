import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  rpc as SorobanRpc,
} from "@stellar/stellar-sdk";
import { signXdr } from "./wallet";
import { InsufficientBalanceError, UserRejectedError, classifyError } from "./errors";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID as string;
const NETWORK_PASSPHRASE = Networks.TESTNET;
const MIN_XLM_FOR_FEES = 2;
const MAX_ITEMS_TO_LOAD = 24;

export const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export type TxStatus = "idle" | "building" | "simulating" | "pending" | "success" | "error";

export interface GalleryItem {
  id: number;
  title: string;
  medium: string;
  imageUrl: string;
  creator: string;
  owner: string;
  mintedAt: number;
}

export async function assertCanAffordFee(publicKey: string): Promise<void> {
  const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (res.status === 404) {
    throw new InsufficientBalanceError("0", String(MIN_XLM_FOR_FEES));
  }
  if (!res.ok) return;
  const data = await res.json();
  const nativeBalance = data.balances?.find((b: any) => b.asset_type === "native");
  const available = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
  if (available < MIN_XLM_FOR_FEES) {
    throw new InsufficientBalanceError(available.toFixed(2), String(MIN_XLM_FOR_FEES));
  }
}

async function loadAccount(publicKey: string) {
  return server.getAccount(publicKey);
}

async function simulateRead(publicKey: string, method: string, args: any[] = []) {
  const account = await loadAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  return scValToNative(sim.result!.retval);
}

function mapItem(raw: any): GalleryItem {
  return {
    id: Number(raw.id),
    title: raw.title,
    medium: raw.medium,
    imageUrl: raw.image_url,
    creator: raw.creator,
    owner: raw.owner,
    mintedAt: Number(raw.minted_at),
  };
}

export async function getGalleryName(publicKey: string): Promise<string> {
  return simulateRead(publicKey, "gallery_name");
}

export async function getTotalSupply(publicKey: string): Promise<number> {
  const raw = await simulateRead(publicKey, "total_supply");
  return Number(raw);
}

export async function getItem(publicKey: string, id: number): Promise<GalleryItem> {
  const raw = await simulateRead(publicKey, "get_item", [nativeToScVal(id, { type: "u64" })]);
  return mapItem(raw);
}

/** Loads the most recent items (newest first) up to a cap, for the initial gallery render. */
export async function loadRecentItems(publicKey: string): Promise<GalleryItem[]> {
  const supply = await getTotalSupply(publicKey);
  const start = Math.max(0, supply - MAX_ITEMS_TO_LOAD);
  const ids: number[] = [];
  for (let id = supply - 1; id >= start; id--) ids.push(id);
  const items = await Promise.all(ids.map((id) => getItem(publicKey, id)));
  return items;
}

/**
 * Mints a new item: builds, simulates, signs (via the connected wallet),
 * submits, then polls Soroban RPC until the tx confirms or fails —
 * driving the pending → success/error status the UI shows.
 */
export async function mintItem(
  publicKey: string,
  title: string,
  medium: string,
  imageUrl: string,
  onStatus: (status: TxStatus) => void
): Promise<{ hash: string; item: GalleryItem }> {
  onStatus("building");
  await assertCanAffordFee(publicKey);

  const account = await loadAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  const ownerScVal = nativeToScVal(publicKey, { type: "address" });
  const titleScVal = nativeToScVal(title, { type: "string" });
  const mediumScVal = nativeToScVal(medium, { type: "string" });
  const imageUrlScVal = nativeToScVal(imageUrl, { type: "string" });

  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call("mint", ownerScVal, titleScVal, mediumScVal, imageUrlScVal))
    .setTimeout(60)
    .build();

  onStatus("simulating");
  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    onStatus("error");
    throw classifyError(new Error(sim.error));
  }
  tx = SorobanRpc.assembleTransaction(tx, sim).build();

  let signedXdr: string;
  try {
    signedXdr = await signXdr(tx.toXDR(), publicKey);
  } catch (err) {
    onStatus("error");
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("reject") || message.toLowerCase().includes("declin") || message.toLowerCase().includes("cancel")) {
      throw new UserRejectedError();
    }
    throw classifyError(err);
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  onStatus("pending");
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    onStatus("error");
    throw classifyError(new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`));
  }

  const hash = sendResult.hash;
  const finalStatus = await pollTransactionStatus(hash);

  if (finalStatus.status !== "SUCCESS") {
    onStatus("error");
    throw classifyError(new Error(`Transaction ${finalStatus.status.toLowerCase()}`));
  }

  onStatus("success");

  // The new id is deterministic (equal to supply before minting), but
  // re-reading total_supply and the item keeps this robust even if
  // something else minted in between.
  const newSupply = await getTotalSupply(publicKey);
  const item = await getItem(publicKey, newSupply - 1);
  return { hash, item };
}

async function pollTransactionStatus(hash: string, timeoutMs = 30_000, intervalMs = 1500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await server.getTransaction(hash);
    if (result.status !== "NOT_FOUND") {
      return result;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for transaction confirmation");
}

/**
 * Real-time sync: polls Soroban RPC's getEvents for the contract's
 * `minted` events and calls back with each new item id, so every
 * connected viewer's gallery grid grows live without re-fetching
 * everything on a timer.
 */
export function subscribeToMintEvents(onMinted: (id: number) => void, pollMs = 4000): () => void {
  let cancelled = false;
  let cursorLedger: number | null = null;

  (async () => {
    try {
      const latest = await server.getLatestLedger();
      cursorLedger = Math.max(latest.sequence - 100, 1);
    } catch {
      cursorLedger = 1;
    }

    while (!cancelled) {
      try {
        const events = await server.getEvents({
          startLedger: cursorLedger!,
          filters: [
            {
              type: "contract",
              contractIds: [CONTRACT_ID],
              topics: [["minted"]],
            },
          ],
          limit: 50,
        });

        for (const event of events.events) {
          const [id] = scValToNative(event.value);
          onMinted(Number(id));
          cursorLedger = event.ledger + 1;
        }
        if (events.latestLedger) {
          cursorLedger = Math.max(cursorLedger ?? 1, events.latestLedger - 1);
        }
      } catch {
        // transient RPC hiccup — keep polling
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  })();

  return () => {
    cancelled = true;
  };
}
