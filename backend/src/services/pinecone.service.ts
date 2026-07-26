import { caseIndex } from "../config/pinecone.config.js";

export async function searchSimilarCases(text: string, topK = 10) {
  const result = await caseIndex.searchRecords({
    query: {
      topK,
      inputs: {
        text,
      },
    },
    fields: ["chunk_text", "caseId", "evidenceId"],
  });

  return result.result?.hits ?? [];
}

export async function searchImageSimilarity(imageUrl: string, limit: number) {
  const result = await caseIndex.query({
    topK: limit,

    vector: [],

    includeMetadata: true,
  });

  return result.matches ?? [];
}
