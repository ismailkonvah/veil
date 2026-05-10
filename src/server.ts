import "./lib/error-capture";

import { localIntentResult, sanitizeIntentResult } from "./lib/ai-intent";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = Record<string, string | undefined>;

const INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tool: { type: "string", enum: ["intent", "portfolio", "confidential_token", "unsupported"] },
    action: { type: "string", enum: ["swap", "shield", "hide"] },
    fromAsset: { type: "string", enum: ["ETH", "USDC", "USDT", "DAI", "WBTC"] },
    toAsset: { type: ["string", "null"], enum: ["ETH", "USDC", "USDT", "DAI", "WBTC", null] },
    amount: { type: "string" },
    slippageBps: { type: "integer", minimum: 1, maximum: 500 },
    shielded: { type: "boolean" },
    mevProtected: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
    warnings: { type: "array", items: { type: "string" }, maxItems: 4 },
  },
  required: [
    "tool",
    "action",
    "fromAsset",
    "toAsset",
    "amount",
    "slippageBps",
    "shielded",
    "mevProtected",
    "confidence",
    "rationale",
    "warnings",
  ],
} as const;

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

async function handleAiIntent(request: Request, env: unknown): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let command = "";
  try {
    const body = (await request.json()) as { command?: unknown };
    command = typeof body.command === "string" ? body.command.trim() : "";
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!command) {
    return json({ error: "Command is required" }, { status: 400 });
  }

  if (command.length > 500) {
    return json({ error: "Command is too long" }, { status: 400 });
  }

  const apiKey = getEnvValue(env, "MISTRAL_API_KEY");
  const model = getEnvValue(env, "MISTRAL_INTENT_MODEL") ?? "mistral-small-latest";

  if (!apiKey) {
    return json(
      localIntentResult(
        command,
        "No server-side MISTRAL_API_KEY is configured, so Veil used the deterministic local parser.",
      ),
    );
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are Veil's command router for a Sepolia-only Zama FHE demo. Understand the user's request, then choose one tool: intent, portfolio, confidential_token, or unsupported. Use portfolio for wallet balance, holdings, funds, asset, or portfolio questions. Use confidential_token for shielding/wrapping USDC into vcUSDC, encrypted confidential USDC transfers, decrypting/revealing a vcUSDC balance, requesting unshield/unwrap from vcUSDC back toward public USDC, or finalizing an unshield request id. Use intent only for Sepolia ETH-to-USDC intent submission, encrypted privacy receipts, hide exposure, or MEV-protected execution. Use unsupported for anything else, including Base/mainnet bridging, lending, staking, price predictions, NFTs, unrelated chat, arbitrary automation, or unclear commands. Do not pretend unsupported features exist. For unsupported commands, explain what was requested and why Veil cannot do it yet. Important: Veil's intent flow records encrypted metadata; the confidential_token flow is the actual ERC7984 wrapper path for token balances and encrypted transfers. Keep amounts as decimal strings without token symbols. Slippage must be basis points from 1 to 500. For confidential_token commands, preserve the requested amount when present, set fromAsset to USDC, set action to shield for shield/wrap/private USDC commands, and set action to hide for reveal/unshield/transfer commands. For portfolio or unsupported commands, fill intent fields with safe defaults: action hide, fromAsset USDC, toAsset null, amount 0.01, slippageBps 30, shielded true, mevProtected false. Return JSON only.",
          },
          {
            role: "user",
            content: command,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "veil_intent",
            schema: INTENT_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    if (!response.ok) {
      const fallback = localIntentResult(
        command,
        `AI parser unavailable (${response.status}); Veil used the deterministic local parser.`,
      );
      fallback.warnings.push("AI parser request failed before wallet execution.");
      return json(fallback);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const parsed = JSON.parse(extractMistralResponseText(payload));
    const result = sanitizeIntentResult(command, {
      intent: parsed,
      tool: parsed.tool,
      source: "ai",
      confidence: parsed.confidence,
      rationale: parsed.rationale,
      warnings: parsed.warnings,
      model,
    });

    return json(result);
  } catch (error) {
    console.error(error);
    const fallback = localIntentResult(
      command,
      "AI parser failed; Veil used the deterministic local parser.",
    );
    fallback.warnings.push("Review the decoded intent before signing.");
    return json(fallback);
  }
}

function extractMistralResponseText(payload: Record<string, unknown>) {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    throw new Error("Mistral response did not include choices.");
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    throw new Error("Mistral response did not include a message.");
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const text = content
      .map((part) =>
        part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
          ? (part as { text: string }).text
          : "",
      )
      .join("");
    if (text) return text;
  }

  throw new Error("Mistral response did not include parseable output text.");
}

function getEnvValue(env: unknown, key: string) {
  const runtimeEnv = env && typeof env === "object" ? (env as RuntimeEnv) : {};
  const globalProcess = globalThis as typeof globalThis & {
    process?: { env?: RuntimeEnv };
  };

  return runtimeEnv[key] || globalProcess.process?.env?.[key];
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/ai-intent") {
        return await handleAiIntent(request, env);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
