import axios from "axios";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.config.js";
import { createDownloadUrl } from "./catalyst.service.js";

/**
 * Luxand Cloud Face API client.
 *
 * Luxand stores neural-network face templates under named "subjects". We use
 * the subject identifier as the Luxand face token and store it in the
 * FaceRecord table (it is an identifier, NOT a vector embedding).
 *
 * Docs: https://luxand.cloud/face-api
 */
const LUXAND_BASE = "https://api.luxand.cloud";

const http = axios.create({
  baseURL: LUXAND_BASE,
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  if (!env.luxandToken) {
    throw new Error("LUXAND_TOKEN is not configured");
  }

  config.headers = config.headers || {};
  config.headers.token = env.luxandToken;

  return config;
});

export type LuxandCandidate = {
  subject_id?: string;
  name?: string;
  probability?: number;
};

export type LuxandDetectedFace = {
  face?: { top?: number; left?: number; width?: number; height?: number };
  candidates?: LuxandCandidate[];
};

export type LuxandEnrollResult = {
  status?: string;
  subject_id?: string;
  faces?: LuxandDetectedFace[];
};

export type LuxandRecognizeResult = {
  status?: string;
  result?: Array<{ faces?: LuxandDetectedFace[] }>;
};

/**
 * Enroll / store a face template under a Luxand subject.
 * `photo` may be a URL (e.g. a Stratus signed GET url) or base64 string.
 */
export async function luxandEnroll(params: {
  photo: string;
  subject?: string;
}): Promise<LuxandEnrollResult> {
  const { photo, subject } = params;

  const body = new URLSearchParams();
  body.set("photo", photo);
  body.set("store", "1");

  if (subject) {
    body.set("subject", subject);
  }

  const response = await http.post("/photo", body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data as LuxandEnrollResult;
}

/**
 * Recognize faces in a photo and return the closest stored subjects.
 */
export async function luxandRecognize(params: {
  photo: string;
}): Promise<LuxandRecognizeResult> {
  const body = new URLSearchParams();
  body.set("photo", params.photo);

  const response = await http.post("/recognize", body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data as LuxandRecognizeResult;
}

/**
 * List all Luxand subjects (face templates currently stored).
 */
export async function luxandListSubjects() {
  const response = await http.get("/subjects");

  return response.data?.subjects ?? [];
}

/**
 * Resolve the raw photo source into something Luxand accepts:
 * - direct URL (imageUrl) is used as-is
 * - Stratus objectKey is resolved into a signed GET URL
 * - base64 string is passed through
 */
async function resolvePhoto(params: {
  imageUrl?: string;
  imageKey?: string;
  base64?: string;
}): Promise<string> {
  if (params.imageUrl) {
    return params.imageUrl;
  }

  if (params.imageKey) {
    const { downloadUrl } = await createDownloadUrl({
      key: params.imageKey,
    });

    return downloadUrl;
  }

  if (params.base64) {
    return params.base64;
  }

  throw new Error("No face image provided");
}

/**
 * Enroll a face for a person and store the Luxand token + Stratus reference
 * in a FaceRecord so a future search can resolve back to the person/case.
 */
export async function enrollFaceForPerson(params: {
  personId: string;
  caseId?: string;
  evidenceId?: string;
  subject?: string;
  imageUrl?: string;
  imageKey?: string;
  base64?: string;
}) {
  const {
    personId,
    caseId,
    evidenceId,
    subject = personId,
    imageUrl,
    imageKey,
    base64,
  } = params;

  const photo = await resolvePhoto({ imageUrl, imageKey, base64 });

  const enrolled = await luxandEnroll({
    photo,
    subject,
  });

  const luxandSubjectId = enrolled.subject_id || subject;

  const face = enrolled.faces?.[0];

  const faceRecord = await prisma.faceRecord.create({
    data: {
      personId,
      caseId: caseId || null,
      evidenceId: evidenceId || null,
      luxandSubjectId,
      luxandFaceId: luxandSubjectId,
      imageKey: imageKey || null,
      imageUrl: imageUrl || null,
      confidence: face?.candidates?.[0]?.probability ?? null,
      metadata: {
        faceBox: face?.face || null,
        status: enrolled.status || null,
      },
    },
  });

  return faceRecord;
}

/**
 * Search faces using Luxand and resolve the matched subject tokens back to
 * persons, cases and original Stratus images stored in FaceRecord.
 */
export async function searchFaces(params: {
  imageUrl?: string;
  imageKey?: string;
  base64?: string;
  minProbability?: number;
}) {
  const { minProbability = 0.5 } = params;

  const photo = await resolvePhoto({
    imageUrl: params.imageUrl,
    imageKey: params.imageKey,
    base64: params.base64,
  });

  const recognized = await luxandRecognize({ photo });

  const subjectScores = new Map<string, number>();

  (recognized.result || []).forEach((entry) => {
    (entry.faces || []).forEach((face) => {
      (face.candidates || []).forEach((candidate) => {
        const subjectId = candidate.subject_id || candidate.name;

        if (!subjectId) {
          return;
        }

        const probability = Number(candidate.probability || 0);

        if (probability < minProbability) {
          return;
        }

        const current = subjectScores.get(subjectId) || 0;

        subjectScores.set(subjectId, Math.max(current, probability));
      });
    });
  });

  const subjectIds = [...subjectScores.keys()];

  if (!subjectIds.length) {
    return [];
  }

  const faceRecords = await prisma.faceRecord.findMany({
    where: {
      luxandSubjectId: { in: subjectIds },
    },
    include: {
      person: true,
      case: {
        include: {
          caseStatus: true,
          crimeMajorHead: true,
          crimeMinorHead: true,
        },
      },
      evidence: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const matches = faceRecords.map((record) => ({
    faceRecord: {
      id: record.id,
      personId: record.personId,
      caseId: record.caseId,
      evidenceId: record.evidenceId,
      luxandSubjectId: record.luxandSubjectId,
      imageKey: record.imageKey,
      imageUrl: record.imageUrl,
    },
    person: record.person,
    case: record.case,
    evidence: record.evidence,
    probability: subjectScores.get(record.luxandSubjectId || "") || 0,
  }));

  matches.sort((a, b) => b.probability - a.probability);

  return matches;
}
