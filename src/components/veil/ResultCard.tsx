import { motion } from "framer-motion";
import { ArrowUpRight, Check, RotateCcw } from "lucide-react";
import type { SepoliaSubmitResult } from "@/lib/veil-contract";
import type { Intent } from "@/lib/veil-intent";

export function ResultCard({
  intent,
  result,
  onReset,
}: {
  intent: Intent;
  result: SepoliaSubmitResult;
  onReset: () => void;
}) {
  const summary =
    intent.action === "hide"
      ? "Encrypted exposure receipt"
      : intent.action === "shield"
        ? `Encrypted ${intent.fromAsset} privacy receipt`
        : `Submitted ${intent.fromAsset}${intent.toAsset ? ` -> ${intent.toAsset}` : ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span className="text-[13px] font-medium text-foreground">Submitted on Sepolia</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {result.blockNumber ? `block / ${result.blockNumber.toLocaleString()}` : "sepolia"}
        </span>
      </div>

      <div className="flex-1 px-4 py-5 sm:px-5">
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {intent.action}
        </div>
        <div className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
          {summary}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Encrypted amount" value={result.encryptedHandles.amount} mono />
          <Field
            label={intent.action === "swap" ? "Route protection" : "Asset custody"}
            value={
              intent.action === "swap"
                ? intent.mevProtected || intent.shielded
                  ? "MEV preference encrypted"
                  : "Private intent"
                : "Wallet balance unchanged"
            }
          />
          <Field label="Network" value="Sepolia" />
          <Field label="Status" value="Submitted" accent />
        </div>

        <div className="mt-5 rounded-lg border border-border bg-[#0a0a0b] px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Transaction hash
          </div>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-3">
            <span className="truncate font-mono text-[12px] text-foreground">{result.txHash}</span>
            <a
              href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-[12px] text-[#8B5CF6] hover:text-[#a78bfa]"
            >
              Etherscan <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> New command
        </button>
      </div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-[13px] ${mono ? "font-mono" : ""} ${accent ? "text-emerald-400" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}
