import { motion } from "framer-motion";

const ITEMS = [
  { k: "Network", v: "Sepolia", sub: "wallet required" },
  { k: "Contract", v: "VeilIntentVault", sub: "deployed" },
  { k: "Privacy", v: "Zama FHE", sub: "real handles" },
];

export function IdleStats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-[#0B0B0C] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      {ITEMS.map((it) => (
        <div key={it.k} className="px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {it.k}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-tight text-foreground">{it.v}</span>
            <span className="text-[11px] text-[#8B5CF6]">{it.sub}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
