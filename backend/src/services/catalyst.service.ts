import crypto from "node:crypto";
import path from "node:path";

import { env } from "../config/env.js";

type CatalystApp = any;
type StratusBucket = any;

export type StratusObject = {
  key: string;
  bucket: string;
};

export type UploadUrlParams = {
  keyPrefix: string;
  fileName: string;
  contentType?: string;
  expiresIn?: number;
};

export type DownloadUrlParams = {
  key: string;
  expiresIn?: number;
  versionId?: string;
};

export type ListObjectsParams = {
  prefix?: string;
  maxKeys?: number;
  nextToken?: string;
  orderBy?: "asc" | "desc";
  folderListing?: boolean;
};

export type BulkUploadItem = {
  fileName: string;
  contentType?: string;
};

export type BulkUploadResult = {
  key: string;
  uploadUrl: string;
  fileName: string;
  contentType: string;
  expiresIn: number;
};

const DEFAULT_UPLOAD_EXPIRY = 300;
const DEFAULT_DOWNLOAD_EXPIRY = 300;

function requireBucketName(): string {
  const bucketName = env.catalystStratusBucket;

  if (!bucketName) {
    throw new Error("CATALYST_STRATUS_BUCKET is not configured");
  }

  return bucketName;
}

/**
 * Lazily initialize Catalyst.
 *
 * This is intentionally not swallowed.
 * If Catalyst is unavailable, storage operations should fail rather
 * than silently pretending that an object was stored.
 */
async function getCatalystApp(req?: unknown): Promise<CatalystApp> {
  const catalyst = await import("zcatalyst-sdk-node");

  const sdk = (catalyst as any).default || catalyst;

  return req ? sdk.initialize(req) : sdk.initialize();
}

/**
 * Get a Stratus bucket instance.
 */
async function getBucket(req?: unknown): Promise<StratusBucket> {
  const app = await getCatalystApp(req);
  const bucketName = requireBucketName();

  return app.stratus().bucket(bucketName);
}

/**
 * Sanitize a user supplied filename.
 */
function sanitizeFileName(fileName: string): string {
  const original = path.basename(fileName);

  return original
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180);
}

/**
 * Generate a safe object key.
 *
 * Example:
 *
 * users/123/images/
 *   1756200000000-uuid-profile.jpg
 */
function createObjectKey(keyPrefix: string, fileName: string): string {
  const cleanPrefix = keyPrefix.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");

  const safeFileName = sanitizeFileName(fileName);

  if (!safeFileName) {
    throw new Error("Invalid file name");
  }

  return [cleanPrefix, `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`]
    .filter(Boolean)
    .join("/");
}

/**
 * Validate a Stratus object key.
 *
 * Catalyst does not support certain characters in object paths.
 */
function validateObjectKey(key: string): void {
  if (!key) {
    throw new Error("Object key is required");
  }

  if (key.includes("\\") || key.includes('"') || key.includes("<")) {
    throw new Error("Invalid object key");
  }

  if (key.includes(">") || key.includes("#") || key.includes("|")) {
    throw new Error("Invalid object key");
  }

  if (key.includes("..")) {
    throw new Error("Invalid object key");
  }
}

/* -------------------------------------------------------------------------- */
/* Upload                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Create a presigned PUT URL.
 *
 * The frontend uses the returned URL to upload the actual file directly
 * to Stratus.
 *
 * Express does NOT receive the file.
 */
export async function createUploadUrl(params: {
  keyPrefix: string;
  fileName: string;
  contentType?: string;
  expiresIn?: number;
  req?: unknown;
}) {
  const {
    keyPrefix,
    fileName,
    contentType = "application/octet-stream",
    expiresIn = DEFAULT_UPLOAD_EXPIRY,
    req,
  } = params;

  const bucketName = requireBucketName();

  const objectKey = createObjectKey(keyPrefix, fileName);

  validateObjectKey(objectKey);

  const bucket = await getBucket(req);

  const result = await bucket.generatePreSignedUrl(objectKey, "PUT", {
    expiryIn: expiresIn,
  });

  return {
    bucket: bucketName,
    key: objectKey,
    uploadUrl: result.signature,
    contentType,
    expiresIn,
  };
}

/**
 * Create presigned upload URLs for multiple files.
 *
 * IMPORTANT:
 * This does NOT upload the files.
 *
 * It creates one URL per file, and the frontend uploads each file
 * directly to Stratus.
 */
