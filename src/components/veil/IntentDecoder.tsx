import { motion } from "framer-motion";
import { AlertCircle, BrainCircuit, Check, ShieldCheck } from "lucide-react";
import { formatSlippage } from "@/lib/veil-intent";
import type { IntentParserResult } from "@/lib/ai-intent";

export function IntentDecoder({ result }: { result: IntentParserResult }) {
  const { intent } = result;
  const route = intent.toAsset ? `${intent.fromAsset} -> ${intent.toAsset}` : intent.fromAsset;
  const sourceLabel = result.source === "ai" ? "AI parsed" : "Local parser";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-[#a78bfa]" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            AI intent decoder
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {result.source === "ai" ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <ShieldCheck className="h-3 w-3 text-[#a78bfa]" />
          )}
          {sourceLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 sm:px-5">
        <DecodedField label="Action" value={intent.action} />
        <DecodedField label="Route" value={route} />
        <DecodedField label="Amount" value={`${intent.amount} ${intent.fromAsset}`} />
        <DecodedField label="Slippage" value={formatSlippage(intent.slippageBps)} />
      </div>

      <div className="border-t border-border bg-[#0a0a0b] px-4 py-3 sm:px-5">
        <p className="text-[12px] leading-5 text-muted-foreground">{result.rationale}</p>
        {result.warnings.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {result.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-2 text-[12px] text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DecodedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}
