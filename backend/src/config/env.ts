export const env = {
  port: Number(process.env.PORT || 3000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  pineconeUrl: process.env.PINECONE_URL,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  ollamaEmbeddingModel:
    process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
  catalystStratusBucket: process.env.CATALYST_STRATUS_BUCKET || "datathon-1",
  catalystJobpoolName: process.env.CATALYST_JOBPOOL_NAME,
  catalystAppsailName: process.env.CATALYST_APPSAIL_NAME || "tasc",
  catalystWorkerUrl: process.env.CATALYST_WORKER_URL,

  awsEndpoint: process.env.S3_ENDPOINT,
  awsAccessKeyId: process.env.S3_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  awsS3Bucket: process.env.S3_BUCKET,
};
