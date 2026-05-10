import { ethers } from "ethers";
import kmsWasmUrl from "tkms/kms_lib_bg.wasm?url";
import tfheWasmUrl from "tfhe/tfhe_bg.wasm?url";
import type { WalletClient } from "viem";
import type { Intent } from "./veil-intent";
import { walletClientToEip1193 } from "./wallet-provider";

export const VEIL_INTENT_VAULT_ADDRESS = import.meta.env.VITE_VEIL_INTENT_VAULT_ADDRESS as
  | string
  | undefined;

export const VEIL_INTENT_VAULT_ABI = [
  "function submitIntent(bytes32 action, bytes32 routeCommitment, bytes32 amount, bytes32 slippageBps, bytes32 mevProtection, bytes inputProof) external returns (uint256)",
  "function computeRiskSignal(uint256 intentId) external returns (bytes32)",
  "function intentCount() external view returns (uint256)",
  "event ConfidentialIntentSubmitted(uint256 indexed intentId, address indexed owner, bytes32 indexed action, bytes32 routeCommitment)",
] as const;

export type SepoliaSubmitResult = {
  txHash: string;
  intentId?: string;
  contractAddress: string;
  blockNumber?: number;
  encryptedHandles: {
    amount: string;
    slippageBps: string;
    mevProtection: string;
  };
  routeCommitment: string;
};

export function hasConfiguredVault() {
  return Boolean(VEIL_INTENT_VAULT_ADDRESS && ethers.isAddress(VEIL_INTENT_VAULT_ADDRESS));
}

export function toEncryptedAmountUnits(intent: Intent): bigint {
  const value = Number.parseFloat(intent.amount);
  const safeValue = Number.isFinite(value) && value > 0 ? value : 1;
  const scale = intent.fromAsset === "ETH" || intent.fromAsset === "WBTC" ? 10_000 : 100;
  return BigInt(Math.round(safeValue * scale));
}

export async function submitIntentToSepolia(
  intent: Intent,
  walletClient?: WalletClient | null,
): Promise<SepoliaSubmitResult> {
  if (!hasConfiguredVault() || !VEIL_INTENT_VAULT_ADDRESS) {
    throw new Error("Set VITE_VEIL_INTENT_VAULT_ADDRESS in .env after deploying VeilIntentVault.");
  }

  if (!walletClient) {
    throw new Error("Connect a wallet with RainbowKit before submitting.");
  }

  const eip1193Provider = walletClientToEip1193(walletClient);
  const provider = new ethers.BrowserProvider(eip1193Provider, {
    chainId: walletClient.chain?.id ?? 11155111,
    name: walletClient.chain?.name ?? "Sepolia",
  });

  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error("Switch wallet to Sepolia before submitting this intent.");
  }

  const signer = walletClient.account?.address
    ? await provider.getSigner(walletClient.account.address)
    : await provider.getSigner();
  const userAddress = await signer.getAddress();
  const contract = new ethers.Contract(VEIL_INTENT_VAULT_ADDRESS, VEIL_INTENT_VAULT_ABI, signer);

  const { createInstance, initSDK, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  await initSDK({
    tfheParams: tfheWasmUrl,
    kmsParams: kmsWasmUrl,
  });
  const instance = await createInstance({
    ...SepoliaConfig,
    network: eip1193Provider,
  });

  const encryptedInput = instance.createEncryptedInput(VEIL_INTENT_VAULT_ADDRESS, userAddress);
  encryptedInput.add64(toEncryptedAmountUnits(intent));
  encryptedInput.add16(intent.slippageBps);
  encryptedInput.addBool(intent.mevProtected || intent.shielded);

  const zkProof = encryptedInput.generateZKProof();
  const { handles, inputProof } = await instance.requestZKProofVerification(zkProof);

  const action = ethers.encodeBytes32String(intent.action);
  const route = intent.toAsset ? `${intent.fromAsset}->${intent.toAsset}` : intent.fromAsset;
  const routeCommitment = ethers.keccak256(ethers.toUtf8Bytes(`${intent.raw}:${route}`));
  const amountHandle = ethers.hexlify(handles[0]);
  const slippageHandle = ethers.hexlify(handles[1]);
  const mevProtectionHandle = ethers.hexlify(handles[2]);

  const tx = await contract.submitIntent(
    action,
    routeCommitment,
    amountHandle,
    slippageHandle,
    mevProtectionHandle,
    ethers.hexlify(inputProof),
  );
  const receipt = await tx.wait();

  const submitted = receipt?.logs
    ?.map((log: unknown) => {
      try {
        return contract.interface.parseLog(log as { topics: string[]; data: string });
      } catch {
        return null;
      }
    })
    .find((event: { name?: string } | null) => event?.name === "ConfidentialIntentSubmitted");

  return {
    txHash: tx.hash,
    intentId: submitted?.args?.intentId?.toString(),
    contractAddress: VEIL_INTENT_VAULT_ADDRESS,
    blockNumber: receipt?.blockNumber,
    encryptedHandles: {
      amount: amountHandle,
      slippageBps: slippageHandle,
      mevProtection: mevProtectionHandle,
    },
    routeCommitment,
  };
}
