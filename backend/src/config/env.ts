export const env = {
  port: Number(process.env.PORT || 3000),

  pineconeApiKey: process.env.PINECONE_API_KEY,

  luxandToken: process.env.LUXAND_TOKEN,

  catalystStratusBucket: process.env.CATALYST_STRATUS_BUCKET || "datathoon",
  catalystProjectId: process.env.CATALYST_PROJECT_ID,
  catalystProjectKey: process.env.CATALYST_PROJECT_KEY,
  catalystEnvironment: process.env.CATALYST_ENVIRONMENT,
  catalystClientId: process.env.CATALYST_CLIENT_ID,
  catalystClientSecret: process.env.CATALYST_CLIENT_SECRET,
  catalystRefreshToken: process.env.CATALYST_REFRESH_TOKEN,
};
