import { prisma } from "../config/prisma.config.js";
import type { EvidenceExtraction, PersonExtraction, VehicleExtraction } from "../types.js";
import { uploadToStratus } from "./catalyst.service.js";
import { embedText, vectorId } from "./ollama.service.js";

export type IntakeFile = {
  fileName: string;
  contentType: string;
  base64: string;
  label?: string;
  personName?: string;
  details?: string;
};

export type MediaIntelligence = {
  evidence: EvidenceExtraction[];
  persons: PersonExtraction[];
  vehicles: VehicleExtraction[];
};

function isImage(contentType = "") {
  return contentType.startsWith("image/");
}

function isVideo(contentType = "") {
  return contentType.startsWith("video/");
}

function extractRegistration(text = "") {
  return text.match(/\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/i)?.[0]?.replace(/\s+/g, "").toUpperCase() || null;
}

function extractColor(text = "") {
  const colors = ["black", "white", "red", "blue", "silver", "grey", "gray", "green", "yellow", "brown"];
  return colors.find((color) => text.toLowerCase().includes(color)) || null;
}

export async function analyzeMediaFiles(files: IntakeFile[] = [], req?: unknown): Promise<MediaIntelligence> {
  const intelligence: MediaIntelligence = {
    evidence: [],
    persons: [],
    vehicles: [],
  };

  for (const file of files) {
    const stored = await uploadToStratus({
      keyPrefix: isVideo(file.contentType) ? "evidence/videos" : "evidence/images",
      fileName: file.fileName,
      contentType: file.contentType,
      base64: file.base64,
      req,
    });

    const detailText = [file.label, file.personName, file.details, file.fileName].filter(Boolean).join(" ");
    const entityKind = isVideo(file.contentType) ? "video" : isImage(file.contentType) ? "image" : "document";
    const embedding = await embedText(`${entityKind} ${detailText}`);
    const mediaVectorId = vectorId("media", `${stored.key}:${detailText}`);

    await prisma.embedding.create({
      data: {
        entityType: entityKind,
        entityId: stored.key,
        vectorId: mediaVectorId,
      },
    }).catch(() => null);

    intelligence.evidence.push({
      type: isVideo(file.contentType) ? "VIDEO" : isImage(file.contentType) ? "IMAGE" : "DIGITAL",
      description:
        file.details ||
        file.label ||
        `${entityKind} evidence with ${embedding.length} embedding dimensions`,
      confidence: 0.72,
      fileUrl: stored.url,
      extractedData: {
        storageKey: stored.key,
        storedInStratus: stored.stored,
        vectorId: mediaVectorId,
        mediaType: entityKind,
        mentionedPerson: file.personName || null,
      },
    });

    if (file.personName) {
      intelligence.persons.push({
        name: file.personName,
        role: "SUSPECT",
        age: null,
        gender: null,
        aliases: [],
        confidence: 0.78,
      });
    }

    const registrationNumber = extractRegistration(detailText);
    const color = extractColor(detailText);
    if (registrationNumber || color) {
      intelligence.vehicles.push({
        registrationNumber,
        color,
        type: null,
        confidence: registrationNumber ? 0.82 : 0.55,
      });
    }
  }

  return intelligence;
}
