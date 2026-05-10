# Sepolia Deployment Notes

## Prerequisites

- Sepolia ETH for the deployer wallet.
- RPC URL for Sepolia.
- Wallet private key with deployment funds.
- `VITE_VEIL_INTENT_VAULT_ADDRESS` set after deployment.

## Commands

```sh
npm run contracts:compile
npm run contracts:test
npm run deploy:sepolia
```

## Post-Deploy

Current Sepolia deployment:

```txt
VeilIntentVault: 0x8F090e6E9c4783984be27D4f32ae601b9231A6f3
```

The deploy script writes:

```txt
src/lib/contracts/veil-intent-vault.json
```

Copy the deployed `address` into `.env`:

```txt
VITE_VEIL_INTENT_VAULT_ADDRESS=0x...
```

Restart the app:

```sh
npm run dev
```

Then test the live flow from `/console`.
