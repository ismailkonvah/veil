# Veil

Veil is an AI-assisted confidential DeFi intent dApp demo for Sepolia. A user describes an intent
such as `Swap 0.01 ETH to USDC with MEV protection`; a Mistral-powered command router classifies the
request, the frontend encrypts sensitive fields with the Zama Relayer SDK, and the app submits
encrypted handles to a Zama FHEVM smart contract.

## Why FHE

Most DeFi workflows reveal parameters before execution: trade size, slippage tolerance, route
preferences, and MEV-protection choices. Veil demonstrates how Fully Homomorphic Encryption can keep
those parameters private while still allowing contract-side computation.

In this demo:

- Public: action class, owner, timestamp, and route commitment.
- Encrypted: amount, slippage tolerance, and MEV-protection preference.
- Computed under FHE: an encrypted risk flag that checks whether the intent is large or has high
  slippage without revealing the underlying values.

## Architecture

```txt
User
 │
 │  natural-language command
 ▼
Frontend / Veil Console
 │
 ├─ RainbowKit wallet connection
 ├─ AI command router result
 ├─ Portfolio, intent, and confidential token UI
 │
 │  command text
 ▼
Mistral AI Router
 │
 ├─ Classifies the request
 ├─ Returns a structured action
 └─ Falls back to the local parser if needed
 │
 │  amount, slippage, MEV preference
 ▼
Zama Relayer SDK
 │
 ├─ Encrypts sensitive inputs
 ├─ Creates FHE handles
 └─ Returns input proof
 │
 │  encrypted calldata
 ▼
Sepolia Smart Contracts
 │
 ├─ VeilIntentVault
 │    ├─ Stores encrypted intent fields
 │    ├─ Computes encrypted risk signal
 │    └─ Emits privacy receipt data
 │
 └─ VeilConfidentialUSDC
      ├─ Shields public USDC into vcUSDC
      ├─ Supports encrypted vcUSDC transfers
      ├─ Reveals balance only to wallet owner
      └─ Unshields vcUSDC back to public USDC
 │
 ▼
Sepolia / Etherscan
 ├─ Public transaction hash
 ├─ Public metadata
 └─ Encrypted FHE handles
```

## Code Layout

```txt
contracts/VeilIntentVault.sol      Zama FHEVM intent smart contract
contracts/VeilConfidentialUSDC.sol ERC7984 confidential USDC wrapper
scripts/deploy.cjs                 Sepolia intent-vault deploy script
scripts/deploy-confidential-usdc.cjs Sepolia confidential USDC deploy script
test/VeilIntentVault.cjs           FHEVM intent test
test/VeilConfidentialUSDC.cjs      Confidential token wrap/transfer/unwrap/finalize test
src/routes/index.tsx               Project dashboard
src/routes/console.tsx             Intent console and Sepolia submit flow
src/routes/dashboard.tsx           Privacy audit history
src/server.ts                      Server endpoint for AI intent parsing
src/lib/ai-intent.ts               AI parser client + fallback result helpers
src/lib/veil-contract.ts           Zama Relayer SDK + ethers integration
docs/VIDEO_PITCH.md                3-minute real-person pitch outline
docs/DEPLOYMENT.md                 Sepolia deployment notes
```

## Requirement Map

| Requirement                               | Where it is covered                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functioning dApp demo using Zama Protocol | `/console` connects a wallet, uses an AI command router, encrypts intent inputs with the Zama Relayer SDK, submits encrypted handles to `VeilIntentVault`, and includes an ERC7984 confidential USDC transfer panel. |
| Real-world FHE use case                   | Veil protects DeFi intent data and demonstrates confidential token balances/transfers through `VeilConfidentialUSDC`.                                                                                                |
| Smart contract + frontend implementation  | Smart contracts: `contracts/VeilIntentVault.sol`, `contracts/VeilConfidentialUSDC.sol`. Frontend: `src/routes/console.tsx`, `src/lib/veil-contract.ts`, `src/lib/confidential-usdc.ts`, `src/components/veil/*`.     |
| Clear project documentation               | This README explains setup, contract behavior, local checks, Sepolia deployment, and the demo flow. `docs/DEPLOYMENT.md` covers deployment notes, and `docs/VIDEO_PITCH.md` gives a 3-minute pitch/demo outline.     |

## Smart Contract

`VeilIntentVault` inherits `ZamaEthereumConfig` from `@fhevm/solidity/config/ZamaConfig.sol`
and uses OpenZeppelin Confidential Contracts' `FHESafeMath` helper to maintain encrypted per-user
exposure safely.

The contract accepts:

- `externalEuint64 amount`
- `externalEuint16 slippageBps`
- `externalEbool mevProtection`
- `bytes inputProof`

It verifies encrypted inputs with `FHE.fromExternal`, stores encrypted handles, grants access with
`FHE.allowThis` and `FHE.allow`, and computes:

```solidity
highSlippage = encryptedSlippageBps > 100;
largeIntent = encryptedAmount > 10_000;
riskFlag = highSlippage OR largeIntent;
```

The risk flag remains encrypted and can only be decrypted by authorized users.

`VeilConfidentialUSDC` is the actual confidential token-transfer layer. It extends OpenZeppelin
Confidential Contracts' ERC7984 ERC-20 wrapper:

