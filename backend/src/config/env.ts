export const env = {
  port: Number(process.env.PORT || 3000),

  // Pinecone (case text vector search only — no face vectors)
  pineconeApiKey: process.env.PINECONE_API_KEY,

  // Luxand Cloud Face API token
  luxandToken: process.env.LUXAND_TOKEN,

  // Zoho Catalyst Stratus storage
  catalystStratusBucket: process.env.CATALYST_STRATUS_BUCKET || "datathon-1",
};
