import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  Check,
  Eye,
  Lock,
  RefreshCw,
  Unlock,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import {
  approveAndWrapUsdc,
  confidentialTransferUsdc,
  decryptConfidentialUsdcBalance,
  finalizeUnwrapUsdc,
  hasConfiguredConfidentialUsdc,
  requestUnwrapUsdc,
  VEIL_CONFIDENTIAL_USDC_ADDRESS,
  type ConfidentialTokenTx,
} from "@/lib/confidential-usdc";
import type { IntentParserResult } from "@/lib/ai-intent";

type Action = "shield" | "transfer" | "unshield" | "finalize" | "decrypt";

export function ConfidentialTokenPanel({ aiResult }: { aiResult?: IntentParserResult }) {
  const aiAction = inferAiTokenAction(aiResult);
  const aiAmount = aiResult?.intent.amount;
  const [amount, setAmount] = useState(aiAmount && aiAmount !== "0.01" ? aiAmount : "1");
  const [recipient, setRecipient] = useState("");
  const [unwrapRequestId, setUnwrapRequestId] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [result, setResult] = useState<ConfidentialTokenTx | null>(null);
  const [balance, setBalance] = useState<{ handle: string; formatted: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const configured = hasConfiguredConfidentialUsdc();
  const onSepolia = chainId === sepolia.id;
  const busy = action !== null || isSwitching;

  useEffect(() => {
    if (aiAmount && Number.parseFloat(aiAmount) > 0) {
      setAmount(aiAmount);
    }
  }, [aiAmount]);

  const prepareWallet = async () => {
    setError(null);

    if (!isConnected) {
      setError("Connect a wallet first.");
      return false;
    }

    if (!onSepolia) {
      try {
        await switchChainAsync({ chainId: sepolia.id });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wallet could not switch to Sepolia.");
      }
      return false;
    }

    return true;
  };

  const run = async (nextAction: Exclude<Action, "unshield" | "finalize" | "decrypt">) => {
    setResult(null);
    if (!(await prepareWallet())) return;

    setAction(nextAction);
    try {
      const tx =
        nextAction === "shield"
          ? await approveAndWrapUsdc(amount, walletClient)
          : await confidentialTransferUsdc(recipient, amount, walletClient);
      setResult(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confidential token action failed.");
    } finally {
      setAction(null);
    }
  };

  const unshieldUsdc = async () => {
    setResult(null);
    if (!(await prepareWallet())) return;

    setAction("unshield");
    try {
      const requested = await requestUnwrapUsdc(amount, walletClient);
      if (!requested.unwrapRequestId) {
        throw new Error("The unshield request did not return a request id.");
      }

      setUnwrapRequestId(requested.unwrapRequestId);
      setResult(requested);

      const finalized = await finalizeUnwrapUsdc(requested.unwrapRequestId, walletClient);
      setResult({
        ...finalized,
        encryptedHandle: requested.encryptedHandle,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unshield USDC.");
    } finally {
      setAction(null);
    }
  };

  const revealBalance = async () => {
    setBalance(null);
    if (!(await prepareWallet())) return;

    setAction("decrypt");
    try {
      setBalance(await decryptConfidentialUsdcBalance(walletClient));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decrypt confidential balance.");
    } finally {
      setAction(null);
    }
  };

  const finalizeUnshield = async () => {
    setResult(null);
    if (!(await prepareWallet())) return;

    setAction("finalize");
    try {
      setResult(await finalizeUnwrapUsdc(unwrapRequestId.trim(), walletClient));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finalize unshield.");
    } finally {
      setAction(null);
    }
  };

  const runAiAction = async () => {
    if (!aiAction) return;
    if (aiAction === "shield") return run("shield");
    if (aiAction === "transfer") return run("transfer");
    if (aiAction === "decrypt") return revealBalance();
    return unshieldUsdc();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Confidential USDC transfer
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          AI-ready / ERC7984
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start sm:px-5">
        <div className="min-w-0">
          <div className="text-[18px] font-semibold tracking-tight text-foreground">
            Shield, transfer, reveal, and unshield vcUSDC
          </div>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-muted-foreground">
            This is the actual confidential-token path: shield public Sepolia USDC into vcUSDC,
            transfer encrypted amounts, decrypt your private balance with your wallet, then request
            and finalize unshield back to public USDC in one action.
          </p>
          <div className="mt-3 truncate font-mono text-[10px] text-muted-foreground">
            {configured
              ? VEIL_CONFIDENTIAL_USDC_ADDRESS
              : "Deploy VeilConfidentialUSDC and set VITE_VEIL_CONFIDENTIAL_USDC_ADDRESS"}
          </div>
        </div>

        <div className="grid gap-3">
          {aiResult && aiAction && (
            <div className="rounded-lg border border-[#8B5CF6]/30 bg-[#120f1f] p-3">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#c4b5fd]">
                <BrainCircuit className="h-3.5 w-3.5" />
                AI selected {describeAction(aiAction)}
              </div>
              <div className="mt-2 text-[12px] leading-5 text-muted-foreground">
                "{aiResult.intent.raw}" {"->"} {describeAction(aiAction)}
                {aiAction !== "decrypt" ? ` ${amount} USDC` : ""}
              </div>
              <Button
                type="button"
                onClick={runAiAction}
                disabled={!configured || busy}
                className="mt-3 h-9 w-full gap-2 bg-[#8B5CF6] text-white hover:bg-[#7c4ef0]"
              >
                {busy ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BrainCircuit className="h-3.5 w-3.5" />
                )}
                {action ? "Running AI action" : `Run AI ${describeAction(aiAction)}`}
              </Button>
            </div>
          )}

          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Amount
            </span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-md border border-border bg-[#050505] px-3 text-[13px] text-foreground outline-none transition-colors focus:border-[#8B5CF6]/60"
              inputMode="decimal"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Recipient for encrypted transfer
            </span>
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x..."
              className="h-10 rounded-md border border-border bg-[#050505] px-3 font-mono text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#8B5CF6]/60"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <TokenButton
              label={action === "shield" ? "Shielding" : "Shield USDC"}
              icon={action === "shield" ? RefreshCw : Lock}
              busy={action === "shield"}
              disabled={!configured || busy}
              onClick={() => run("shield")}
            />
            <TokenButton
              label={action === "transfer" ? "Sending" : "Encrypted transfer"}
              icon={action === "transfer" ? RefreshCw : ArrowRight}
              busy={action === "transfer"}
              disabled={!configured || busy}
              onClick={() => run("transfer")}
            />
            <TokenButton
              label={action === "decrypt" ? "Decrypting" : "Reveal balance"}
              icon={action === "decrypt" ? RefreshCw : Eye}
              busy={action === "decrypt"}
              disabled={!configured || busy}
              onClick={revealBalance}
            />
            <TokenButton
              label={action === "unshield" ? "Unshielding" : "Unshield USDC"}
              icon={action === "unshield" ? RefreshCw : Unlock}
              busy={action === "unshield"}
              disabled={!configured || busy}
              onClick={unshieldUsdc}
            />
          </div>

          <details className="rounded-md border border-border bg-[#050505] px-3 py-2 text-[12px] text-muted-foreground">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider">
              Advanced finalize
            </summary>
            <div className="mt-3 grid gap-2">
              <input
                value={unwrapRequestId}
                onChange={(event) => setUnwrapRequestId(event.target.value)}
                placeholder="Unshield request id / 0x..."
                className="h-10 rounded-md border border-border bg-[#050505] px-3 font-mono text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#8B5CF6]/60"
              />
              <TokenButton
                label={action === "finalize" ? "Finalizing" : "Finalize old request"}
                icon={action === "finalize" ? RefreshCw : Unlock}
                busy={action === "finalize"}
                disabled={!configured || busy}
                onClick={finalizeUnshield}
              />
            </div>
          </details>
        </div>
      </div>

      {balance && (
        <div className="space-y-2 border-t border-border bg-[#0a0a0b] px-4 py-3 text-[12px] sm:px-5">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <Eye className="h-3.5 w-3.5" /> Confidential balance revealed
          </span>
          <div className="font-mono text-[13px] text-foreground">{balance.formatted} vcUSDC</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            balance handle / {balance.handle}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-2 border-t border-border bg-[#0a0a0b] px-4 py-3 text-[12px] sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <Check className="h-3.5 w-3.5" /> Transaction submitted
            </span>
            <a
              href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[#a78bfa] hover:text-[#c4b5fd]"
            >
              {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
            </a>
          </div>
          {result.encryptedHandle && (
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              encrypted amount / {result.encryptedHandle}
            </div>
          )}
          {result.unwrapRequestId && (
            <div className="truncate font-mono text-[10px] text-muted-foreground">
              unwrap request / {result.unwrapRequestId}
            </div>
          )}
          {result.cleartextAmount && (
            <div className="font-mono text-[10px] text-muted-foreground">
              public USDC released / {result.cleartextAmount}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 border-t border-border bg-[#0a0a0b] px-4 py-3 text-[12px] text-destructive sm:px-5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </motion.div>
  );
}

function inferAiTokenAction(result?: IntentParserResult): Action | null {
  if (!result || result.tool !== "confidential_token") return null;
  const raw = result.intent.raw.toUpperCase();
  if (/\b(UNSHIELD|UN-SHIELD|UNWRAP)\b/.test(raw)) return "unshield";
  if (/\b(REVEAL|DECRYPT|BALANCE|PORTFOLIO)\b/.test(raw)) return "decrypt";
  if (/\b(TRANSFER|SEND)\b/.test(raw)) return "transfer";
  if (/\b(SHIELD|WRAP|PRIVATE USDC|VCUSDC)\b/.test(raw)) return "shield";
  return "shield";
}

function describeAction(action: Action) {
  if (action === "shield") return "shield";
  if (action === "unshield") return "unshield";
  if (action === "decrypt") return "reveal balance";
  if (action === "transfer") return "encrypted transfer";
  return "finalize";
}

function TokenButton({
  label,
  icon: Icon,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-full gap-2 bg-surface text-foreground hover:bg-surface-elevated"
    >
      <Icon className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
      {label}
    </Button>
  );
}
