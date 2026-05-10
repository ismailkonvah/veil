import { ethers } from "ethers";
import kmsWasmUrl from "tkms/kms_lib_bg.wasm?url";
import tfheWasmUrl from "tfhe/tfhe_bg.wasm?url";
import type { WalletClient } from "viem";
import { walletClientToEip1193 } from "./wallet-provider";
import { SEPOLIA_USDC } from "./uniswap-settlement";

export const VEIL_CONFIDENTIAL_USDC_ADDRESS = import.meta.env
  .VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS as string | undefined;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
] as const;

export const VEIL_CONFIDENTIAL_USDC_ABI = [
  "function wrap(address to, uint256 amount) external returns (bytes32)",
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) external returns (bytes32)",
  "function unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof) external returns (bytes32)",
  "function finalizeUnwrap(bytes32 unwrapRequestId, uint64 unwrapAmountCleartext, bytes decryptionProof) external",
  "function confidentialBalanceOf(address account) external view returns (bytes32)",
  "function unwrapRequester(bytes32 unwrapRequestId) external view returns (address)",
  "function underlying() external view returns (address)",
  "event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)",
  "event UnwrapRequested(address indexed receiver, bytes32 indexed unwrapRequestId, bytes32 amount)",
] as const;

export type ConfidentialTokenTx = {
  txHash: string;
  blockNumber?: number;
  encryptedHandle?: string;
  unwrapRequestId?: string;
  cleartextAmount?: string;
};

export function hasConfiguredConfidentialUsdc() {
  return Boolean(
    VEIL_CONFIDENTIAL_USDC_ADDRESS && ethers.isAddress(VEIL_CONFIDENTIAL_USDC_ADDRESS),
  );
}

export function parseUsdcUnits(amount: string) {
  return ethers.parseUnits(amount || "0", 6);
}

export async function approveAndWrapUsdc(
  amount: string,
  walletClient?: WalletClient | null,
): Promise<ConfidentialTokenTx> {
  const { signer, account, wrapperAddress } = await getSigner(walletClient);
  const units = parseUsdcUnits(amount);
  if (units <= 0n) throw new Error("Enter a USDC amount greater than zero.");

  const usdc = new ethers.Contract(SEPOLIA_USDC, ERC20_ABI, signer);
  const approveTx = await usdc.approve(wrapperAddress, units);
  await approveTx.wait();

  const wrapper = new ethers.Contract(wrapperAddress, VEIL_CONFIDENTIAL_USDC_ABI, signer);
  const wrapTx = await wrapper.wrap(account, units);
  const receipt = await wrapTx.wait();

  return { txHash: wrapTx.hash, blockNumber: receipt?.blockNumber };
}

export async function confidentialTransferUsdc(
  to: string,
  amount: string,
  walletClient?: WalletClient | null,
): Promise<ConfidentialTokenTx> {
  if (!ethers.isAddress(to)) throw new Error("Enter a valid recipient address.");

  const { signer, account, eip1193Provider, wrapperAddress } = await getSigner(walletClient);
  const amountHandle = await encryptUsdcAmount(wrapperAddress, account, amount, eip1193Provider);
  const wrapper = new ethers.Contract(wrapperAddress, VEIL_CONFIDENTIAL_USDC_ABI, signer);
  const tx = await wrapper["confidentialTransfer(address,bytes32,bytes)"](
    to,
    amountHandle.handle,
    amountHandle.inputProof,
  );
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    encryptedHandle: amountHandle.handle,
  };
}

export async function requestUnwrapUsdc(
  amount: string,
  walletClient?: WalletClient | null,
): Promise<ConfidentialTokenTx> {
  const { signer, account, eip1193Provider, wrapperAddress } = await getSigner(walletClient);
  const amountHandle = await encryptUsdcAmount(wrapperAddress, account, amount, eip1193Provider);
  const wrapper = new ethers.Contract(wrapperAddress, VEIL_CONFIDENTIAL_USDC_ABI, signer);
  const tx = await wrapper["unwrap(address,address,bytes32,bytes)"](
    account,
    account,
    amountHandle.handle,
    amountHandle.inputProof,
  );
  const receipt = await tx.wait();

  const event = receipt?.logs
    ?.map((log: unknown) => {
      try {
        return wrapper.interface.parseLog(log as { topics: string[]; data: string });
      } catch {
        return null;
      }
    })
    .find((parsed: { name?: string } | null) => parsed?.name === "UnwrapRequested");

  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    encryptedHandle: amountHandle.handle,
    unwrapRequestId: event?.args?.unwrapRequestId,
  };
}

