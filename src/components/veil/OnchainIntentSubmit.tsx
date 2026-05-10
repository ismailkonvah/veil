import { motion } from "framer-motion";
import { AlertCircle, Check, ExternalLink, Lock, Send } from "lucide-react";
import { useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import type { Intent } from "@/lib/veil-intent";
import {
  hasConfiguredVault,
  submitIntentToSepolia,
  VEIL_INTENT_VAULT_ADDRESS,
  type SepoliaSubmitResult,
} from "@/lib/veil-contract";

type Status = "idle" | "encrypting" | "submitted" | "error";

export function OnchainIntentSubmit({
  intent,
  onSubmitted,
}: {
  intent: Intent;
  onSubmitted?: (result: SepoliaSubmitResult) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<SepoliaSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const configured = hasConfiguredVault();
  const onSepolia = chainId === sepolia.id;
  const isPrivacyReceipt = intent.action === "shield" || intent.action === "hide";

  const submit = async () => {
    if (!isConnected) {
      setError("Connect a wallet with RainbowKit first.");
      setStatus("error");
      return;
    }

    if (!onSepolia) {
      setError(null);
      setStatus("idle");
      await switchChainAsync({ chainId: sepolia.id });
      return;
    }

    setStatus("encrypting");
    setError(null);
    setResult(null);
    try {
      const submitted = await submitIntentToSepolia(intent, walletClient);
      setResult(submitted);
      onSubmitted?.(submitted);
      setStatus("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit encrypted intent.");
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Sepolia contract
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Zama FHEVM
        </span>
      </div>

      <div className="grid flex-1 gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
        <div className="min-w-0">
          <div className="text-[14px] font-medium text-foreground">
            Submit this intent as encrypted calldata
          </div>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            {isPrivacyReceipt
              ? "This records encrypted privacy metadata in VeilIntentVault. It does not transfer, lock, or hide wallet tokens."
              : "Amount, slippage, and MEV preference are encrypted with the Zama Relayer SDK before calling VeilIntentVault on Sepolia."}
          </p>
          <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
            {configured
              ? VEIL_INTENT_VAULT_ADDRESS
              : "Set VITE_VEIL_INTENT_VAULT_ADDRESS to enable live submits"}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {isConnected && address
              ? `${address.slice(0, 6)}...${address.slice(-4)} / ${
                  onSepolia ? "sepolia ready" : "switch to sepolia"
                }`
              : "connect wallet to submit on-chain"}
          </div>
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={!configured || status === "encrypting" || isSwitching}
          className="h-9 w-full gap-2 bg-[#8B5CF6] text-white hover:bg-[#7c4ef0] sm:w-auto"
        >
          <Send className="h-3.5 w-3.5" />
          {status === "encrypting"
            ? "Encrypting"
            : isSwitching
              ? "Switching"
              : !isConnected
                ? "Connect"
                : !onSepolia
                  ? "Switch"
                  : "Submit"}
        </Button>
      </div>

      {status === "submitted" && result && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-[#0a0a0b] px-5 py-3 text-[12px]">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Submitted
          </span>
          {result.intentId && (
            <span className="font-mono text-muted-foreground">intent #{result.intentId}</span>
          )}
          <a
            href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#a78bfa] hover:text-[#c4b5fd]"
          >
            View tx <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {status === "error" && error && (
        <div className="flex items-start gap-2 border-t border-border bg-[#0a0a0b] px-5 py-3 text-[12px] text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </motion.div>
  );
}
