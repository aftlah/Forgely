/** One request for structured JSON. The adapter decides how to ask the model. */
export interface JsonRequest {
  system: string;
  user: string;
  /** JSON Schema the answer must follow. */
  jsonSchema: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface JsonResponse {
  /** The raw JSON text. The caller validates it; a provider's "valid" is never trusted. */
  text: string;
  /** Which model actually answered, for logs. */
  model: string;
}

/**
 * Port to a language model. The builder depends on this, not on Gemini, so the provider can be swapped
 * (Claude was the earlier plan) without touching the planner.
 */
export interface AiProvider {
  generateJson(request: JsonRequest): Promise<JsonResponse>;
}
