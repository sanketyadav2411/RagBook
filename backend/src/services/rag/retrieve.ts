import { QdrantClient } from "@qdrant/js-client-rest";

const VECTOR_SIZE = 384; // must match ingest.ts
const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";
const TOP_K = 5;

async function getEmbedder() {
  const { pipeline } = await import("@xenova/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
}

async function embedQuery(query: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const output = await extractor(query, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export interface RetrievedChunk {
  text: string;
  documentName: string;
  chunkIndex: number;
  score: number;
}

export async function retrieveChunks(query: string, noteId: string): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(query);

  const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
  const collectionName = `note-${noteId}`;

  const searchResult = await qdrant.search(collectionName, {
    vector: queryVector,
    limit: TOP_K,
    with_payload: true,
  });

  return searchResult.map((hit) => ({
    text: hit.payload?.text as string,
    documentName: hit.payload?.documentName as string,
    chunkIndex: hit.payload?.chunkIndex as number,
    score: hit.score,
  }));
}
