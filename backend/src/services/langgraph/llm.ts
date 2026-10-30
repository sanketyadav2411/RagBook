import { ChatGroq } from "@langchain/groq";

/**
 * Single place to construct the Groq chat model used across all
 * Summary graph nodes. Keeping this here (instead of per-node) avoids
 * repeated client construction and makes it easy to tune temperature
 * per use case later if needed.
 */
export function getSummaryLLM(temperature = 0.2): ChatGroq {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature,
  });
}
