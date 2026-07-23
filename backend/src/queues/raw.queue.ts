import { Queue } from "bullmq";
import { redis } from "../config/redis.config";

export const processQueue = new Queue(
  "process-data",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  }
);


export async function closeQueueConnection() {
  processQueue?.close()
}