- `wrap(to, amount)` pulls public Sepolia USDC into the wrapper and mints encrypted vcUSDC.
- `confidentialTransfer(to, encryptedAmount, inputProof)` moves an encrypted vcUSDC amount.
- `confidentialBalanceOf(account)` returns an encrypted balance handle that the wallet can
  user-decrypt.
- `unwrap(from, to, encryptedAmount, inputProof)` burns encrypted vcUSDC and creates an unwrap
  request.
- `finalizeUnwrap(...)` uses Zama public decryption output/proof for the unwrap request before
  public USDC is released.

## Setup

```sh
npm install
cp .env.example .env
```

Fill `.env`:

```txt
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
VITE_VEIL_INTENT_VAULT_ADDRESS=
VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS=
SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
VITE_WALLETCONNECT_PROJECT_ID=
MISTRAL_API_KEY=
MISTRAL_INTENT_MODEL=mistral-small-latest
```

`MISTRAL_API_KEY` is optional. If it is not set, Veil still works with its deterministic local intent
parser. When it is set, `/api/ai-intent` uses a server-side Mistral API call to turn natural language
into a strict Sepolia intent before the frontend encrypts values with Zama.

## Local Checks

```sh
npm run contracts:compile
npm run contracts:test
npm run build
npm run dev
```

The Hardhat test encrypts three inputs, submits them to `VeilIntentVault`, decrypts the permitted
amount, computes the private risk flag, and verifies the decrypted flag.

## Sepolia Deployment

Current deployed contract:

```txt
VeilIntentVault: 0x8F090e6E9c4783984be27D4f32ae601b9231A6f3
Network: Sepolia
```

Deploy:

```sh
npm run deploy:sepolia
npm run deploy:confidential-usdc
```

Then copy the deployed address into `.env`:

```txt
VITE_VEIL_INTENT_VAULT_ADDRESS=0x...
VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS=0x...
```

Restart the frontend:

```sh
npm run dev
```

Open `/console`, ask the AI command router for an action, and use the Sepolia contract panel to
connect a wallet, encrypt the intent parameters, and submit them to `VeilIntentVault`.

The confidential USDC panel needs `VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS`. Once set, it supports
approve + shield public Sepolia USDC into vcUSDC, encrypted vcUSDC transfer to another address,
wallet-signed balance reveal, unshield request creation, and finalize unshield back into public
USDC.
The initial USDC approval/shield and final public USDC release are public by design; the vcUSDC
balance and transfer amounts are FHE-protected.

## AI Intent Parsing

Veil includes a Mistral-powered intent decoder for natural-language commands. The server endpoint
`/api/ai-intent` accepts a command, asks the configured Mistral model for a strict JSON intent,
validates the result, and falls back to the local parser if the API key is missing or the request
fails.

The frontend surfaces the AI layer in the dashboard, console hero, command bar, parser card,
portfolio panel, and unsupported-command panel so the demo clearly shows that Veil understands and
routes user requests before wallet signing.

The AI parser is deliberately constrained:

- Network is Sepolia only.
- Supported tools are `intent`, `portfolio`, `confidential_token`, and `unsupported`.
- Supported intent actions are `swap`, `shield`, and `hide`.
- Swap demo route is intended for `ETH -> USDC`.
- Confidential token commands route to the vcUSDC wrapper panel, including balance reveal and
  unshield finalization.
- The wallet still requires user review and signature before any transaction.

The parsed fields flow into the existing Zama path: amount, slippage, and MEV preference are
encrypted before calling `VeilIntentVault`.

For `ETH -> USDC` intents, the result screen also shows a separate real settlement panel. It calls
Uniswap V3 `SwapRouter02` on Ethereum Sepolia with native testnet ETH, checks for a live WETH/USDC
pool through the Uniswap factory, and sends Circle Sepolia USDC to the connected wallet. This is a
second transaction after the encrypted intent transaction, so the demo is clear about which step is
private intent submission and which step is public DEX settlement.

Wallet connection uses RainbowKit. Set `VITE_WALLETCONNECT_PROJECT_ID` from WalletConnect Cloud for
full WalletConnect QR/mobile wallet support. Browser-injected wallets can still be used for local
demo testing.

## Submission Checklist

- Functioning dApp demo using Zama Protocol: contracts + Relayer SDK integration.
- Real-world FHE use case: private DeFi intent parameters, encrypted risk checks, and confidential token transfers.
- Smart contract implementation: `contracts/VeilIntentVault.sol` and `contracts/VeilConfidentialUSDC.sol`.
- Frontend implementation: `/console` uses `src/lib/veil-contract.ts` and `src/lib/confidential-usdc.ts`.
- Documentation: this README plus `docs/VIDEO_PITCH.md`.
- Deployment target: Sepolia testnet.
- Video: record a real-person 3-minute pitch. AI-generated voice/video should not be used.

## References

- Zama Solidity quick start: https://docs.zama.org/protocol/solidity-guides/getting-started/quick-start-tutorial
- Zama FHEVM examples: https://docs.zama.org/protocol/examples
- Sepolia confidential token registry: https://docs.zama.org/protocol/protocol-apps/addresses/testnet/sepolia
- OpenZeppelin Confidential Contracts: https://github.com/OpenZeppelin/openzeppelin-confidential-contracts
