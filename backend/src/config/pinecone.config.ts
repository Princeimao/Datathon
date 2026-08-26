import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "./env.js";

if (!env.pineconeApiKey) {
  throw new Error("PINECONE_API_KEY is not defined");
}

export const pinecone = new Pinecone({
  apiKey: env.pineconeApiKey,
});

export const INDEX_NAME = "datathon";

async function initCaseIndex() {
  const indexes = await pinecone.listIndexes();

  const exists = indexes.indexes?.some((index) => index.name === INDEX_NAME);

  if (!exists) {
    await pinecone.createIndexForModel({
      name: INDEX_NAME,
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "llama-text-embed-v2",
        fieldMap: {
          text: "chunk_text",
        },
      },
      waitUntilReady: true,
    });
  }
}

await initCaseIndex();

export const caseIndex = pinecone.index(INDEX_NAME).namespace("case");
