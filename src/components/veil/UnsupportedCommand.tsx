import { motion } from "framer-motion";
import { AlertCircle, BrainCircuit, Shield, WalletCards, Zap } from "lucide-react";
import type { IntentParserResult } from "@/lib/ai-intent";

const SUPPORTED = [
  {
    title: "Confidential swap",
    body: "ETH -> USDC on Sepolia with encrypted amount, slippage, and MEV preference.",
    icon: Zap,
  },
  {
    title: "Wallet portfolio",
    body: "Sepolia ETH and USDC balances from the connected wallet.",
    icon: WalletCards,
  },
  {
    title: "Privacy intent",
    body: "Record shield/hide exposure metadata as a Zama FHE privacy receipt.",
    icon: Shield,
  },
];

export function UnsupportedCommand({ result }: { result: IntentParserResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            AI command router
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
          Not supported yet
        </span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <div className="max-w-2xl text-[20px] font-semibold tracking-tight text-foreground">
          Veil understands the request, but this feature is not wired into the demo.
        </div>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted-foreground">
          {result.rationale}
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SUPPORTED.map((item) => (
          <div key={item.title} className="min-w-0 px-4 py-4 sm:px-5">
            <item.icon className="h-4 w-4 text-[#a78bfa]" />
            <div className="mt-3 text-[13px] font-medium text-foreground">{item.title}</div>
            <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{item.body}</div>
          </div>
        ))}
      </div>

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
