const MODEL = "@cf/baai/bge-small-en-v1.5";
const EMBEDDING_URL = "https://api.cloudflare.com/client/v4/accounts";
const BATCH_SIZE = 32;

type CloudflareEmbeddingResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: { data?: number[][] };
};

async function embedBatch(texts: string[]): Promise<number[][]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be configured");
  }

  const response = await fetch(`${EMBEDDING_URL}/${accountId}/ai/run/${MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts }),
  });

  const body = (await response.json()) as CloudflareEmbeddingResponse;
  if (!response.ok || !body.success || !body.result?.data) {
    const details = body.errors?.map((error) => error.message).filter(Boolean).join("; ");
    throw new Error(`Cloudflare embeddings failed (${response.status})${details ? `: ${details}` : ""}`);
  }
  if (body.result.data.length !== texts.length || body.result.data.some((vector) => vector.length !== 384)) {
    throw new Error("Cloudflare embeddings returned an unexpected vector count or dimension");
  }
  return body.result.data;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    embeddings.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE))));
  }
  return embeddings;
}
