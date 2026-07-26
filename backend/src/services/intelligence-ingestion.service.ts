import { prisma } from "../config/prisma.config.js";
import type { CrimeExtractionResult } from "../types.js";
import { processService } from "./process.service.js";
import { relationshipService } from "./relationship.service.js";
import { analyzeMediaFiles, type IntakeFile } from "./media-intelligence.service.js";
import { submitCatalystJob } from "./catalyst.service.js";
import { embedText, vectorId } from "./ollama.service.js";

type IngestPayload = {
  firText?: string;
  firImage?: IntakeFile;
  media?: IntakeFile[];
  officerId?: string;
  async?: boolean;
};

const emptyExtraction = (): CrimeExtractionResult => ({
  case: {
    caseNumber: null,
    title: "Untitled FIR Intake",
    crimeType: "OTHER",
    incidentDate: null,
    location: null,
    description: null,
    caseStatus: "OPEN",
  },
  persons: [],
  phones: [],
  vehicles: [],
  locations: [],
  evidence: [],
  organizations: [],
  modusOperandi: null,
  relationships: [],
});

function mergeExtraction(base: CrimeExtractionResult, extra: Partial<CrimeExtractionResult>) {
  return {
    ...base,
    ...extra,
    case: { ...base.case, ...(extra.case || {}) },
    persons: [...(base.persons || []), ...(extra.persons || [])],
    phones: [...(base.phones || []), ...(extra.phones || [])],
    vehicles: [...(base.vehicles || []), ...(extra.vehicles || [])],
    locations: [...(base.locations || []), ...(extra.locations || [])],
    evidence: [...(base.evidence || []), ...(extra.evidence || [])],
    organizations: [...(base.organizations || []), ...(extra.organizations || [])],
    relationships: [...(base.relationships || []), ...(extra.relationships || [])],
    modusOperandi: extra.modusOperandi || base.modusOperandi,
  };
}

export async function ingestFirPayload(payload: IngestPayload, req?: unknown) {
  if (payload.async) {
    const job = await submitCatalystJob({ kind: "single-ingestion", payload: { ...payload, async: false } }, req);
    return {
      queued: true,
      ...job,
    };
  }

  const firText = payload.firText || payload.firImage?.details || payload.firImage?.label || "";
  const extracted = (firText ? await processService(firText) : null) || emptyExtraction();
  if (firText && !extracted.case.description) extracted.case.description = firText;

  const mediaFiles = [payload.firImage, ...(payload.media || [])].filter(Boolean) as IntakeFile[];
  const media = await analyzeMediaFiles(mediaFiles, req);
  const merged = mergeExtraction(extracted, {
    evidence: media.evidence,
    persons: media.persons,
    vehicles: media.vehicles,
  });

  const createdCase = await relationshipService(merged);
  if (!createdCase) {
    throw new Error("Unable to create intelligence graph from FIR payload.");
  }

  const summaryEmbedding = await embedText(JSON.stringify({
    case: merged.case,
    persons: merged.persons.map((person) => person.name),
    phones: merged.phones.map((phone) => phone.number),
    vehicles: merged.vehicles.map((vehicle) => vehicle.registrationNumber),
  }));

  await prisma.embedding.create({
    data: {
      entityType: "case",
      entityId: createdCase.id,
      vectorId: vectorId("case", `${createdCase.id}:${summaryEmbedding.slice(0, 12).join(",")}`),
    },
  }).catch(() => null);

  return {
    queued: false,
    caseId: createdCase.id,
    caseNumber: createdCase.caseNumber,
    extracted: merged,
    mediaEvidenceCount: media.evidence.length,
  };
}

export async function ingestBulkPayload(payload: any, req?: unknown) {
  const records = Array.isArray(payload.records)
    ? payload.records
    : payload.content
      ? String(payload.content).split(/\n\s*\n/).filter(Boolean).map((firText) => ({ firText }))
      : [];

  const job = await submitCatalystJob({ kind: "bulk-ingestion", payload }, req);

  if (payload.async !== false) {
    return {
      queued: true,
      totalRecords: records.length,
      ...job,
    };
  }

  const results = [];
  for (const record of records) {
    results.push(await ingestFirPayload({ ...record, async: false }, req));
  }

  return {
    queued: false,
    totalRecords: records.length,
    processed: results.length,
    results,
  };
}
