import { motion } from "framer-motion";
import { Download, EyeOff, Eye, FileCheck2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { downloadProof, type AuditRecord } from "@/lib/veil-audit";

export function PrivacyAudit({
  record,
  compact = false,
}: {
  record: AuditRecord;
  compact?: boolean;
}) {
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const encrypted = record.fields.filter((f) => f.privacy === "fhe-encrypted");
  const committed = record.fields.filter((f) => f.privacy === "committed");
  const publicFields = record.fields.filter((f) => f.privacy === "public");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Privacy Receipt
          </span>
        </div>
        <button
          onClick={() => downloadProof(record)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated"
        >
          <Download className="h-3 w-3" />
          Receipt.json
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <Stat label="Encrypted" value={String(encrypted.length)} accent />
        <Stat label="Committed" value={String(committed.length)} />
        <Stat label="Public" value={String(publicFields.length)} />
      </div>

      <Section
        title="FHE-encrypted fields"
        icon={<EyeOff className="h-3 w-3" />}
        count={encrypted.length}
      >
        {encrypted.map((f) => (
          <FieldRow
            key={f.key}
            label={f.label}
            value={reveal[f.key] ? f.plaintext : (f.onchainValue ?? "")}
            cipher={!reveal[f.key]}
            rationale={f.rationale}
            onToggle={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
            revealed={!!reveal[f.key]}
          />
        ))}
      </Section>

      <Section
        title="Committed fields"
        icon={<EyeOff className="h-3 w-3" />}
        count={committed.length}
      >
        {committed.map((f) => (
          <FieldRow
            key={f.key}
            label={f.label}
            value={reveal[f.key] ? f.plaintext : (f.onchainValue ?? "")}
            cipher={!reveal[f.key]}
            rationale={f.rationale}
            onToggle={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
            revealed={!!reveal[f.key]}
          />
        ))}
      </Section>

      <Section
        title="Public metadata"
        icon={<Eye className="h-3 w-3" />}
        count={publicFields.length}
      >
        {publicFields.map((f) => (
          <FieldRow key={f.key} label={f.label} value={f.plaintext} rationale={f.rationale} />
        ))}
      </Section>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-[#0a0a0b] px-4 py-3 sm:px-5">
          <FileCheck2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <div className="flex-1 truncate font-mono text-[11px] text-muted-foreground">
            receipt / <span className="text-foreground">{record.proofHash.slice(0, 28)}...</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {record.scheme}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-[18px] font-semibold tracking-tight ${accent ? "text-[#a78bfa]" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sm:px-5">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  cipher,
  rationale,
  onToggle,
  revealed,
}: {
  label: string;
  value: string;
  cipher?: boolean;
  rationale: string;
  onToggle?: () => void;
  revealed?: boolean;
}) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-[12px] text-foreground">{label}</span>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <span
            className={`min-w-0 flex-1 truncate font-mono text-[11px] sm:flex-none ${cipher ? "text-[#8B5CF6]/90" : "text-muted-foreground"}`}
          >
            {cipher ? `${value.slice(0, 22)}...` : value}
          </span>
          {onToggle && (
            <button
              onClick={onToggle}
              className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              {revealed ? "Hide" : "Reveal"}
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">{rationale}</div>
    </div>
  );
}
