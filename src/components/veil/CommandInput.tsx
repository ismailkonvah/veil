import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Swap 0.01 ETH to USDC with MEV protection",
  "AI check my wallet portfolio",
  "Shield 5 USDC into private vcUSDC",
  "Unshield my vcUSDC back to USDC",
  "Can Veil bridge to Base?",
];

export function CommandInput({
  onSubmit,
  disabled,
  isParsing,
}: {
  onSubmit: (cmd: string) => void | Promise<void>;
  disabled?: boolean;
  isParsing?: boolean;
}) {
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const target = "Ask AI: shield 5 USDC privately";
    let i = 0;
    const id = setInterval(() => {
      i++;
      setPlaceholder(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (cmd: string) => {
    if (!cmd.trim() || disabled || isParsing) return;
    onSubmit(cmd.trim());
    setValue("");
  };

  return (
    <div className="w-full">
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="group relative"
      >
        {/* Subtle outer glow */}
        <div className="pointer-events-none absolute -inset-px rounded-[14px] bg-gradient-to-b from-[#8B5CF6]/20 to-transparent opacity-60 blur-[2px] transition-opacity group-focus-within:opacity-100" />
        <div className="relative flex items-center gap-2 rounded-[13px] border border-border-strong bg-[#0B0B0C] px-3 py-3 shadow-[0_30px_80px_-30px_rgba(139,92,246,0.35),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all focus-within:border-[#8B5CF6]/50 sm:gap-3 sm:px-4">
          <Sparkles className="h-4 w-4 shrink-0 text-[#8B5CF6]" strokeWidth={1.5} />
          <span className="hidden rounded-md border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#c4b5fd] sm:inline-flex">
            AI
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(value)}
            placeholder={placeholder || "Ask AI: shield 5 USDC privately"}
            disabled={disabled || isParsing}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium tracking-tight text-foreground placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-50 sm:text-[17px]"
          />
          <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
          <button
            onClick={() => submit(value || "Ask AI: shield 5 USDC privately")}
            disabled={disabled || isParsing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#8B5CF6] text-white shadow-[0_4px_20px_-4px_rgba(139,92,246,0.6)] transition-all hover:bg-[#7c4ef0] active:scale-95 disabled:opacity-50"
            aria-label="Execute"
          >
            {isParsing ? (
              <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            ) : (
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </motion.div>

      <div className="mt-5 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
            onClick={() => submit(s)}
            disabled={disabled || isParsing}
            className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-[12px] text-muted-foreground transition-all hover:border-border-strong hover:bg-surface hover:text-foreground disabled:opacity-50"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
