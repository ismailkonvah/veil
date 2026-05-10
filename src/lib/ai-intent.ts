import { normalizeIntent, parseIntent, type Intent, type IntentCandidate } from "./veil-intent";

export type IntentParserSource = "ai" | "local";
export type AiCommandTool = "intent" | "portfolio" | "confidential_token" | "unsupported";

export type IntentParserResult = {
  tool: AiCommandTool;
  intent: Intent;
  source: IntentParserSource;
  confidence: number;
  rationale: string;
  warnings: string[];
  model?: string;
};

export function localIntentResult(raw: string, rationale = "Parsed locally."): IntentParserResult {
  const tool = inferLocalTool(raw);

  return {
    tool,
    intent: parseIntent(raw),
    source: "local",
    confidence: tool === "unsupported" ? 0.9 : 0.62,
    rationale:
      tool === "unsupported" && rationale === "Parsed locally."
        ? "Veil understood the request, but it is outside the current Sepolia demo scope."
        : rationale,
    warnings:
      tool === "unsupported"
        ? [
            "Supported commands: Sepolia ETH -> USDC intents, shield/hide privacy intents, and wallet portfolio checks.",
          ]
        : [],
  };
}

export async function requestAiIntent(raw: string): Promise<IntentParserResult> {
  const response = await fetch("/api/ai-intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ command: raw }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "AI intent parser failed.");
  }

  return sanitizeIntentResult(raw, (await response.json()) as Partial<IntentParserResult>);
}

export function sanitizeIntentResult(
  raw: string,
  result: Partial<Omit<IntentParserResult, "intent">> & { intent?: IntentCandidate },
): IntentParserResult {
  const source = result.source === "ai" ? "ai" : "local";
  const inferredTool = inferLocalTool(raw);
  const tool = isUnsupportedFeatureQuery(raw)
    ? "unsupported"
    : result.tool === "portfolio" ||
        result.tool === "confidential_token" ||
        result.tool === "unsupported" ||
        result.tool === "intent"
      ? result.tool
      : inferredTool;

  return {
    tool,
    intent: normalizeIntent(raw, result.intent),
    source,
    confidence: clampConfidence(result.confidence),
    rationale: typeof result.rationale === "string" ? result.rationale : "Intent normalized.",
    warnings: sanitizeWarnings(tool, result.warnings),
    model: typeof result.model === "string" ? result.model : undefined,
  };
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.7;
  return Math.min(1, Math.max(0, value));
}

function sanitizeWarnings(tool: AiCommandTool, warnings: unknown) {
  if (!Array.isArray(warnings)) return [];

  return warnings
    .filter((warning): warning is string => typeof warning === "string")
    .filter((warning) => {
      if (tool !== "confidential_token") return true;
      return !/irreversible|cannot be reversed|reveal the encrypted usdc balance/i.test(warning);
    });
}

function isPortfolioQuery(raw: string) {
  return /\b(BALANCE|BALANCES|PORTFOLIO|WALLET|HOLDINGS|FUNDS|ASSETS)\b/i.test(raw);
}

function inferLocalTool(raw: string): AiCommandTool {
  if (isUnsupportedFeatureQuery(raw)) return "unsupported";
  if (isConfidentialTokenQuery(raw)) return "confidential_token";
  if (isPortfolioQuery(raw)) return "portfolio";
  if (isSupportedIntentQuery(raw)) return "intent";
  return "unsupported";
}

function isSupportedIntentQuery(raw: string) {
  return /\b(SWAP|TRADE|CONVERT|EXCHANGE|BUY|SELL|SHIELD|PRIVATE|HIDE|CONFIDENTIAL|MEV|PROTECT)\b/i.test(
    raw,
  );
}

function isUnsupportedFeatureQuery(raw: string) {
  return /\b(WITHDRAW|REDEEM|BRIDGE|STAKE|LEND|BORROW|BASE|MAINNET|NFT)\b/i.test(raw);
}

function isConfidentialTokenQuery(raw: string) {
  return /\b(WRAP|UNWRAP|UNSHIELD|UN-SHIELD|FINALIZE|REVEAL|DECRYPT|TRANSFER|SEND|CONFIDENTIAL TOKEN|VCUSDC|PRIVATE USDC)\b/i.test(
    raw,
  );
}