export async function createBulkUploadUrls(params: {
  keyPrefix: string;
  files: BulkUploadItem[];
  expiresIn?: number;
  req?: unknown;
}): Promise<BulkUploadResult[]> {
  const { keyPrefix, files, expiresIn = DEFAULT_UPLOAD_EXPIRY, req } = params;

  if (!files.length) {
    return [];
  }

  if (files.length > 100) {
    throw new Error("Maximum 100 files per bulk upload request");
  }

  const bucket = await getBucket(req);

  const results: BulkUploadResult[] = [];

  for (const file of files) {
    const contentType = file.contentType || "application/octet-stream";

    const objectKey = createObjectKey(keyPrefix, file.fileName);

    validateObjectKey(objectKey);

    const result = await bucket.generatePreSignedUrl(objectKey, "PUT", {
      expiryIn: expiresIn,
    });

    results.push({
      key: objectKey,
      uploadUrl: result.signature,
      fileName: file.fileName,
      contentType,
      expiresIn,
    });
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/* Download                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Generate a presigned GET URL.
 *
 * The frontend can use this URL to download/view the object directly.
 */
export async function createDownloadUrl(params: {
  key: string;
  expiresIn?: number;
  versionId?: string;
  req?: unknown;
}) {
  const { key, expiresIn = DEFAULT_DOWNLOAD_EXPIRY, versionId, req } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  const options: Record<string, unknown> = {
    expiryIn: expiresIn,
  };

  if (versionId) {
    options.versionId = versionId;
  }

  const result = await bucket.generatePreSignedUrl(key, "GET", options);

  return {
    bucket: requireBucketName(),
    key,
    downloadUrl: result.signature,
    expiresIn,
    versionId,
  };
}

/**
 * Get the object directly through the backend.
 *
 * Use this when you actually need to process the file on the server.
 *
 * For normal frontend downloads, prefer createDownloadUrl().
 */
export async function getObject(params: {
  key: string;
  versionId?: string;
  range?: string;
  req?: unknown;
}) {
  const { key, versionId, range, req } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  const options: Record<string, unknown> = {};

  if (versionId) {
    options.versionId = versionId;
  }

  if (range) {
    options.range = range;
  }

  return bucket.getObject(
    key,
    Object.keys(options).length ? options : undefined,
  );
}

/* -------------------------------------------------------------------------- */
/* Metadata / existence                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Check whether an object exists.
 */
export async function objectExists(params: { key: string; req?: unknown }) {
  const { key, req } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  try {
    const result = await bucket.headObject(key);

    return {
      exists: true,
      key,
      metadata: result,
    };
  } catch {
    return {
      exists: false,
      key,
    };
  }
}

/**
 * Get object metadata/details.
 *
 * Depending on your installed SDK version, this may return the
 * object details expected by the Catalyst SDK.
 */
export async function getObjectDetails(params: {
  key: string;
  versionId?: string;
  req?: unknown;
}) {
  const { key, versionId, req } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  const object = bucket.object(key);

  if (versionId) {
    return object.getDetails({
      versionId,
    });
  }

  return object.getDetails();
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * List objects in the bucket.
 *
 * Use prefix to emulate folders:
 *
 * users/123/
 * users/456/
 * documents/
 * images/
 */
export async function listObjects(params: {
  prefix?: string;
  maxKeys?: number;
  nextToken?: string;
  orderBy?: "asc" | "desc";
  folderListing?: boolean;
  req?: unknown;
}) {
  const {
    prefix,
    maxKeys = 100,
    nextToken,
    orderBy = "asc",
    folderListing = false,
    req,
  } = params;

  const bucket = await getBucket(req);

  const options: Record<string, unknown> = {
    maxKeys,
    orderBy,
    folderListing: String(folderListing),
  };

  if (prefix) {
    options.prefix = prefix;
  }

  if (nextToken) {
    options.nextToken = nextToken;
  }

  return bucket.listObjects(options);
}

/**
 * Iterate through every object under a prefix.
 *
 * Be careful using this for huge buckets.
 */
export async function listAllObjects(params: {
  prefix?: string;
  maxKeys?: number;
  req?: unknown;
}) {
  const { prefix, maxKeys = 100, req } = params;

  const bucket = await getBucket(req);

  const iterator = bucket.listIterableObjects({
    maxKeys,
    ...(prefix ? { prefix } : {}),
  });

  const objects: unknown[] = [];

  for await (const object of iterator) {
    objects.push(object);
  }

  return objects;
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Delete one object.
 */
export async function deleteObject(params: {
  key: string;
  versionId?: string;
  ttl?: number;
  req?: unknown;
}) {
  const { key, versionId, ttl, req } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  const options: Record<string, unknown> = {};

  if (versionId) {
    options.versionId = versionId;
  }

  if (ttl !== undefined) {
    if (ttl < 60) {
      throw new Error("Delete TTL must be at least 60 seconds");
    }

    options.ttl = ttl;
  }

  return bucket.deleteObject(
    key,
    Object.keys(options).length ? options : undefined,
  );
}

/**
 * Delete multiple objects.
 */
export async function deleteObjects(params: {
  keys: Array<{
    key: string;
    versionId?: string;
  }>;
  ttl?: number;
  req?: unknown;
}) {
  const { keys, ttl, req } = params;

  if (!keys.length) {
    return null;
  }

  if (ttl !== undefined && ttl < 60) {
    throw new Error("Delete TTL must be at least 60 seconds");
  }

  for (const item of keys) {
    validateObjectKey(item.key);
  }

  const bucket = await getBucket(req);

  return bucket.deleteObjects(
    keys.map((item) => ({
      key: item.key,
      ...(item.versionId ? { versionId: item.versionId } : {}),
    })),
    ttl,
  );
}

/**
 * Delete everything under a prefix.
 *
 * Useful for removing a user's directory.
 */
export async function deletePrefix(params: { prefix: string; req?: unknown }) {
  const { prefix, req } = params;

  if (!prefix) {
    throw new Error("Prefix is required");
  }

  const bucket = await getBucket(req);

  return bucket.deletePath(prefix);
}

/* -------------------------------------------------------------------------- */
/* Copy / Move                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Copy an object.
 */
export async function copyObject(params: {
  sourceKey: string;
  destinationKey: string;
  req?: unknown;
}) {
  const { sourceKey, destinationKey, req } = params;

  validateObjectKey(sourceKey);
  validateObjectKey(destinationKey);

  const bucket = await getBucket(req);

  return bucket.copyObject(sourceKey, destinationKey);
}

/**
 * Rename/move an object.
 */
export async function moveObject(params: {
  sourceKey: string;
  destinationKey: string;
  req?: unknown;
}) {
  const { sourceKey, destinationKey, req } = params;

  validateObjectKey(sourceKey);
  validateObjectKey(destinationKey);

  const bucket = await getBucket(req);

  return bucket.renameObject(sourceKey, destinationKey);
}

/* -------------------------------------------------------------------------- */
/* Server-side upload                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Server-side upload.
 *
 * This is intentionally available for internal/background operations.
 *
 * DO NOT use this for normal frontend uploads.
 *
 * Frontend uploads should use createUploadUrl().
 */
export async function putObject(params: {
  key: string;
  body: Buffer | string | NodeJS.ReadableStream;
  contentType?: string;
  overwrite?: boolean;
  ttl?: number;
  req?: unknown;
}) {
  const {
    key,
    body,
    contentType = "application/octet-stream",
    overwrite = false,
    ttl,
    req,
  } = params;

  validateObjectKey(key);

  const bucket = await getBucket(req);

  return bucket.putObject(key, body, {
    overwrite,
    contentType,
    ...(ttl !== undefined ? { ttl } : {}),
  });
}

/* -------------------------------------------------------------------------- */
/* Bulk ingestion helpers                                                     */
/* -------------------------------------------------------------------------- */

export type IngestionObject = {
  key: string;
  fileName: string;
  contentType: string;
};

export type BulkIngestionRequest = {
  keyPrefix: string;
  files: BulkUploadItem[];
  expiresIn?: number;
  req?: unknown;
};

/**
 * Create everything required for a bulk ingestion.
 *
 * The frontend receives one presigned PUT URL per file.
 *
 * Example:
 *
 * 100 files
 *    ↓
 * createBulkIngestion()
 *    ↓
 * 100 signed URLs
 *    ↓
 * frontend uploads directly to Stratus
 */
export async function createBulkIngestion(params: BulkIngestionRequest) {
  const uploadUrls = await createBulkUploadUrls({
    keyPrefix: params.keyPrefix,
    files: params.files,
    expiresIn: params.expiresIn,
    req: params.req,
  });

  return {
    bucket: requireBucketName(),
    total: uploadUrls.length,
    uploads: uploadUrls,
  };
}

/**
 * Verify that all objects from a bulk ingestion exist.
 *
 * This should be called after the frontend reports that its uploads
 * have completed.
 */
export async function verifyBulkIngestion(params: {
  keys: string[];
  req?: unknown;
}) {
  const results = [];

  for (const key of params.keys) {
    const result = await objectExists({
      key,
      req: params.req,
    });

    results.push(result);
  }

  return {
    total: results.length,
    successful: results.filter((item) => item.exists).length,
    missing: results.filter((item) => !item.exists).length,
    objects: results,
  };
}

/* -------------------------------------------------------------------------- */
/* Convenience helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Create a stable application-level object reference.
 *
 * Store the key in your DB, NOT the temporary presigned URL.
 */
export function createObjectReference(key: string) {
  return {
    bucket: requireBucketName(),
    key,
  };
}

/* -------------------------------------------------------------------------- */
/* Media / evidence upload helpers                                            */
/* -------------------------------------------------------------------------- */

/**
 * Upload a base64 encoded media file (image / video / document) to Stratus.
 * Returns the object key and a signed download URL.
 */
export async function uploadToStratus(params: {
  keyPrefix?: string;
  fileName: string;
  contentType?: string;
  base64: string;
  req?: unknown;
}): Promise<{ key: string; url: string; stored: boolean }> {
  const {
    keyPrefix = "evidence/media",
    fileName,
    contentType = "application/octet-stream",
    base64,
    req,
  } = params;

  const key = createObjectKey(keyPrefix, fileName);

  validateObjectKey(key);

  const bucket = await getBucket(req);

  await bucket.putObject(key, Buffer.from(base64, "base64"), {
    overwrite: true,
    contentType,
  });

  const { downloadUrl } = await createDownloadUrl({ key, req });

  return {
    key,
    url: downloadUrl,
    stored: true,
  };
}
