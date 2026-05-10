import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  EyeOff,
  FileCheck2,
  Lock,
  Network,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { TopNav } from "@/components/veil/TopNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Veil - Project Dashboard" },
      {
        name: "description",
        content:
          "Veil is a confidential DeFi intent layer that turns natural-language commands into private, auditable execution on Sepolia.",
      },
      { property: "og:title", content: "Veil - Project Dashboard" },
      {
        property: "og:description",
        content:
          "Project overview for Veil: confidential DeFi intents, encrypted execution, and privacy audits.",
      },
    ],
  }),
  component: ProjectDashboard,
});

const STATS = [
  { label: "Network", value: "Sepolia", detail: "testnet settlement" },
  { label: "Privacy layer", value: "Zama FHEVM", detail: "encrypted parameters" },
  { label: "AI router", value: "Mistral", detail: "natural-language commands" },
  { label: "Audit mode", value: "Local proofs", detail: "downloadable records" },
];

const CAPABILITIES = [
  {
    icon: <BrainCircuit className="h-4 w-4" />,
    title: "AI command router",
    text: "Mistral classifies natural-language requests into intent execution, portfolio checks, confidential token actions, or unsupported features.",
  },
  {
    icon: <Lock className="h-4 w-4" />,
    title: "Encrypted contract state",
    text: "Amounts, slippage, and MEV preferences are submitted as FHE handles and stored privately on Sepolia.",
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Privacy audit trail",
    text: "Every saved receipt is created from a real Sepolia submission, including the tx hash, FHE handles, and route commitment.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "MEV-aware routing",
    text: "Veil encrypts the MEV preference before calling the vault, so sensitive execution choices are not exposed as plaintext.",
  },
];

const FLOW = [
  "Ask the AI command router",
  "Parse natural-language intent",
  "Classify public and private fields",
  "Encrypt sensitive execution data",
  "Submit confidential Sepolia transaction",
];

function ProjectDashboard() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-foreground">
      <div className="pointer-events-none absolute inset-0 veil-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] veil-glow" />

      <TopNav />

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-10">
        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <BrainCircuit className="h-3.5 w-3.5 text-[#a78bfa]" />
              AI + FHE prototype online
            </div>
            <h1 className="max-w-4xl text-balance text-[42px] font-semibold leading-[1.02] text-foreground sm:text-[64px]">
              Veil is an AI command layer for private DeFi intents.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-7 text-muted-foreground">
              A Mistral-powered router understands natural-language financial instructions, chooses
              the right Veil tool, then Zama FHEVM seals sensitive fields before Sepolia execution.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/console"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#8B5CF6] px-4 text-[13px] font-medium text-white shadow-[0_16px_40px_-18px_rgba(139,92,246,0.9)] transition-colors hover:bg-[#7c4ef0]"
              >
                Open console <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated"
              >
                View audits <FileCheck2 className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Project snapshot
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#a78bfa]">
                <Activity className="h-3 w-3" /> active
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              {STATS.map((stat) => (
                <div key={stat.label} className="px-5 py-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-[20px] font-semibold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{stat.detail}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mt-8 rounded-xl border border-[#8B5CF6]/30 bg-[#120f1f] p-5 shadow-[0_24px_80px_-52px_rgba(139,92,246,0.85)]">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#c4b5fd]">
                <Sparkles className="h-3.5 w-3.5" />
                Mistral AI intent layer
              </div>
              <h2 className="text-[24px] font-semibold tracking-tight text-foreground">
                Type what you want. Veil decides which private action applies.
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <AiExample command="shield 5 USDC" result="confidential token" />
              <AiExample command="show my portfolio" result="wallet balances" />
              <AiExample command="bridge to Base" result="unsupported" />
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CAPABILITIES.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + index * 0.04 }}
              className="rounded-xl border border-border bg-[#0B0B0C] p-5"
            >
              <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#a78bfa]">
                {item.icon}
              </div>
              <h2 className="text-[15px] font-semibold text-foreground">{item.title}</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{item.text}</p>
            </motion.article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl border border-border bg-[#0B0B0C] p-5">
            <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <Network className="h-3.5 w-3.5" />
              Execution flow
            </div>
            <div className="space-y-3">
              {FLOW.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface font-mono text-[11px] text-[#a78bfa]">
                    {index + 1}
                  </div>
                  <div className="text-[13px] text-foreground">{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-[#0B0B0C] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" />
                Privacy model
              </div>
              <span className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Zama Protocol
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <PrivacyTile label="Encrypted" value="amount, slippage, MEV preference" />
              <PrivacyTile label="Public" value="action type, route commitment, timestamp" />
              <PrivacyTile
                label="Output"
                value="Sepolia tx, encrypted risk flag, privacy receipt"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AiExample({ command, result }: { command: string; result: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        User says
      </div>
      <div className="mt-1 text-[13px] font-medium text-foreground">{command}</div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[#a78bfa]">
        AI routes to
      </div>
      <div className="mt-1 text-[12px] text-muted-foreground">{result}</div>
    </div>
  );
}

function PrivacyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-[#0a0a0b] p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-[13px] leading-5 text-foreground">{value}</div>
    </div>
  );
}
