import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { SepoliaSubmitResult } from "@/lib/veil-contract";
import { formatSlippage, type Intent } from "@/lib/veil-intent";

export function ConfidentialityViz({
  intent,
  result,
}: {
  intent: Intent;
  result?: SepoliaSubmitResult | null;
}) {
  const fields = [
    {
      k: "amount",
      value: `${intent.amount} ${intent.fromAsset}`,
      protectedValue: result?.encryptedHandles.amount,
      mode: "FHE handle",
    },
    {
      k: "slippage",
      value: formatSlippage(intent.slippageBps),
      protectedValue: result?.encryptedHandles.slippageBps,
      mode: "FHE handle",
    },
    {
      k: "mev",
      value: intent.mevProtected || intent.shielded ? "enabled" : "disabled",
      protectedValue: result?.encryptedHandles.mevProtection,
      mode: "FHE handle",
    },
    {
      k: "route",
      value: intent.toAsset ? `${intent.fromAsset}->${intent.toAsset}` : intent.fromAsset,
      protectedValue: result?.routeCommitment,
      mode: "commitment",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Confidentiality Layer
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#8B5CF6]">
          <Lock className="h-3 w-3" /> Zama FHE
        </span>
      </div>
      <div className="flex-1 divide-y divide-border">
        {fields.map((field, i) => (
          <Row key={field.k} {...field} delay={i * 0.05} />
        ))}
      </div>
      <div className="border-t border-border bg-[#0a0a0b] px-4 py-3 sm:px-5">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Before submission, Veil shows the privacy plan. After wallet signing, this panel uses the
          actual Zama handles and route commitment returned by the Sepolia transaction flow.
        </p>
      </div>
    </motion.div>
  );
}

function Row({
  k,
  value,
  protectedValue,
  mode,
  delay,
}: {
  k: string;
  value: string;
  protectedValue?: string;
  mode: string;
  delay: number;
}) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:grid-cols-[90px_minmax(0,1fr)] sm:px-5">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <div className="min-w-0 font-mono text-[12px]">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay }}
          className="truncate text-foreground"
        >
          {value}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.05 }}
          className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
        >
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[9px] uppercase">
            {mode}
          </span>
          <span className="min-w-0 flex-1 truncate text-[#8B5CF6]/90">
            {protectedValue ?? "created only during wallet submission"}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
