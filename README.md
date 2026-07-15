# Vitrine ✦ Live On-Chain Gallery

**Vitrine** is a live, on-chain digital art gallery built on the **Stellar Soroban Smart Contract Platform**. It provides a minimal white-cube gallery grid interface that connects multiple browser extension wallets, tracks contract state through transaction simulation, and instantly displays newly minted artworks in real-time as soon as the transaction confirms.

---

## 🚀 Verifiable Testnet Deployment

The smart contract is compiled, deployed, initialized, and actively running on the **Stellar Testnet**:

*   **Live Portal Link:** [https://vitrine-sigma-kohl.vercel.app/](https://vitrine-sigma-kohl.vercel.app/)
*   **Smart Contract Address:** `CAIYZOIEQD36CBOPVTK6N6ZVEJHT7O4R63L7LRK2QOWPVS4NCTCJVVDP`
    *   *Verify on Stellar.expert:* [Stellar Explorer Contract Link](https://stellar.expert/explorer/testnet/contract/CAIYZOIEQD36CBOPVTK6N6ZVEJHT7O4R63L7LRK2QOWPVS4NCTCJVVDP)
*   **Sample Contract Call (Mint) Transaction Hash:** `a351c8eab13f88613d3f5a65c6ec4fbdfee3718d16f404efd6a879896d644633`
    *   *Verify on Stellar.expert:* [Mint Tx Details](https://stellar.expert/explorer/testnet/tx/a351c8eab13f88613d3f5a65c6ec4fbdfee3718d16f404efd6a879896d644633)

### Screenshots

**Product Dashboard**
![Product Dashboard](./images/product%20dashboard.png)

**Wallet Options**
![Wallet Options](./images/wallet%20options.png)

**Verified On-Chain**
![Verified On-Chain](./images/verified%20onchain.png)

---

## 🛡️ Core Features & Level 2 Requirements Met

### 1. Live Minting & Event Sync
*   **On-Chain Minting:** Connect your wallet, provide an image URL, title, and medium to permanently store your artwork on the blockchain.
*   **Real-time Event Sync:** The application listens to Soroban smart contract events, seamlessly updating the gallery wall for all viewers instantly without refreshing the page.

### 2. Transaction Lifecycle Tracking
*   **Transaction Status:** The UI provides visible state tracking through the full transaction lifecycle (building → simulating → pending → success/error).

### 3. Multi-Wallet Integration
Uses `@creit.tech/stellar-wallets-kit` to support multiple browser wallets, offering support for Freighter, xBull, Albedo, Lobstr, and Hana.

---

## 💻 Running Locally

To run the frontend yourself:

```bash
cd frontend
npm install
# Ensure you copy .env.example to .env and provide VITE_CONTRACT_ID
npm run dev
```

Open the printed local URL, connect a wallet set to **Testnet**, and mint a piece!
