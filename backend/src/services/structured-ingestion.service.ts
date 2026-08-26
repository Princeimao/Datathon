import { prisma } from "../config/prisma.config.js";
import type {
  CrimeExtractionResult,
  EvidenceExtraction,
} from "../types.js";
import { relationshipService } from "./relationship.service.js";
import {
  createDownloadUrl,
  uploadToStratus,
} from "./catalyst.service.js";
import { indexCaseForSearch } from "./pinecone.service.js";
import { enrollFaceForPerson } from "./luxand.service.js";

export type MediaCategory =
  | "evidence"
  | "suspect"
  | "weapon"
  | "victim"
  | "location"
  | "document"
  | "other";

export type StructuredMediaItem = {
  objectKey?: string;
  base64?: string;
  fileName?: string;
  contentType?: string;
  category?: MediaCategory;
  label?: string;
  description?: string;
  personName?: string;
  details?: string;
  fileHash?: string;
};

export type StructuredIngestPayload = {
  case?: Partial<CrimeExtractionResult["case"]>;
  persons?: CrimeExtractionResult["persons"];
  phones?: CrimeExtractionResult["phones"];
  vehicles?: CrimeExtractionResult["vehicles"];
  locations?: CrimeExtractionResult["locations"];
  organizations?: CrimeExtractionResult["organizations"];
  modusOperandi?: CrimeExtractionResult["modusOperandi"];
  relationships?: CrimeExtractionResult["relationships"];
  statement?: string;
  media?: StructuredMediaItem[];
};

const FACE_CATEGORIES = ["suspect", "victim"];

function categoryPrefix(category?: string): string {
  if (category === "weapon" || category === "victim") {
    return "evidence/images";
  }

  if (category === "location") {
    return "evidence/locations";
  }

  if (category === "document") {
    return "evidence/documents";
  }

  if (category === "suspect") {
    return "evidence/suspects";
  }

  return "evidence/media";
}

function mediaEvidenceType(contentType?: string, category?: string) {
  const mime = (contentType || "").toLowerCase();

  if (mime.startsWith("video/")) {
    return "VIDEO" as const;
  }

  if (mime.startsWith("image/")) {
    return "IMAGE" as const;
  }

  if (
    mime.includes("pdf") ||
    mime.includes("text/") ||
    mime.includes("document")
  ) {
    return "DOCUMENT" as const;
  }

  if (category === "weapon" || category === "evidence") {
    return "PHYSICAL" as const;
  }

  return "OTHER" as const;
}

async function resolveMediaEvidence(
  item: StructuredMediaItem,
): Promise<EvidenceExtraction> {
  const { objectKey, base64, fileName, contentType, category } = item;

  let key = objectKey;
  let fileUrl = key || "";

  if (!key && base64) {
    const uploaded = await uploadToStratus({
      keyPrefix: categoryPrefix(category),
      fileName: fileName || "evidence",
      contentType,
      base64,
    });

    key = uploaded.key;
    fileUrl = uploaded.url;
  } else if (key) {
    try {
      const { downloadUrl } = await createDownloadUrl({
        key,
      });

      fileUrl = downloadUrl;
    } catch {
      // Fall back to the raw key so evidence records always have a value.
    }
  }

  const label =
    item.label ||
    (category ? `${category} media` : "Media evidence") ||
    fileName ||
    "Evidence";

  const details = [item.details, item.description]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    type: mediaEvidenceType(contentType, category) as string,
    title: label,
    description:
      details || `Uploaded ${category || "media"} evidence${personSuffix(item)}`,
    confidence: 0.9,
    fileUrl,
    mimeType: contentType,
    fileName,
    fileHash: item.fileHash,
    extractedData: {
      storageKey: key,
      category: category || "other",
      mediaType: mediaEvidenceType(contentType, category),
      mentionedPerson: item.personName || null,
    },
    aiClassification: {
      category: category || "other",
      label,
    },
  };
}

function personSuffix(item: StructuredMediaItem): string {
  return item.personName ? ` mentioning ${item.personName}` : "";
}

export async function ingestStructuredPayload(
  payload: StructuredIngestPayload,
) {
  const media = payload.media || [];
  const statement = payload.statement?.trim();

  const evidence: EvidenceExtraction[] = [];

  for (const item of media) {
    evidence.push(await resolveMediaEvidence(item));
  }

  if (statement) {
    evidence.push({
      type: "DOCUMENT",
      title: "Statement",
      description: statement,
      confidence: 1,
      fileUrl: "typed://statement",
      fileName: null,
      extractedData: {
        kind: "statement",
        source: "manual-entry",
      },
      aiClassification: {
        category: "statement",
        label: "Statement",
      },
    });
  }

  const extraction: CrimeExtractionResult = {
    case: {
      caseNumber: payload.case?.caseNumber || null,
      crimeNo: payload.case?.crimeNo,
      caseNo: payload.case?.caseNo,
      title: payload.case?.title || "Untitled Case",
      crimeType: payload.case?.crimeType || "OTHER",
      incidentDate: payload.case?.incidentDate || null,
      incidentFromDate: payload.case?.incidentFromDate,
      incidentToDate: payload.case?.incidentToDate,
      location: payload.case?.location || null,
      description:
        payload.case?.description ||
        (statement ? `Statement: ${statement}` : null),
      caseStatus: payload.case?.caseStatus || "OPEN",
    },
    persons: payload.persons || [],
    phones: payload.phones || [],
    vehicles: payload.vehicles || [],
    locations: payload.locations || [],
    evidence,
    organizations: payload.organizations || [],
    modusOperandi: payload.modusOperandi || null,
    relationships: payload.relationships || [],
  };

  const createdCase = await relationshipService(extraction);

  if (!createdCase) {
    throw new Error("Unable to create case from structured payload.");
  }

  // Best-effort: index the case summary for vector search.
  try {
    const summary = JSON.stringify({
      case: extraction.case,
      persons: extraction.persons.map((person) => person.name),
      phones: extraction.phones.map((phone) => phone.number),
      vehicles: extraction.vehicles.map((vehicle) => vehicle.registrationNumber),
      evidence: evidence.map((ev) => `${ev.title} ${ev.description}`),
    });

    await indexCaseForSearch({
      caseId: createdCase.id,
      text: summary,
    });
  } catch (error) {
    console.warn("Vector indexing skipped for structured case.", error);
  }

  // Best-effort: enroll faces (suspect/victim media linked to a person) into
  // Luxand so future face searches can resolve back to this case.
  const faceMedia = media.filter(
    (item) =>
      FACE_CATEGORIES.includes(item.category || "") &&
      (item.objectKey || item.base64) &&
      item.personName,
  );

  for (const item of faceMedia) {
    try {
      const person = await prisma.person.findFirst({
        where: {
          name: item.personName as string,
        },
        select: { id: true },
      });

      if (person) {
        await enrollFaceForPerson({
          personId: person.id,
          caseId: createdCase.id,
          imageKey: item.objectKey,
          base64: item.base64,
          subject: `${person.id}`,
          imageUrl: undefined,
        });
      }
    } catch (error) {
      console.warn("Face enrollment skipped for structured media.", error);
    }
  }

  return {
    caseId: createdCase.id,
    caseNumber: createdCase.caseNumber,
    personsCreated: extraction.persons.length,
    evidenceCreated: evidence.length,
  };
}
