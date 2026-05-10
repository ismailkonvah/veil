import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, LockKeyhole, WalletCards, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { TopNav } from "@/components/veil/TopNav";
import { CommandInput } from "@/components/veil/CommandInput";
import { ConfidentialityViz } from "@/components/veil/ConfidentialityViz";
import { ResultCard } from "@/components/veil/ResultCard";
import { IdleStats } from "@/components/veil/IdleStats";
import { PrivacyAudit } from "@/components/veil/PrivacyAudit";
import { OnchainIntentSubmit } from "@/components/veil/OnchainIntentSubmit";
import { SettlementSwap } from "@/components/veil/SettlementSwap";
import { IntentDecoder } from "@/components/veil/IntentDecoder";
import { WalletPortfolio } from "@/components/veil/WalletPortfolio";
import { UnsupportedCommand } from "@/components/veil/UnsupportedCommand";
import { ConfidentialTokenPanel } from "@/components/veil/ConfidentialTokenPanel";
import type { SepoliaSubmitResult } from "@/lib/veil-contract";
import { type Intent } from "@/lib/veil-intent";
import { buildAudit, saveAudit, type AuditRecord } from "@/lib/veil-audit";
import { localIntentResult, requestAiIntent, type IntentParserResult } from "@/lib/ai-intent";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Veil - Confidential Intent Console" },
      {
        name: "description",
        content:
          "Execute confidential DeFi intents on Sepolia. Veil parses commands, encrypts sensitive parameters, and records privacy audits.",
      },
      { property: "og:title", content: "Veil - Confidential Intent Console" },
      {
        property: "og:description",
        content:
          "Private swaps, shielded balances, and MEV-protected execution powered by Zama FHE.",
      },
    ],
  }),
  component: Console,
});

type Phase = "idle" | "ready" | "portfolio" | "confidential_token" | "unsupported" | "done";
type ParsePhase = "idle" | "parsing" | "ready";

function Console() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [parsePhase, setParsePhase] = useState<ParsePhase>("idle");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [parserResult, setParserResult] = useState<IntentParserResult | null>(null);
  const [audit, setAudit] = useState<AuditRecord | null>(null);
  const [result, setResult] = useState<SepoliaSubmitResult | null>(null);

  const handleSubmit = async (raw: string) => {
    setParsePhase("parsing");
    setAudit(null);
    setResult(null);

    try {
      const parsed = await requestAiIntent(raw);
      setParserResult(parsed);

      if (parsed.tool === "portfolio") {
        setIntent(null);
        setPhase("portfolio");
        return;
      }

      if (parsed.tool === "confidential_token") {
        setIntent(null);
        setPhase("confidential_token");
        return;
      }

      if (parsed.tool === "unsupported") {
        setIntent(null);
        setPhase("unsupported");
        return;
      }

      setIntent(parsed.intent);
      setPhase("ready");
    } catch (error) {
      const fallback = localIntentResult(
        raw,
        "AI parser could not be reached, so Veil used the deterministic local parser.",
      );
      fallback.warnings.push(error instanceof Error ? error.message : "AI intent parser failed.");
      setParserResult(fallback);

      if (fallback.tool === "portfolio") {
        setIntent(null);
        setPhase("portfolio");
        return;
      }

      if (fallback.tool === "confidential_token") {
        setIntent(null);
        setPhase("confidential_token");
        return;
      }

      if (fallback.tool === "unsupported") {
        setIntent(null);
        setPhase("unsupported");
        return;
      }

      setIntent(fallback.intent);
      setPhase("ready");
    } finally {
      setParsePhase("ready");
    }
  };

  const handleOnchainSubmitted = (submission: SepoliaSubmitResult) => {
    if (!intent) return;
    const record = buildAudit(intent, submission);
    saveAudit(record);
    setResult(submission);
    setAudit(record);
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle");
    setIntent(null);
    setParserResult(null);
    setResult(null);
    setAudit(null);
    setParsePhase("idle");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-foreground">
      <div className="pointer-events-none absolute inset-0 veil-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] veil-glow" />

      <TopNav />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-20 pt-12 sm:px-5 sm:pb-24 sm:pt-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-8 max-w-3xl text-center sm:mb-10"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 font-mono text-[11px] tracking-wide text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5 text-[#a78bfa]" />
            AI ROUTER / POWERED BY MISTRAL + ZAMA FHE
          </div>
          <h1 className="text-balance text-[34px] font-semibold leading-[1.05] text-foreground sm:text-[54px]">
            Ask for DeFi, execute with{" "}
            <span className="bg-gradient-to-r from-[#c4b5fd] to-[#8B5CF6] bg-clip-text text-transparent">
              privacy.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-muted-foreground">
            Speak naturally. The AI router understands swaps, wallet checks, shielded vcUSDC
            actions, and unsupported requests before Zama encryption touches the sensitive fields.
          </p>
          <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
            <AiRoutePill icon={BrainCircuit} label="Intent" text="swap / MEV / privacy receipt" />
            <AiRoutePill icon={WalletCards} label="Portfolio" text="wallet balance check" />
            <AiRoutePill icon={LockKeyhole} label="Shield" text="vcUSDC confidential token" />
          </div>
        </motion.div>

        <div className="mx-auto max-w-3xl">
          <CommandInput
            onSubmit={handleSubmit}
            disabled={false}
            isParsing={parsePhase === "parsing"}
          />
        </div>

        <div className="mt-8 space-y-4 sm:mt-10">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <IdleStats />
              </motion.div>
            )}

            {phase === "ready" && intent && (
              <motion.div
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {parserResult && <IntentDecoder result={parserResult} />}
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                  <OnchainIntentSubmit intent={intent} onSubmitted={handleOnchainSubmitted} />
                  <ConfidentialityViz intent={intent} />
                </div>
              </motion.div>
            )}

            {phase === "portfolio" && parserResult && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WalletPortfolio result={parserResult} />
              </motion.div>
            )}

            {phase === "confidential_token" && (
              <motion.div
                key="confidential-token"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ConfidentialTokenPanel aiResult={parserResult ?? undefined} />
              </motion.div>
            )}

            {phase === "unsupported" && parserResult && (
              <motion.div
                key="unsupported"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <UnsupportedCommand result={parserResult} />
              </motion.div>
            )}

            {phase === "done" && intent && result && audit && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {parserResult && <IntentDecoder result={parserResult} />}
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                  <ResultCard intent={intent} result={result} onReset={reset} />
                  <ConfidentialityViz intent={intent} result={result} />
                </div>
                <SettlementSwap intent={intent} />
                <PrivacyAudit record={audit} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase !== "confidential_token" && (
          <div className="mt-4">
            <ConfidentialTokenPanel
              aiResult={parserResult?.tool === "confidential_token" ? parserResult : undefined}
            />
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}

function AiRoutePill({
  icon: Icon,
  label,
  text,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-[#0B0B0C]/80 px-3 py-2">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#a78bfa]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{text}</div>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-20 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-[11px] text-muted-foreground sm:flex-row">
      <div className="font-mono uppercase tracking-wider">veil / v0.1 / sepolia</div>
      <div className="flex items-center gap-4">
        <span className="font-mono">FHE relayer / wallet required</span>
        <span className="font-mono">sepolia / live tx required</span>
      </div>
    </div>
  );
}
