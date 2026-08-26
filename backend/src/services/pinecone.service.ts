import { caseIndex } from "../config/pinecone.config.js";

export type ImageSimilarityHit = {
  id: string;
  score: number;
  caseId?: string;
  evidenceId?: string;
  chunkText?: string;
};

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

/**
 * Index a case's textual summary into the vector namespace so future
 * similarity searches can find it. Best-effort; never blocks ingestion.
 */
export async function indexCaseForSearch(params: {
  caseId: string;
  text: string;
  evidenceId?: string;
}) {
  const { caseId, text, evidenceId } = params;

  if (!text) {
    return;
  }

  try {
    await caseIndex.upsertRecords({
      records: [
        {
          id: `case-${caseId}-${evidenceId ? evidenceId.slice(0, 8) : "main"}`,
          chunk_text: text,
          caseId,
          ...(evidenceId ? { evidenceId } : {}),
        },
      ],
    });
  } catch (error) {
    console.warn("Unable to index case for vector search.", error);
  }
}
