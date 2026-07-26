import crypto from "crypto";

import { env } from "../config/env.js";

type CatalystJobPayload = {
  kind: "single-ingestion" | "bulk-ingestion";
  payload: unknown;
};

async function getCatalystApp(req?: unknown) {
  try {
    const catalyst = await import("zcatalyst-sdk-node");
    const sdk = (catalyst as any).default || catalyst;
    return req ? sdk.initialize(req) : sdk.initialize();
  } catch (error) {
    console.warn("Catalyst SDK is unavailable in this runtime.", error);
    return null;
  }
}

export async function uploadToStratus(params: {
  keyPrefix: string;
  fileName: string;
  contentType?: string;
  base64?: string;
  text?: string;
  req?: unknown;
}) {
  const safeFileName = params.fileName.replace(/[^\w.\-]+/g, "_");
  const objectKey = `${params.keyPrefix}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
  const body = params.base64
    ? Buffer.from(params.base64.replace(/^data:[^;]+;base64,/, ""), "base64")
    : params.text || "";

  const app = await getCatalystApp(params.req);
  if (!app || !env.catalystStratusBucket) {
    return {
      key: objectKey,
      url: `stratus://${env.catalystStratusBucket || "local"}/${objectKey}`,
      stored: false,
    };
  }

  try {
    const bucket = app.stratus().bucket(env.catalystStratusBucket);
    await bucket.putObject(objectKey, body, {
      overwrite: true,
      contentType: params.contentType || "application/octet-stream",
    });

    return {
      key: objectKey,
      url: `stratus://${env.catalystStratusBucket}/${objectKey}`,
      stored: true,
    };
  } catch (error) {
    console.warn("Stratus upload failed; preserving object reference only.", error);
    return {
      key: objectKey,
      url: `stratus://${env.catalystStratusBucket}/${objectKey}`,
      stored: false,
    };
  }
}

export async function submitCatalystJob(payload: CatalystJobPayload, req?: unknown) {
  const app = await getCatalystApp(req);
  const localJobId = `local-${crypto.randomUUID()}`;

  if (!app || !env.catalystJobpoolName) {
    return {
      jobId: localJobId,
      status: "LOCAL_PENDING",
      queuedOnCatalyst: false,
    };
  }

  try {
    const job = await app.jobScheduling().JOB.submitJob({
      job_name: `crime-intel-${payload.kind}-${Date.now()}`,
      jobpool_name: env.catalystJobpoolName,
      target_type: "AppSail",
      target_name: env.catalystAppsailName,
      request_method: "POST",
      url: env.catalystWorkerUrl || "/api/v1/data/jobs/run",
      request_body: JSON.stringify(payload),
      job_config: {
        number_of_retries: 2,
        retry_interval: 120,
      },
    });

    return {
      jobId: job.job_id,
      status: job.job_status,
      queuedOnCatalyst: true,
    };
  } catch (error) {
    console.warn("Catalyst job submission failed; returning local job id.", error);
    return {
      jobId: localJobId,
      status: "LOCAL_PENDING",
      queuedOnCatalyst: false,
    };
  }
}
