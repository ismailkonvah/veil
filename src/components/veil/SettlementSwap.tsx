import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Coins,
  ExternalLink,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import {
  canSettleWithUniswap,
  formatUsdc,
  settleEthToUsdcOnSepolia,
  watchSepoliaUsdc,
  type SettlementSwapResult,
} from "@/lib/uniswap-settlement";
import type { Intent } from "@/lib/veil-intent";

type Status = "idle" | "settling" | "settled" | "error";

export function SettlementSwap({ intent }: { intent: Intent }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SettlementSwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const supported = canSettleWithUniswap(intent);
  const onSepolia = chainId === sepolia.id;

  const settle = async () => {
    if (!isConnected) {
      setStatus("error");
      setError("Connect a wallet before settling the swap.");
      return;
    }

    if (!onSepolia) {
      setError(null);
      try {
        await switchChainAsync({ chainId: sepolia.id });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Wallet could not switch to Sepolia.");
      }
      return;
    }

    setStatus("settling");
    setError(null);
    setResult(null);

    try {
      const settled = await settleEthToUsdcOnSepolia(intent, walletClient);
      setResult(settled);
      setStatus("settled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to settle swap on Uniswap.");
      setStatus("error");
    }
  };

  const addUsdc = async () => {
    try {
      await watchSepoliaUsdc(walletClient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet could not add Sepolia USDC.");
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Real swap settlement
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Uniswap V3 / Sepolia
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-foreground">
            Receive Sepolia USDC in your wallet
          </div>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            This sends a separate Uniswap transaction using the public ETH amount from your command.
            The encrypted intent transaction remains your Zama privacy proof.
          </p>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {supported ? "ETH -> USDC supported" : "Only ETH -> USDC settlement is wired"}
          </div>
        </div>

        <Button
          type="button"
          onClick={settle}
          disabled={!supported || status === "settling" || isSwitching}
          className="h-9 w-full gap-2 bg-emerald-500 text-black hover:bg-emerald-400 sm:w-auto"
        >
          {status === "settling" || isSwitching ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {status === "settling"
            ? "Settling"
            : isSwitching
              ? "Switching"
              : !isConnected
                ? "Connect"
                : !onSepolia
                  ? "Switch"
                  : "Settle swap"}
        </Button>
      </div>

      {status === "settled" && result && (
        <div className="space-y-3 border-t border-border bg-[#0a0a0b] px-4 py-3 text-[12px] sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Swap settled
            </span>
            <span className="min-w-0 font-mono text-muted-foreground">
              received {formatUsdc(result.usdcReceived)} USDC
            </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[#a78bfa] hover:text-[#c4b5fd]"
            >
              View tx <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-2 font-mono text-[10px] text-muted-foreground sm:grid-cols-2">
            <span className="truncate">pool {result.poolAddress}</span>
            <span>fee tier {result.feeTier / 10000}%</span>
          </div>
          <button
            type="button"
            onClick={addUsdc}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated"
          >
            <Plus className="h-3 w-3" />
            Add USDC to wallet
          </button>
        </div>
      )}

      {status === "error" && error && (
        <div className="flex items-start gap-2 border-t border-border bg-[#0a0a0b] px-4 py-3 text-[12px] text-destructive sm:px-5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </motion.div>
  );
}
