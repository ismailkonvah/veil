import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Activity, Download, FileCheck2, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { TopNav } from "@/components/veil/TopNav";
import { PrivacyAudit } from "@/components/veil/PrivacyAudit";
import { clearAudits, downloadProof, loadAudits, type AuditRecord } from "@/lib/veil-audit";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Veil - Privacy Audits" },
      {
        name: "description",
        content:
          "Audit every confidential intent: which fields were encrypted, which metadata stayed public, and downloadable privacy receipts.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const r = loadAudits();
    setRecords(r);
    setActiveId(r[0]?.id ?? null);
  }, []);

  const active = useMemo(
    () => records.find((r) => r.id === activeId) ?? records[0] ?? null,
    [records, activeId],
  );

  const stats = useMemo(() => {
    const totalEnc = records.reduce(
      (s, r) => s + r.fields.filter((f) => f.privacy === "fhe-encrypted").length,
      0,
    );
    const totalPub = records.reduce(
      (s, r) => s + r.fields.filter((f) => f.privacy === "public").length,
      0,
    );
    const ratio = totalEnc + totalPub === 0 ? 0 : (totalEnc / (totalEnc + totalPub)) * 100;
    return { totalEnc, totalPub, ratio: ratio.toFixed(1) };
  }, [records]);

  const handleClear = () => {
    clearAudits();
    setRecords([]);
    setActiveId(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-foreground">
      <div className="pointer-events-none absolute inset-0 veil-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] veil-glow" />

      <TopNav />

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" /> Back to project
            </Link>
            <h1 className="text-[32px] font-semibold text-foreground sm:text-[40px]">
              Privacy Audits
            </h1>
            <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
              Every submitted intent, audited field by field. Download receipts for what was sealed
              and what stayed public.
            </p>
          </div>
          {records.length > 0 && (
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPI
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Intents submitted"
            value={String(records.length)}
          />
          <KPI
            icon={<Lock className="h-3.5 w-3.5" />}
            label="Fields encrypted"
            value={String(stats.totalEnc)}
            accent
          />
          <KPI
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            label="Privacy ratio"
            value={`${stats.ratio}%`}
          />
          <KPI
            icon={<FileCheck2 className="h-3.5 w-3.5" />}
            label="Receipts available"
            value={String(records.length)}
          />
        </div>

        {records.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-[#0B0B0C]">
              <div className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Recent intents
              </div>
              <div className="max-h-[640px] divide-y divide-border overflow-y-auto">
                {records.map((r) => {
                  const isActive = r.id === active?.id;
                  const enc = r.fields.filter((f) => f.privacy === "fhe-encrypted").length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveId(r.id)}
                      className={`block w-full px-4 py-3 text-left transition-colors ${
                        isActive ? "bg-[#8B5CF6]/8" : "hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {r.intent.raw}
                        </span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>{enc} enc</span>
                        <span>/</span>
                        <span>
                          {r.block ? `block ${r.block.toLocaleString()}` : "block pending"}
                        </span>
                        <span>/</span>
                        <span>{relativeTime(r.createdAt)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {active && (
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden rounded-xl border border-border bg-[#0B0B0C]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Intent / {active.id}
                      </div>
                      <div className="mt-1 truncate text-[16px] font-medium text-foreground">
                        "{active.intent.raw}"
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        tx {active.txHash.slice(0, 18)}... /{" "}
                        {active.block ? `block ${active.block.toLocaleString()}` : "block pending"}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadProof(active)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-3 py-1.5 text-[12px] font-medium text-[#c4b5fd] transition-colors hover:bg-[#8B5CF6]/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Download receipt
                    </button>
                  </div>
                </motion.div>
              )}

              {active && <PrivacyAudit key={active.id} record={active} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-[#0B0B0C] px-4 py-3">
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1.5 text-[22px] font-semibold tracking-tight ${accent ? "text-[#a78bfa]" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-[#0B0B0C] px-6 py-16 text-center">
      <ShieldCheck className="mx-auto h-8 w-8 text-[#8B5CF6]" />
      <h3 className="mt-4 text-[16px] font-medium text-foreground">No audits yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
        Submit a confidential intent from the console. Its full privacy receipt will appear here.
      </p>
      <Link
        to="/console"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-[12px] text-foreground transition-colors hover:border-border-strong"
      >
        Open console
      </Link>
    </div>
  );
}

function relativeTime(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
