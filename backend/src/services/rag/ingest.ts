import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { QdrantClient } from "@qdrant/js-client-rest";
import DocModel from "../../models/Document";
import { embedTexts } from "../embeddings/cloudflare";
import { collectionNameForNote } from "./collection";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const VECTOR_SIZE = 384; // Cloudflare bge-small-en-v1.5 output size
const QDRANT_URL = process.env.QDRANT_URL || "http://qdrant:6333";

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const cleanedText = text.replace(/\r\n/g, "\n").trim();

  if (cleanedText.length <= CHUNK_SIZE) {
    if (cleanedText.length > 0) chunks.push(cleanedText);
    return chunks;
  }

  let start = 0;
  while (start < cleanedText.length) {
    let end = start + CHUNK_SIZE;

    if (end < cleanedText.length) {
      const segment = cleanedText.slice(start, end);
      const paragraphBreak = segment.lastIndexOf("\n\n");
      const sentenceBreak = segment.lastIndexOf(". ");
      const wordBreak = segment.lastIndexOf(" ");

      if (paragraphBreak > CHUNK_SIZE * 0.3) {
        end = start + paragraphBreak + 2;
      } else if (sentenceBreak > CHUNK_SIZE * 0.3) {
        end = start + sentenceBreak + 2;
      } else if (wordBreak > CHUNK_SIZE * 0.3) {
        end = start + wordBreak + 1;
      }
    }

    const chunk = cleanedText.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
    if (end >= cleanedText.length) break;
  }

  return chunks;
}

async function extractText(filePath: string, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === ".txt") return fs.readFileSync(filePath, "utf-8");
  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

export async function ingestDocument(documentId: string): Promise<void> {
  const doc = await DocModel.findById(documentId);
  if (!doc) {
    console.error(`Ingest: Document ${documentId} not found`);
    return;
  }

  try {
    doc.status = "processing";
    await doc.save();

    const uploadsDir = path.join(__dirname, "../../../uploads");
    const filePath = path.join(uploadsDir, doc.filename);
    const text = await extractText(filePath, doc.originalName);

    if (!text.trim()) throw new Error("No text content could be extracted from the file");

    console.log(`Ingest: Extracted ${text.length} chars from ${doc.originalName}`);

    const chunks = chunkText(text);
    console.log(`Ingest: Split into ${chunks.length} chunks`);

    if (chunks.length === 0) throw new Error("No chunks could be created from the extracted text");

    // Embed remotely to keep model memory and CPU use off the Render instance.
    const embeddings = await embedTexts(chunks);
    console.log(`Ingest: Embedded ${embeddings.length} chunks`);

    const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: process.env.QDRANT_API_KEY });
    const collectionName = collectionNameForNote(doc.noteId.toString());

  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);
    if (!exists) {
      await qdrant.createCollection(collectionName, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
      console.log(`Ingest: Created collection ${collectionName}`);
    } else {
      console.log(`Ingest: Reusing existing collection ${collectionName}`);
    }
  } catch {
    await qdrant.createCollection(collectionName, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }

console.log(`Ingest: Created collection ${collectionName} (size=${VECTOR_SIZE}, Cosine)`);

const docIdHash = parseInt(doc._id.toString().slice(-8), 16) % 1_000_000;
  const points = embeddings.map((vector, i) => ({
    id: docIdHash * 1000 + i + 1,
  
  vector,
      payload: {
        text: chunks[i],
        chunkIndex: i,
        documentId: doc._id.toString(),
        documentName: doc.originalName,
      },
    }));

    await qdrant.upsert(collectionName, { wait: true, points });
    console.log(`Ingest: Upserted ${points.length} vectors into ${collectionName}`);

    doc.status = "ready";
    doc.chunkCount = chunks.length;
    await doc.save();

    console.log(`Ingest: Document ${doc.originalName} is ready (${chunks.length} chunks)`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during ingestion";
    console.error(`Ingest error for ${doc.originalName}:`, errorMessage);
    doc.status = "error";
    doc.errorMessage = errorMessage;
    await doc.save();
  }
}
