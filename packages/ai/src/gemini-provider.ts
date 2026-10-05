import { AiUnavailableError } from "@forgely/shared";

import { MODEL_MISSING_STATUS, RETRIABLE_STATUSES } from "./constants";
import type { AiProvider, JsonRequest, JsonResponse } from "./provider";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const ATTEMPTS_PER_MODEL = 3;
const BACKOFF_BASE_MS = 1_000;
const REQUEST_TIMEOUT_MS = 45_000;
const TEMPERATURE = 0.4;
/** A plan for a large server is long JSON. Without a cap set here the model's default can cut it off mid-answer. */
const MAX_OUTPUT_TOKENS = 16_384;
const MAX_ERROR_DETAIL = 300;

export interface GeminiProviderOptions {
  apiKey: string;
  /** Tried in order. The first that answers wins; later ones are fallbacks. */
  models: string[];
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Injected so tests do not really wait. */
  sleep?: (milliseconds: number) => Promise<void>;
}

interface GeminiBody {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

type Attempt = { kind: "ok"; text: string } | { kind: "retry" } | { kind: "next-model" };

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Keywords Gemini's `responseJsonSchema` refuses (found by probing the real API: a request with
 * `minItems`/`maxItems` or `$schema` is a 400). Our Zod schema still enforces them on the answer.
 */
const UNSUPPORTED_SCHEMA_KEYWORDS = new Set(["$schema", "minItems", "maxItems"]);

export function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node === null || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([keyword]) => !UNSUPPORTED_SCHEMA_KEYWORDS.has(keyword))
      .map(([keyword, value]) => [keyword, toGeminiSchema(value)]),
  );
}

function buildBody(request: JsonRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: request.system }] },
    contents: [{ role: "user", parts: [{ text: request.user }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(request.jsonSchema),
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };
}

function readAnswer(body: GeminiBody): Attempt {
  if (body.promptFeedback?.blockReason) {
    throw new AiUnavailableError(`Gemini blocked the prompt: ${body.promptFeedback.blockReason}`);
  }
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  // An empty or cut-off answer is worth another try, not a crash.
  return text.length > 0 ? { kind: "ok", text } : { kind: "retry" };
}

/** Gemini explains a 400 in its body. It goes to logs only, never to the user. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return String(body.error?.message ?? "no message").slice(0, MAX_ERROR_DETAIL);
  } catch {
    return "unreadable error body";
  }
}

async function requestOnce(
  options: Required<Pick<GeminiProviderOptions, "apiKey" | "baseUrl">> & {
    fetchImpl: typeof fetch;
  },
  model: string,
  request: JsonRequest,
): Promise<Attempt> {
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (request.signal) signals.push(request.signal);
  let response: Response;
  try {
    response = await options.fetchImpl(`${options.baseUrl}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": options.apiKey },
      body: JSON.stringify(buildBody(request)),
      signal: AbortSignal.any(signals),
    });
  } catch (error) {
    if (request.signal?.aborted) throw new AiUnavailableError("Request was cancelled", error);
    return { kind: "retry" };
  }
  if (response.ok) return readAnswer((await response.json()) as GeminiBody);
  if (response.status === MODEL_MISSING_STATUS) return { kind: "next-model" };
  if (RETRIABLE_STATUSES.has(response.status)) return { kind: "retry" };
  // 400/401/403 mean our request or key is wrong; another attempt or model will not fix that.
  throw new AiUnavailableError(
    `Gemini rejected the request with HTTP ${response.status}: ${await readErrorMessage(response)}`,
  );
}

/** Gemini over plain REST: structured JSON output, retry with backoff, then the fallback model. */
export function createGeminiProvider(options: GeminiProviderOptions): AiProvider {
  const sleep = options.sleep ?? defaultSleep;
  const transport = {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    fetchImpl: options.fetchImpl ?? fetch,
  };
  const attempt = (model: string, request: JsonRequest): Promise<Attempt> =>
    requestOnce(transport, model, request);

  async function tryModel(model: string, request: JsonRequest): Promise<string | null> {
    for (let index = 0; index < ATTEMPTS_PER_MODEL; index += 1) {
      const result = await attempt(model, request);
      if (result.kind === "ok") return result.text;
      if (result.kind === "next-model") return null;
      if (index < ATTEMPTS_PER_MODEL - 1) await sleep(BACKOFF_BASE_MS * 2 ** index);
    }
    return null;
  }

  return {
    async generateJson(request: JsonRequest): Promise<JsonResponse> {
      for (const model of options.models) {
        const text = await tryModel(model, request);
        if (text !== null) return { text, model };
      }
      throw new AiUnavailableError(`No Gemini model answered (tried ${options.models.join(", ")})`);
    },
  };
}
