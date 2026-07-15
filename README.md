# Vitrine

A live, on-chain gallery. Anyone connects a wallet, submits a piece —
title and medium — and it's minted straight onto the wall: a white-cube
gallery grid where the newest arrival gets a spotlight-reveal the
instant its transaction confirms, for every visitor watching, not just
the minter.

Built for Level 2 (multi-wallet + smart-contract-deployment track):
multi-wallet connect, a deployed testnet contract, frontend→contract
calls, live event sync, and full transaction status tracking.

## Why this project

| Requirement | Where it lives |
|---|---|
| Multi-wallet integration | `frontend/src/lib/wallet.ts` — StellarWalletsKit with Freighter, xBull, Albedo, Lobstr, Hana |
| 3+ error types handled | `frontend/src/lib/errors.ts` — `WalletNotFoundError`, `UserRejectedError`, `InsufficientBalanceError`, `InvalidMetadataError`, `ItemNotFoundError` |
| Contract deployed on testnet | `contracts/vitrine/` + `scripts/deploy.sh` |
| Contract called from frontend | `frontend/src/lib/contract.ts` — `mint`, `transfer`, `get_item`, `total_supply` |
| Transaction status visible | `frontend/src/components/TxStatusBanner.tsx` — building → simulating → pending → success/error |
| Real-time event sync | `subscribeToMintEvents` polls Soroban RPC `getEvents` for `minted` topics; every connected viewer's gallery grid grows live as pieces are minted |

## A note on scope: this is a lightweight registry, not a token standard

`mint()` assigns a sequential ID, records title/medium/creator/owner,
and lets the owner `transfer()` it — enough to demonstrate real
minting, ownership, and live state sync on Soroban. It's deliberately
**not** a full NFT implementation: no approvals/operators, no
royalties, no metadata URIs pointing at off-chain storage (IPFS/Arweave
etc.). Framing it as anything more would overstate what's actually
enforced on-chain. The natural next step, if you want to extend it, is
adding an approval mapping for marketplace-style transfers and an
off-chain metadata URI field.

## Project structure

```
vitrine/
├── contracts/
│   └── vitrine/            # Soroban contract (Rust)
│       ├── src/lib.rs
│       └── src/test.rs
├── frontend/                # React + Vite + TypeScript
│   └── src/
│       ├── lib/             # wallet.ts, contract.ts, errors.ts
│       └── components/      # GalleryCard, MintForm, ConnectWallet, TxStatusBanner
└── scripts/
    └── deploy.sh            # build → optimize → deploy → name the gallery
```

## Contract

`contracts/vitrine/src/lib.rs` exposes:

- `initialize(admin, gallery_name)` — names the gallery once, at deploy time.
- `mint(owner, title, medium)` — requires the minter's signature; validates title (1-80 chars) and medium (1-40 chars); assigns the next sequential ID; emits a `minted` event with `(id, owner)`.
- `transfer(from, to, id)` — requires the current owner's signature; rejects if `from` doesn't actually own the item; emits an `xfer` event.
- `get_item(id)` / `total_supply()` / `gallery_name()` — reads.

Run the tests:

```bash
cd contracts/vitrine
cargo test
```

## Deploying the contract yourself

You'll need [stellar-cli](https://developers.stellar.org/docs/tools/developer-tools/cli) and a funded testnet identity.

```bash
stellar keys generate admin --network testnet --fund
./scripts/deploy.sh "Anish's Gallery"
```

The script prints the deployed contract ID — put it in `frontend/.env`
as `VITE_CONTRACT_ID`.

> Note: the contract address, transaction hash, and demo link below are
> placeholders. Deploy with the script above and mint one piece to get
> your own real values — these only exist once you actually sign and
> broadcast on testnet.

**Deployed contract address:** `PASTE_YOUR_CONTRACT_ID_HERE`
**Transaction hash of a mint call:** `PASTE_A_TX_HASH_HERE` (verify at `https://stellar.expert/explorer/testnet/tx/<hash>`)
**Live demo:** `PASTE_YOUR_VERCEL_OR_NETLIFY_URL_HERE`

## Running the frontend locally

```bash
cd frontend
npm install
cp .env.example .env   # then fill in VITE_CONTRACT_ID
npm run dev
```

Open the printed local URL, connect a wallet set to **Testnet**, and
mint a piece. Open the same URL in a second browser/tab with a
different wallet to watch the new card spotlight-reveal live on both
screens.

## Error handling

| Scenario | How it's surfaced |
|---|---|
| Wallet not installed | `WalletNotFoundError` — shown inline, doesn't crash the app |
| Wallet rejects the signing prompt | `UserRejectedError` — caught around `signXdr` |
| Insufficient XLM for fees | `InsufficientBalanceError` — checked via Horizon before the transaction is even built |
| Empty/oversized title or medium | `InvalidMetadataError` — the contract enforces length bounds; the frontend also disables the mint button until both fields are valid |
| Reading a piece that doesn't exist | `ItemNotFoundError` — surfaced if a stale event or bad ID slips through |

## Transaction status tracking

Every mint moves through visible states in `TxStatusBanner`:
`building` → `simulating` → `pending` → `success` (with a Stellar
Expert link) or `error` (with the specific reason).

## Deploying the frontend

Any static host works (Vercel, Netlify, Cloudflare Pages). Build
command `npm run build`, output directory `dist/`, set
`VITE_CONTRACT_ID` as an environment variable in the host's dashboard.

## Screenshot

Add a screenshot of the wallet-select modal here before submitting:

`![wallet options](./docs/wallet-options.png)`
