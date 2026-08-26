import crypto from "node:crypto";
import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.config.js";
import { searchSimilarCases } from "../services/pinecone.service.js";
import { searchFaces } from "../services/luxand.service.js";
import {
  findCases,
  getCaseInvestigation,
  CASE_SEARCH_INCLUDE,
} from "../services/case-investigation.service.js";
import { createDownloadUrl } from "../services/catalyst.service.js";

/**
 * Resolve the query image source.
 *
 * Accepts a direct imageUrl, an objectKey that gets converted into a signed
 * GET url, or a raw base64 data URL.
 */
async function resolveImageUrl(
  imageUrl?: string,
  objectKey?: string,
): Promise<string | null> {
  if (imageUrl) {
    return imageUrl;
  }

  if (objectKey) {
    try {
      const { downloadUrl } = await createDownloadUrl({
        key: objectKey,
      });

      return downloadUrl;
    } catch (error) {
      console.error("Unable to resolve image object key:", error);
    }
  }

  return null;
}

/**
 * Match cases whose stored evidence media has the exact same SHA-256 hash as
 * the uploaded probe image (visual duplicate / near-duplicate detection).
 */
async function matchCasesByImageHash(
  imageHash?: string,
  imageUrl?: string,
): Promise<any[]> {
  let hash = imageHash;

  if (!hash && imageUrl) {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        return [];
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      hash = crypto.createHash("sha256").update(buffer).digest("hex");
    } catch {
      return [];
    }
  }

  if (!hash) {
    return [];
  }

  const evidences = await prisma.evidence.findMany({
    where: {
      fileHash: hash,
    },
    select: {
      caseId: true,
    },
  });

  const caseIds = [...new Set(evidences.map((evidence) => evidence.caseId))];

  if (!caseIds.length) {
    return [];
  }

  return findCases({
    where: {
      id: { in: caseIds },
    },
    take: 20,
  });
}

async function enrichImageHits(hits: any[], limit: number) {
  const caseIds = [
    ...new Set(
      hits
        .map((hit) => hit.caseId)
        .filter(Boolean) as string[],
    ),
  ];

  if (!caseIds.length) {
    return [];
  }

  const cases = await findCases({
    where: {
      id: { in: caseIds },
    },
    take: limit,
  });

  return cases.map((caseItem) => {
    const matchingHits = hits.filter((hit) => hit.caseId === caseItem.id);

    const bestScore = Math.max(
      0,
      ...matchingHits.map((hit) => Number(hit.score || 0)),
    );

    return {
      ...caseItem,
      _score: bestScore,
      _matchedBy: "VECTOR_SIMILARITY",
      _evidenceMatches: matchingHits
        .filter((hit) => hit.evidenceId)
        .map((hit) => ({ evidenceId: hit.evidenceId, score: hit.score })),
    };
  });
}

/**
 * Enrich Luxand face-search matches into full case objects so the frontend can
 * render an investigation view for every matched person/case.
 */
async function enrichFaceMatches(matches: any[], limit: number) {
  const caseIds = [
    ...new Set(
      matches
        .map((match) => match.case?.id)
        .filter(Boolean) as string[],
    ),
  ];

  if (!caseIds.length) {
    return [];
  }

  const cases = await findCases({
    where: {
      id: { in: caseIds },
    },
    take: limit,
  });

  return cases.map((caseItem) => {
    const caseMatches = matches.filter(
      (match) => match.case?.id === caseItem.id,
    );

    const bestScore = Math.max(
      0,
      ...caseMatches.map((match) => Number(match.probability || 0)),
    );

    return {
      ...caseItem,
      _score: bestScore,
      _matchedBy: "FACE_MATCH",
      _faceMatches: caseMatches.map((match) => ({
        personId: match.person?.id,
        personName: match.person?.name,
        probability: match.probability,
        faceRecordId: match.faceRecord?.id,
        imageKey: match.faceRecord?.imageKey,
        evidenceId: match.evidence?.id,
      })),
    };
  });
}

/**
 * Build the Prisma filter for a structured database search.
 */
