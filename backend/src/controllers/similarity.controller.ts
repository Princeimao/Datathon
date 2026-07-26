import { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../config/prisma.config";
import { searchImageSimilarity } from "../services/pinecone.service";

export async function searchSimilarity(req: Request, res: Response) {
  try {
    const { type, value, imageUrl, limit = 10 } = req.body;

    const results: any = {
      database: [],
      image: [],
    };

    /**
     * IMAGE SEARCH
     * Only call Pinecone when image exists
     */
    if (imageUrl) {
      results.image = await searchImageSimilarity(imageUrl, Number(limit));
    }

    /**
     * DATABASE SEARCH
     */

    if (!type || !value) {
      return res.json({
        message: "No database search parameters",
        results,
      });
    }

    const filters: Prisma.CaseWhereInput[] = [];

    switch (type) {
      case "phone":
        filters.push({
          phones: {
            some: {
              phone: {
                number: value,
              },
            },
          },
        });

        break;

      case "person":
        filters.push({
          persons: {
            some: {
              person: {
                OR: [
                  {
                    name: {
                      contains: value,
                      mode: "insensitive",
                    },
                  },
                  {
                    aliases: {
                      has: value,
                    },
                  },
                ],
              },
            },
          },
        });

        break;

      case "vehicle":
        filters.push({
          vehicles: {
            some: {
              vehicle: {
                OR: [
                  {
                    registrationNo: {
                      contains: value,
                      mode: "insensitive",
                    },
                  },

                  {
                    make: {
                      contains: value,
                      mode: "insensitive",
                    },
                  },

                  {
                    model: {
                      contains: value,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          },
        });

        break;

      case "location":
        filters.push({
          locations: {
            some: {
              location: {
                address: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            },
          },
        });

        break;

      case "case":
        filters.push(
          {
            title: {
              contains: value,
              mode: "insensitive",
            },
          },

          {
            description: {
              contains: value,
              mode: "insensitive",
            },
          },
        );

        break;

      case "crime":
        filters.push({
          crimeType: value,
        });

        break;

      case "organization":
        filters.push({
          organizations: {
            some: {
              organization: {
                name: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            },
          },
        });

        break;

      default:
        return res.status(400).json({
          message: "Unsupported search type",
        });
    }

    const cases = await prisma.case.findMany({
      where: {
        OR: filters,
      },

      take: Number(limit),

      include: {
        evidences: true,

        persons: {
          include: {
            person: true,
          },
        },

        phones: {
          include: {
            phone: true,
          },
        },

        vehicles: {
          include: {
            vehicle: true,
          },
        },

        locations: {
          include: {
            location: true,
          },
        },

        organizations: {
          include: {
            organization: true,
          },
        },

        modusOperandi: true,
      },
    });

    results.database = cases;

    return res.json({
      query: {
        type,
        value,
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
