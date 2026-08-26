import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../config/prisma.config.js";

/**
 * Lightweight include used when listing search results.
 * Loads the core relations needed to summarize a case match.
 */
export const CASE_SEARCH_INCLUDE = {
  caseCategory: true,
  caseStatus: true,
  crimeMajorHead: true,
  crimeMinorHead: true,

  policeUnit: {
    include: {
      state: true,
      district: true,
    },
  },

  modusOperandi: true,

  evidences: {
    include: {
      uploadedBy: true,
    },
  },

  persons: {
    include: {
      person: {
        include: {
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
          addresses: {
            include: {
              location: true,
            },
          },
          organizations: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  },

  phones: {
    include: {
      phone: {
        include: {
          owners: {
            include: {
              person: true,
            },
          },
        },
      },
    },
  },

  vehicles: {
    include: {
      vehicle: {
        include: {
          owners: {
            include: {
              person: true,
            },
          },
        },
      },
    },
  },

  locations: {
    include: {
      location: {
        include: {
          district: true,
          policeUnit: true,
        },
      },
    },
  },

  organizations: {
    include: {
      organization: {
        include: {
          members: {
            include: {
              person: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CaseInclude;

/**
 * Full include used for the investigation view.
 * Adds historical case involvement and arrest/chargesheet records.
 */
export const CASE_INVESTIGATION_INCLUDE = {
  ...CASE_SEARCH_INCLUDE,

  court: true,

  actSections: {
    include: {
      act: true,
      section: true,
    },
  },

  arrestSurrenders: {
    include: {
      accused: {
        include: {
          person: true,
        },
      },
    },
  },

  chargesheets: true,
} satisfies Prisma.CaseInclude;

export async function findCases(params: {
  where?: Prisma.CaseWhereInput;
  take?: number;
  skip?: number;
  include?: Prisma.CaseInclude;
}) {
  const {
    where,
    take = 20,
    skip = 0,
    include = CASE_SEARCH_INCLUDE,
  } = params;

  return prisma.case.findMany({
    where,
    take,
    skip,
    include,
    orderBy: {
      crimeRegisteredDate: "desc",
    },
  });
}

export async function getCaseInvestigation(caseId: string) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: CASE_INVESTIGATION_INCLUDE,
  });
}
