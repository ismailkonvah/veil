import { ethers } from "ethers";
import type { SepoliaSubmitResult } from "./veil-contract";
import { formatSlippage, type Intent } from "./veil-intent";

export type AuditField = {
  key: string;
  label: string;
  plaintext: string;
  onchainValue?: string;
  privacy: "fhe-encrypted" | "committed" | "public";
  rationale: string;
};

export type AuditRecord = {
  id: string;
  createdAt: number;
  intent: Intent;
  txHash: string;
  proofHash: string;
  block: number;
  network: string;
  scheme: string;
  fields: AuditField[];
};

const AUDIT_KEY = "veil:audit:v1";

export function buildAudit(intent: Intent, submission: SepoliaSubmitResult): AuditRecord {
  const route = intent.toAsset ? `${intent.fromAsset}->${intent.toAsset}` : intent.fromAsset;
  const custodyRationale =
    intent.action === "swap"
      ? "Trade size leaks position; submitted as a Zama FHE handle."
      : "Privacy amount is encrypted for the receipt; wallet tokens are not transferred or locked.";

  const fields: AuditField[] = [
    {
      key: "amount",
      label: "Amount",
      plaintext: `${intent.amount} ${intent.fromAsset}`,
      onchainValue: submission.encryptedHandles.amount,
      privacy: "fhe-encrypted",
      rationale: custodyRationale,
    },
    {
      key: "slippage",
      label: "Slippage tolerance",
      plaintext: formatSlippage(intent.slippageBps),
      onchainValue: submission.encryptedHandles.slippageBps,
      privacy: "fhe-encrypted",
      rationale: "Reveals price sensitivity; submitted as a Zama FHE handle.",
    },
    {
      key: "mevProtection",
      label: "MEV preference",
      plaintext: intent.mevProtected || intent.shielded ? "enabled" : "disabled",
      onchainValue: submission.encryptedHandles.mevProtection,
      privacy: "fhe-encrypted",
      rationale: "Execution preference is encrypted before the contract call.",
    },
    {
      key: "route",
      label: "Route commitment",
      plaintext: route,
      onchainValue: submission.routeCommitment,
      privacy: "committed",
      rationale: "The plaintext route is not sent; the contract stores a keccak commitment.",
    },
    {
      key: "action",
      label: "Action type",
      plaintext: intent.action,
      privacy: "public",
      rationale: "Action class is public for protocol routing.",
    },
    {
      key: "network",
      label: "Network",
      plaintext: "Sepolia",
      privacy: "public",
      rationale: "Settlement chain is public by definition.",
    },
    {
      key: "contract",
      label: "Contract",
      plaintext: submission.contractAddress,
      privacy: "public",
      rationale: "The deployed vault address is public on Sepolia.",
    },
  ];

  const proofHash = ethers.keccak256(
    ethers.toUtf8Bytes(`${submission.txHash}:${submission.contractAddress}:${intent.raw}`),
  );

  return {
    id: submission.intentId ? `intent-${submission.intentId}` : submission.txHash.slice(2, 14),
    createdAt: Date.now(),
    intent,
    txHash: submission.txHash,
    proofHash,
    block: submission.blockNumber ?? 0,
    network: "sepolia",
    scheme: "Zama fhEVM / Relayer SDK",
    fields,
  };
}

export function loadAudits(): AuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveAudit(record: AuditRecord) {
  if (typeof window === "undefined") return;
  const all = loadAudits();
  all.unshift(record);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(all.slice(0, 50)));
}

export function clearAudits() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUDIT_KEY);
}

export function downloadProof(record: AuditRecord) {
  const proof = {
    $schema: "https://veil.xyz/schemas/privacy-receipt.v1.json",
    id: record.id,
    issuedAt: new Date(record.createdAt).toISOString(),
    network: record.network,
    block: record.block,
    txHash: record.txHash,
    proofHash: record.proofHash,
    encryptionScheme: record.scheme,
    intent: { raw: record.intent.raw, action: record.intent.action },
    disclosure: {
      encrypted: record.fields
        .filter((f) => f.privacy === "fhe-encrypted")
        .map((f) => ({ field: f.key, handle: f.onchainValue, rationale: f.rationale })),
      committed: record.fields
        .filter((f) => f.privacy === "committed")
        .map((f) => ({ field: f.key, commitment: f.onchainValue, rationale: f.rationale })),
      public: record.fields
        .filter((f) => f.privacy === "public")
        .map((f) => ({ field: f.key, value: f.plaintext, rationale: f.rationale })),
    },
  };

  const blob = new Blob([JSON.stringify(proof, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veil-receipt-${record.id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
