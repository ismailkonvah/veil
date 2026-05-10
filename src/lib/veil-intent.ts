export type Intent = {
  action: "swap" | "shield" | "hide";
  fromAsset: string;
  toAsset?: string;
  amount: string;
  slippageBps: number;
  shielded: boolean;
  mevProtected: boolean;
  raw: string;
};

const ASSETS = ["ETH", "USDC", "USDT", "DAI", "WBTC"];
const ACTIONS: Intent["action"][] = ["swap", "shield", "hide"];

export type IntentCandidate = Partial<Omit<Intent, "raw">>;

export function parseIntent(raw: string): Intent {
  const text = raw.toUpperCase();
  const action: Intent["action"] = text.includes("HIDE")
    ? "hide"
    : text.includes("SHIELD") && !text.includes("SHIELDED")
      ? "shield"
      : "swap";

  const amountMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch
    ? amountMatch[1].replace(",", ".")
    : /TINY|SMALL|LITTLE|MINIMAL/.test(text)
      ? "0.01"
      : action === "swap"
        ? "0.01"
        : "1";

  const found = ASSETS.filter((a) => text.includes(a));
  const fromAsset = found[0] ?? (action === "swap" ? "ETH" : "USDC");
  const toAsset = found[1] ?? (action === "swap" ? defaultSwapTarget(fromAsset) : undefined);

  return {
    action,
    fromAsset,
    toAsset,
    amount,
    slippageBps: extractSlippageBps(raw),
    shielded: /SHIELD|PRIVATE|HIDE|CONFIDENTIAL/.test(text),
    mevProtected: /MEV|PROTECT/.test(text),
    raw,
  };
}

export function normalizeIntent(raw: string, candidate?: IntentCandidate | null): Intent {
  const fallback = parseIntent(raw);
  if (!candidate) return fallback;

  const action = ACTIONS.includes(candidate.action as Intent["action"])
    ? (candidate.action as Intent["action"])
    : fallback.action;
  const candidateAsset = normalizeAsset(candidate.fromAsset);
  const fromAsset = action === "swap" ? (candidateAsset ?? fallback.fromAsset) : fallback.fromAsset;
  const toAsset =
    action === "swap"
      ? (normalizeAsset(candidate.toAsset) ?? fallback.toAsset ?? defaultSwapTarget(fromAsset))
      : undefined;
  const amount = normalizeAmount(candidate.amount) ?? fallback.amount;

  return {
    action,
    fromAsset,
    toAsset,
    amount,
    slippageBps: clampBps(candidate.slippageBps ?? fallback.slippageBps),
    shielded: candidate.shielded ?? fallback.shielded,
    mevProtected: candidate.mevProtected ?? fallback.mevProtected,
    raw,
  };
}

export function formatSlippage(slippageBps: number) {
  return `${(clampBps(slippageBps) / 100).toFixed(2)}%`;
}

function normalizeAsset(asset?: string) {
  if (!asset) return undefined;
  const upper = asset.toUpperCase();
  return ASSETS.includes(upper) ? upper : undefined;
}

function normalizeAmount(amount?: string) {
  if (!amount) return undefined;
  const value = Number.parseFloat(amount.replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return String(value);
}

function defaultSwapTarget(fromAsset: string) {
  return fromAsset === "ETH" ? "USDC" : "ETH";
}

function extractSlippageBps(raw: string) {
  const text = raw.toUpperCase();
  const percent = raw.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (percent) {
    return clampBps(Math.round(Number.parseFloat(percent[1].replace(",", ".")) * 100));
  }
  if (/LOW|TIGHT|SAFE|MINIMAL/.test(text)) return 30;
  if (/HIGH|AGGRESSIVE|FAST/.test(text)) return 100;
  return 30;
}

function clampBps(value: number) {
  if (!Number.isFinite(value)) return 30;
  return Math.min(500, Math.max(1, Math.round(value)));
}
