import { Worker } from "bullmq";
import { redis } from "../config/redis.config";
import { processService } from "../services/process.service";
import { relationshipService } from "../services/relationship.service";

const worker = new Worker("process-data", async job => {
    const { data } = job.data; // Note that job.data was passed as { data } in data.controller.ts
    const result = await processService(data);

    if (!result) {
        return;
    }

    console.log("Extracted result:", result);
    const dbCase = await relationshipService(result);
    if (dbCase) {
        console.log(`Successfully persisted case: ${dbCase.caseNumber}`);
    } else {
        console.log("Failed to persist case and relationships");
    }
}, {
    connection: redis,
})

console.log(worker.isRunning())

worker.on("failed", (job, error) => {
    console.log("Job failed:", job, error);
})

worker.on("completed", (job, result) => {
    console.log("Job completed:", result);
})

worker.on("error", (error) => {
    console.log("Worker error:", error);
})
