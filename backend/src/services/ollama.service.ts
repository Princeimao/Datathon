import crypto from "crypto";
import { OllamaEmbeddings } from "@langchain/ollama";

import { env } from "../config/env.js";

let embeddingClient: OllamaEmbeddings | null = null;

function getEmbeddingClient() {
  if (!embeddingClient) {
    embeddingClient = new OllamaEmbeddings({
      model: env.ollamaEmbeddingModel,
      baseUrl: env.ollamaBaseUrl,
    });
  }
  return embeddingClient;
}

function fallbackVector(input: string, dimensions = 768) {
  const vector = Array.from({ length: dimensions }, (_, index) => {
    const hash = crypto
      .createHash("sha256")
      .update(`${input}:${index}`)
      .digest();
    return (hash.readUInt16BE(0) / 65535) * 2 - 1;
  });
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

export async function embedText(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return fallbackVector("empty");

  try {
    return await getEmbeddingClient().embedQuery(trimmed);
  } catch (error) {
    console.warn("Ollama embedding failed; using deterministic fallback.", error);
    return fallbackVector(trimmed);
  }
}

export function vectorId(prefix: string, value: string) {
  const hash = crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}