function buildDatabaseFilters(
  type: string,
  value: string,
): Prisma.CaseWhereInput | null {
  const contains = (field: string) =>
    ({
      contains: value,
      mode: "insensitive",
    } as const);

  switch (type) {
    case "phone":
      return {
        phones: {
          some: {
            phone: {
              number: contains("number"),
            },
          },
        },
      };

    case "person":
      return {
        persons: {
          some: {
            person: {
              OR: [
                { name: contains("name") },
                { aliases: { has: value } },
                {
                  caseRoles: {
                    some: {
                      notes: contains("notes"),
                    },
                  },
                },
              ],
            },
          },
        },
      };

    case "statement":
      return {
        OR: [
          { description: contains("description") },
          {
            evidences: {
              some: {
                OR: [
                  { description: contains("description") },
                  { title: contains("title") },
                ],
              },
            },
          },
          {
            persons: {
              some: {
                notes: contains("notes"),
              },
            },
          },
        ],
      };

    case "evidence":
      return {
        evidences: {
          some: {
            OR: [
              { title: contains("title") },
              { description: contains("description") },
              { fileName: contains("fileName") },
            ],
          },
        },
      };

    case "vehicle":
      return {
        vehicles: {
          some: {
            vehicle: {
              OR: [
                { registrationNo: contains("registrationNo") },
                { make: contains("make") },
                { model: contains("model") },
                { color: contains("color") },
              ],
            },
          },
        },
      };

    case "location":
      return {
        locations: {
          some: {
            location: {
              OR: [
                { address: contains("address") },
                { districtName: contains("districtName") },
                { stationName: contains("stationName") },
              ],
            },
          },
        },
      };

    case "case":
      return {
        OR: [
          { title: contains("title") },
          { description: contains("description") },
          { caseNumber: contains("caseNumber") },
          { crimeNo: contains("crimeNo") },
          { caseNo: contains("caseNo") },
        ],
      };

    case "crime":
      return {
        OR: [
          {
            crimeMinorHead: {
              is: {
                crimeHeadName: contains("crimeHeadName"),
              },
            },
          },
          {
            crimeMajorHead: {
              is: {
                crimeGroupName: contains("crimeGroupName"),
              },
            },
          },
        ],
      };

    case "mo":
      return {
        modusOperandi: {
          is: {
            OR: [
              { name: contains("name") },
              { description: contains("description") },
            ],
          },
        },
      };

    case "organization":
      return {
        organizations: {
          some: {
            organization: {
              name: contains("name"),
            },
          },
        },
      };

    default:
      return null;
  }
}

export async function searchSimilarity(req: Request, res: Response) {
  try {
    const {
      type,
      value,
      imageUrl,
      objectKey,
      imageHash,
      combinedType,
      limit = 10,
    } = req.body;

    const results: any = {
      database: [],
      image: [],
      related: [],
    };

    const resolvedImageUrl = await resolveImageUrl(imageUrl, objectKey);

    /**
     * IMAGE SEARCH
     *
     * Faces are searched through the Luxand Cloud Face API and enriched back
     * into full case objects. SHA-256 matching is kept as an exact media
     * (duplicate image) signal.
     */
    if (resolvedImageUrl) {
      const [faceMatches, hashMatches] = await Promise.allSettled([
        searchFaces({
          imageUrl: resolvedImageUrl,
          minProbability: 0.5,
        }),
        matchCasesByImageHash(imageHash, resolvedImageUrl),
      ]);

      const imageCases: any[] = [];

      if (faceMatches.status === "fulfilled") {
        imageCases.push(
          ...(await enrichFaceMatches(faceMatches.value || [], Number(limit))),
        );
      }

      if (hashMatches.status === "fulfilled") {
        imageCases.push(
          ...(hashMatches.value || []).map((caseItem: any) => ({
            ...caseItem,
            _score: 1,
            _matchedBy: "IMAGE_HASH",
          })),
        );
      }

      const seen = new Set<string>();
      const uniqueImageCases = imageCases.filter((caseItem) => {
        if (seen.has(caseItem.id)) {
          return false;
        }

        seen.add(caseItem.id);

        return true;
      });

      results.image = uniqueImageCases.slice(0, Number(limit));
    }

    /**
     * DATABASE SEARCH
     *
     * When an image search is combined with a structured field query, the
     * structured filter is driven by `combinedType`.
     */
    const dbType = combinedType || type;
    const dbValue = value;

    if (dbType && dbValue) {
      const filter = buildDatabaseFilters(dbType, dbValue);

      if (!filter) {
        return res.status(400).json({
          message: "Unsupported search type",
        });
      }

      const cases = await findCases({
        where: filter,
        take: Number(limit),
      });

      results.database = cases;
    }

    /**
     * VECTOR SEARCH OVER CASE SUMMARIES
     */
    if (dbType === "statement" && dbValue) {
      try {
        const textHits = await searchSimilarCases(value, Number(limit));

        const textCases = await enrichImageHits(textHits, Number(limit));

        results.related = textCases;
      } catch {
        results.related = [];
      }
    }

    return res.json({
      query: {
        type: type || null,
        value: value || null,
        hasImage: Boolean(resolvedImageUrl),
      },
      results,
    });
  } catch (error) {
    console.error("Similarity search error:", error);

    return res.status(500).json({
      message: "Search failed",
    });
  }
}

/**
 * Full investigation view for a matched person / case.
 */
export async function getInvestigation(req: Request, res: Response) {
  try {
    const caseId = req.params.caseId as string;

    const investigation = await getCaseInvestigation(caseId);

    if (!investigation) {
      return res.status(404).json({
        message: "Case not found",
      });
    }

    return res.json({
      case: investigation,
    });
  } catch (error) {
    console.error("Investigation error:", error);

    return res.status(500).json({
      message: "Unable to load investigation",
    });
  }
}
