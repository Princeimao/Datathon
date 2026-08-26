import { api } from "../services/api";

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function fileHash(file: File): Promise<string> {
  return sha256Hex(await file.arrayBuffer());
}

/**
 * Upload a file directly to object storage via a presigned PUT URL.
 * Returns the object key and the SHA-256 hash of the file.
 */
export async function uploadFileToStorage(
  file: File,
  keyPrefix = "uploads",
): Promise<{ objectKey: string; fileHash: string }> {
  const [res, hash] = await Promise.all([
    api.getSignedUrl({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      keyPrefix,
    }),
    fileHash(file),
  ]);

  const { uploadUrl, objectKey } = res as any;

  if (!uploadUrl) {
    throw new Error("No upload URL returned");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("File upload failed");
  }

  return { objectKey, fileHash: hash };
}

/**
 * Resolve a storage object key into a displayable signed GET url.
 */
export async function resolveObjectUrl(
  objectKey?: string,
): Promise<string | null> {
  if (!objectKey) return null;

  try {
    const res: any = await api.getSignedGetUrl({ objectKey });

    return res?.downloadUrl || null;
  } catch {
    return null;
  }
}
