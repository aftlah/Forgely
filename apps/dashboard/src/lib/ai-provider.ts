import { createGeminiProvider, type AiProvider } from "@forgely/ai";

import { getBuilderEnv } from "./env";

/** The AI provider the builder uses, configured from the environment. Swap it here to change vendors. */
export function getAiProvider(): AiProvider {
  const env = getBuilderEnv();
  return createGeminiProvider({
    apiKey: env.GEMINI_API_KEY,
    models: [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL],
    baseUrl: env.GEMINI_API_BASE_URL,
  });
}
