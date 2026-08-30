export const env = {
  port: Number(process.env.PORT || 3000),

  pineconeApiKey: process.env.PINECONE_API_KEY,

  luxandToken: process.env.LUXAND_TOKEN,

  catalystStratusBucket: process.env.CATALYST_STRATUS_BUCKET || "datathoon",
};
