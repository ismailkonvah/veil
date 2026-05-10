import { ethers } from "ethers";
import type { WalletClient } from "viem";
import type { Intent } from "./veil-intent";
import { walletClientToEip1193 } from "./wallet-provider";

export const SEPOLIA_UNISWAP_FACTORY = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
export const SEPOLIA_SWAP_ROUTER_02 = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
export const SEPOLIA_WETH = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
export const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const FEE_TIERS = [500, 3000, 10000] as const;

const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)",
] as const;

const POOL_ABI = ["function liquidity() view returns (uint128)"] as const;

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
] as const;

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
] as const;

export type SettlementSwapResult = {
  txHash: string;
  blockNumber?: number;
  amountInWei: string;
  usdcBefore: string;
  usdcAfter: string;
  usdcReceived: string;
  feeTier: number;
  poolAddress: string;
};

export function canSettleWithUniswap(intent: Intent) {
  return intent.action === "swap" && intent.fromAsset === "ETH" && intent.toAsset === "USDC";
}

export async function settleEthToUsdcOnSepolia(
  intent: Intent,
  walletClient?: WalletClient | null,
): Promise<SettlementSwapResult> {
  if (!walletClient) {
    throw new Error("Connect a wallet before settling the swap.");
  }

  if (!canSettleWithUniswap(intent)) {
    throw new Error("This settlement path currently supports ETH -> USDC swaps on Sepolia.");
  }

  const eip1193Provider = walletClientToEip1193(walletClient);
  const provider = new ethers.BrowserProvider(eip1193Provider, {
    chainId: walletClient.chain?.id ?? 11155111,
    name: walletClient.chain?.name ?? "Sepolia",
  });

  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error("Switch wallet to Sepolia before settling the swap.");
  }

  const signer = walletClient.account?.address
    ? await provider.getSigner(walletClient.account.address)
    : await provider.getSigner();
  const recipient = await signer.getAddress();
  const amountInWei = ethers.parseEther(intent.amount);

  if (amountInWei <= 0n) {
    throw new Error("Enter an ETH amount greater than zero.");
  }

  const pool = await findEthUsdcPool(provider);
  const usdc = new ethers.Contract(SEPOLIA_USDC, ERC20_ABI, provider);
  const usdcBefore = await usdc.balanceOf(recipient);
  const router = new ethers.Contract(SEPOLIA_SWAP_ROUTER_02, ROUTER_ABI, signer);

  const tx = await router.exactInputSingle(
    {
      tokenIn: SEPOLIA_WETH,
      tokenOut: SEPOLIA_USDC,
      fee: pool.feeTier,
      recipient,
      amountIn: amountInWei,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    },
    { value: amountInWei },
  );

  const receipt = await tx.wait();
  const usdcAfter = await usdc.balanceOf(recipient);

  return {
    txHash: tx.hash,
    blockNumber: receipt?.blockNumber,
    amountInWei: amountInWei.toString(),
    usdcBefore: usdcBefore.toString(),
    usdcAfter: usdcAfter.toString(),
    usdcReceived: (usdcAfter - usdcBefore).toString(),
    feeTier: pool.feeTier,
    poolAddress: pool.poolAddress,
  };
}

export async function watchSepoliaUsdc(walletClient?: WalletClient | null) {
  if (!walletClient) return false;

  return Boolean(
    await walletClient.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: SEPOLIA_USDC,
          symbol: "USDC",
          decimals: 6,
        },
      },
    }),
  );
}

export function formatUsdc(rawUnits: string | bigint) {
  return ethers.formatUnits(rawUnits, 6);
}

async function findEthUsdcPool(provider: ethers.Provider) {
  const factory = new ethers.Contract(SEPOLIA_UNISWAP_FACTORY, FACTORY_ABI, provider);

  for (const feeTier of FEE_TIERS) {
    const poolAddress = await factory.getPool(SEPOLIA_WETH, SEPOLIA_USDC, feeTier);
    if (poolAddress === ethers.ZeroAddress) continue;

    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
    const liquidity = await pool.liquidity();
    if (liquidity > 0n) {
      return { feeTier, poolAddress };
    }
  }

  throw new Error(
    "No liquid WETH/USDC Uniswap V3 pool was found on Ethereum Sepolia. Try a smaller amount later or fund a Sepolia pool first.",
  );
}
