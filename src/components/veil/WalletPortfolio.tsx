import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { AlertCircle, BrainCircuit, RefreshCw, Wallet, WalletCards } from "lucide-react";
import { formatUnits, zeroAddress, type Address } from "viem";
import { useAccount, useBalance, useReadContract, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import type { IntentParserResult } from "@/lib/ai-intent";
import { SEPOLIA_USDC } from "@/lib/uniswap-settlement";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function WalletPortfolio({ result }: { result: IntentParserResult }) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const onSepolia = chainId === sepolia.id;
  const enabled = Boolean(address) && onSepolia;

  const ethBalance = useBalance({
    address,
    chainId: sepolia.id,
    query: { enabled },
  });

  const usdcBalance = useReadContract({
    address: SEPOLIA_USDC as Address,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: [address ?? zeroAddress],
    chainId: sepolia.id,
    query: { enabled },
  });

  const refresh = () => {
    void ethBalance.refetch();
    void usdcBalance.refetch();
  };

  const switchToSepolia = () => {
    void switchChainAsync({ chainId: sepolia.id });
  };

  const eth = ethBalance.data?.formatted ?? "0";
  const usdc = typeof usdcBalance.data === "bigint" ? formatUnits(usdcBalance.data, 6) : "0";
  const loading = ethBalance.isLoading || usdcBalance.isLoading || ethBalance.isRefetching;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <WalletCards className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            AI wallet portfolio
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <BrainCircuit className="h-3 w-3 text-[#a78bfa]" />
          {result.source === "ai" ? (result.model ?? "Mistral") : "Local parser"}
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5">
        <div className="min-w-0">
          <div className="text-[18px] font-semibold tracking-tight text-foreground">
            Sepolia wallet snapshot
          </div>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            {result.rationale} Veil reads public Sepolia balances from your connected wallet; this
            data is not sent to the AI model.
          </p>
        </div>

        {isConnected && onSepolia && (
          <Button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="h-9 w-full gap-2 bg-surface text-foreground hover:bg-surface-elevated sm:w-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      {!isConnected ? (
        <ConnectState />
      ) : !onSepolia ? (
        <div className="border-t border-border bg-[#0a0a0b] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2 text-[12px] text-amber-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Switch to Sepolia to read this demo portfolio.</span>
            </div>
            <Button
              type="button"
              onClick={switchToSepolia}
              disabled={isSwitching}
              className="h-9 w-full gap-2 bg-[#8B5CF6] text-white hover:bg-[#7c4ef0] sm:w-auto"
            >
              {isSwitching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Switch to Sepolia
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <TokenBalance
            label="Sepolia ETH"
            symbol="ETH"
            value={eth}
            sub="Gas and swap input"
            loading={loading}
          />
          <TokenBalance
            label="Sepolia USDC"
            symbol="USDC"
            value={usdc}
            sub="Uniswap settlement output"
            loading={loading}
          />
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-1.5 border-t border-border bg-[#0a0a0b] px-4 py-3 sm:px-5">
          {result.warnings.map((warning) => (
            <div key={warning} className="flex items-start gap-2 text-[12px] text-amber-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ConnectState() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal, mounted }) => (
        <div className="border-t border-border bg-[#0a0a0b] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2 text-[12px] text-muted-foreground">
              <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a78bfa]" />
              <span>Connect a wallet so Veil can read Sepolia ETH and USDC balances.</span>
            </div>
            <Button
              type="button"
              onClick={openConnectModal}
              disabled={!mounted}
              className="h-9 w-full gap-2 bg-[#8B5CF6] text-white hover:bg-[#7c4ef0] sm:w-auto"
            >
              Connect wallet
            </Button>
          </div>
        </div>
      )}
    </ConnectButton.Custom>
  );
}

function TokenBalance({
  label,
  symbol,
  value,
  sub,
  loading,
}: {
  label: string;
  symbol: string;
  value: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 truncate text-[22px] font-semibold tracking-tight text-foreground">
            {loading ? "..." : trimBalance(value)} <span className="text-[13px]">{symbol}</span>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted-foreground">
          Public
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function trimBalance(value: string) {
  const [whole, decimal = ""] = value.split(".");
  if (!decimal) return whole;
  const trimmed = decimal.slice(0, 6).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}