export async function finalizeUnwrapUsdc(
  unwrapRequestId: string,
  walletClient?: WalletClient | null,
): Promise<ConfidentialTokenTx> {
  if (!ethers.isHexString(unwrapRequestId, 32)) {
    throw new Error("Enter a valid unwrap request id.");
  }

  const { signer, eip1193Provider, wrapperAddress } = await getSigner(walletClient);
  const instance = await createZamaInstance(eip1193Provider);
  const decrypted = await instance.publicDecrypt([unwrapRequestId], { timeout: 120_000 });
  const clearValue = readClearValue(decrypted.clearValues, unwrapRequestId);

  const wrapper = new ethers.Contract(wrapperAddress, VEIL_CONFIDENTIAL_USDC_ABI, signer);
  const tx = await wrapper.finalizeUnwrap(unwrapRequestId, clearValue, decrypted.decryptionProof);
  const receipt = await tx.wait();

  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    unwrapRequestId,
    cleartextAmount: ethers.formatUnits(clearValue, 6),
  };
}

export async function decryptConfidentialUsdcBalance(
  walletClient?: WalletClient | null,
): Promise<{ handle: string; formatted: string }> {
  const { signer, account, eip1193Provider, wrapperAddress } = await getSigner(walletClient);
  const wrapper = new ethers.Contract(wrapperAddress, VEIL_CONFIDENTIAL_USDC_ABI, signer);
  const handle = (await wrapper.confidentialBalanceOf(account)) as string;

  if (!ethers.isHexString(handle, 32) || BigInt(handle) === 0n) {
    return { handle, formatted: "0" };
  }

  const instance = await createZamaInstance(eip1193Provider);
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [wrapperAddress],
    startTimestamp,
    durationDays,
  );

  const signature = await walletClient?.signTypedData?.({
    account: account as `0x${string}`,
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
  });

  if (!signature) throw new Error("Wallet could not sign the balance decrypt request.");

  const clearValues = await instance.userDecrypt(
    [{ handle, contractAddress: wrapperAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace(/^0x/, ""),
    [wrapperAddress],
    account,
    startTimestamp,
    durationDays,
    { timeout: 120_000 },
  );

  const clearValue = readClearValue(clearValues, handle);
  return {
    handle,
    formatted: ethers.formatUnits(clearValue, 6),
  };
}

async function encryptUsdcAmount(
  contractAddress: string,
  userAddress: string,
  amount: string,
  eip1193Provider: ethers.Eip1193Provider,
) {
  const units = parseUsdcUnits(amount);
  if (units <= 0n) throw new Error("Enter a USDC amount greater than zero.");

  const instance = await createZamaInstance(eip1193Provider);
  const encryptedInput = instance.createEncryptedInput(contractAddress, userAddress);
  encryptedInput.add64(units);
  const zkProof = encryptedInput.generateZKProof();
  const { handles, inputProof } = await instance.requestZKProofVerification(zkProof);

  return {
    handle: ethers.hexlify(handles[0]),
    inputProof: ethers.hexlify(inputProof),
  };
}

async function createZamaInstance(eip1193Provider: ethers.Eip1193Provider) {
  const { createInstance, initSDK, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  await initSDK({
    tfheParams: tfheWasmUrl,
    kmsParams: kmsWasmUrl,
  });

  return createInstance({
    ...SepoliaConfig,
    network: eip1193Provider,
  });
}

function readClearValue(values: Record<string, unknown>, handle: string) {
  const value = values[handle] ?? values[handle.toLowerCase()] ?? values[handle.toUpperCase()];
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(value);
  if (typeof value === "string" && value) return BigInt(value);
  throw new Error("Zama decryption did not return a clear value for this handle.");
}

async function getSigner(walletClient?: WalletClient | null) {
  if (!hasConfiguredConfidentialUsdc() || !VEIL_CONFIDENTIAL_USDC_ADDRESS) {
    throw new Error(
      "Set VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS after deploying VeilConfidentialUSDC.",
    );
  }

  if (!walletClient) throw new Error("Connect a wallet first.");

  const eip1193Provider = walletClientToEip1193(walletClient);
  const provider = new ethers.BrowserProvider(eip1193Provider, {
    chainId: walletClient.chain?.id ?? 11155111,
    name: walletClient.chain?.name ?? "Sepolia",
  });

  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error("Switch wallet to Sepolia first.");
  }

  const signer = walletClient.account?.address
    ? await provider.getSigner(walletClient.account.address)
    : await provider.getSigner();
  const account = await signer.getAddress();

  return {
    signer,
    account,
    eip1193Provider,
    wrapperAddress: VEIL_CONFIDENTIAL_USDC_ADDRESS,
  };
}
