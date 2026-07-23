export const env = {
  port: Number(process.env.PORT || 3000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  pineconeUrl: process.env.PINECONE_URL,
  neo4jUrl: process.env.NEO4J_URI,
  neo4jUser: process.env.NEO4J_USERNAME,
  neo4jPassword: process.env.NEO4J_PASSWORD
};
