import { Request, Response } from "express";
import { prisma } from "../config/prisma.config.js";
import { CASE_SEARCH_INCLUDE } from "../services/case-investigation.service.js";

const getCrimeType = (c: any) => {
  if (c.crimeMinorHead?.crimeHeadName) {
    return c.crimeMinorHead.crimeHeadName;
  }

  if (c.crimeMajorHead?.crimeGroupName) {
    return c.crimeMajorHead.crimeGroupName;
  }

  return "Unknown";
};

const getIncidentDate = (c: any) => {
  return c.incidentFromDate || c.crimeRegisteredDate;
};

/**
 * ============================================================
 * SHARED INTELLIGENCE FILTERS
 * ============================================================
 *
 * These helpers are used by /map-data and /dashboard-summary so that every
 * intelligence filter (state, district, police station, crime type, time,
 * year, date range, risk level, minimum cases, MO confidence, MO patterns
 * and active alerts) drives the backend query rather than frontend-only
 * filtering.
 */

const MO_PATTERNS = [
  "HELMET_MASKED_RIDERS",
  "NIGHT_OPERATIONS",
  "STOLEN_VEHICLE_USAGE",
  "ATM_TARGET_SELECTION",
  "TWO_PERSON_TEAM",
  "ESCAPE_ROUTE_SIMILARITY",
] as const;

function timeOfDayBuckets(): Record<string, [number, number]> {
  return {
    Morning: [6, 12],
    Afternoon: [12, 18],
    Evening: [18, 22],
    Night: [22, 24],
  };
}

function getCaseHour(c: any): number {
  const date = new Date(getIncidentDate(c));

  return Number.isNaN(date.getTime()) ? -1 : date.getHours();
}

function matchesTimeOfDay(c: any, timeOfDay?: string): boolean {
  if (!timeOfDay || timeOfDay === "All Day") {
    return true;
  }

  const bucket = timeOfDayBuckets()[timeOfDay];

  if (!bucket) {
    return true;
  }

  const hour = getCaseHour(c);

  const [from, to] = bucket;

  if (from === 22) {
    // Night wraps across midnight: 22:00 - 06:00
    return hour >= from || hour < to - 18;
  }

  return hour >= from && hour < to;
}

function matchesYear(c: any, year?: string): boolean {
  if (!year || year === "All Years") {
    return true;
  }

  return new Date(getIncidentDate(c)).getFullYear() === Number(year);
}

function normalizeCrimeType(value: string): string {
  return value.toLowerCase().replace(/[\s_]+/g, "");
}

/**
 * Treat "all" style sentinel values as "no filter".
 */
function isUnset(value?: string): boolean {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "" ||
    normalized === "all" ||
    normalized === "all states" ||
    normalized === "all districts" ||
    normalized === "all cities" ||
    normalized === "all stations" ||
    normalized === "all crime types" ||
    normalized === "all risk levels" ||
    normalized === "all day" ||
    normalized === "all layers" ||
    normalized === "all years"
  );
}

function buildCaseWhere(query: any): any {
  const andConditions: any[] = [];

  const crimeTypeFilter = query.crimeType as string | undefined;

  if (!isUnset(crimeTypeFilter)) {
    andConditions.push({
      OR: [
        {
          crimeMajorHead: {
            crimeGroupName: {
              equals: crimeTypeFilter,
              mode: "insensitive",
            },
          },
        },
        {
          crimeMinorHead: {
            crimeHeadName: {
              equals: crimeTypeFilter,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  const policeUnitId = query.policeUnitId as string | undefined;

  if (policeUnitId) {
    const parsedId = Number(policeUnitId);

    if (!Number.isNaN(parsedId)) {
      andConditions.push({ policeUnitId: parsedId });
    }
  }

  const dateFrom = query.dateFrom as string | undefined;
  const dateTo = query.dateTo as string | undefined;

  if (dateFrom || dateTo) {
    const dateRange: any = {};

    if (dateFrom) {
      dateRange.gte = new Date(dateFrom);
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }

    andConditions.push({ incidentFromDate: dateRange });
  }

  const year = query.year as string | undefined;

  if (!isUnset(year)) {
    const start = new Date(Number(year), 0, 1);
    const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);

    andConditions.push({
      OR: [
        {
          incidentFromDate: {
            gte: start,
            lte: end,
          },
        },
        {
          incidentFromDate: null,
          crimeRegisteredDate: {
            gte: start,
            lte: end,
          },
        },
      ],
    });
  }

  const stateFilter = query.state as string | undefined;
  const districtFilter = query.district as string | undefined;

  if (!isUnset(stateFilter) || !isUnset(districtFilter)) {
    const policeUnitFilter: any = {};

    if (!isUnset(stateFilter)) {
      policeUnitFilter.state = {
        stateName: {
          equals: stateFilter,
          mode: "insensitive",
        },
      };
    }

    if (!isUnset(districtFilter)) {
      policeUnitFilter.district = {
        districtName: {
          equals: districtFilter,
          mode: "insensitive",
        },
      };
    }

    andConditions.push({ policeUnit: policeUnitFilter });
  }

  const moConfidence = Number(query.moConfidence || 0);

  if (moConfidence > 0) {
    andConditions.push({
      modusOperandi: {
        is: {
          confidence: {
            gte: moConfidence,
          },
        },
      },
    });
  }

  const moPatterns = String(query.moPatterns || "")
    .split(",")
    .map((pattern) => pattern.trim().toUpperCase())
    .filter((pattern) =>
      MO_PATTERNS.includes(pattern as (typeof MO_PATTERNS)[number]),
    );

  if (moPatterns.length) {
    andConditions.push({
      modusOperandi: {
        is: {
          patterns: {
            hasSome: moPatterns,
          },
        },
      },
    });
  }

  return andConditions.length ? { AND: andConditions } : {};
}

/**
 * Detect districts with spike alerts using the same heuristics as the
 * /trends endpoint (recent activity above the historical baseline).
 */
function computeAlertDistricts(cases: any[]): Set<string> {
  const alerts = new Set<string>();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const baseline: Record<string, number> = {};
  const recent: Record<string, number> = {};

  cases.forEach((c) => {
    const district =
      c.policeUnit?.district?.districtName ||
      c.locations?.[0]?.location?.district?.districtName ||
      "Unknown";

    const date = new Date(getIncidentDate(c));

    if (date >= thirtyDaysAgo) {
      recent[district] = (recent[district] || 0) + 1;
    } else {
      baseline[district] = (baseline[district] || 0) + 1;
    }
  });

  const totalHistorical = Object.values(baseline).reduce((a, b) => a + b, 0);
  const baseAvgWeight = totalHistorical > 0 ? 30 / totalHistorical : 1;

  Object.entries(recent).forEach(([district, recentCount]) => {
    const expectedCount = Math.max(
      1,
      (baseline[district] || 0) * baseAvgWeight,
    );
    const ratio = recentCount / expectedCount;

    if (ratio > 1.3 && recentCount >= 2) {
      alerts.add(district);
    }
  });

  return alerts;
}

function riskLevelOf(caseItem: any): "low" | "medium" | "high" | "critical" {
  const score = Number(caseItem.riskScore || 0);

  if (score >= 75) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";

  return "low";
}

/**
 * 1. Geospatial Points
 *
 * New schema:
 * Case
 *   -> CaseLocation
 *      -> Location
 */
export const getGeospatialPoints = async (req: Request, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        crimeMajorHead: true,
        crimeMinorHead: true,
        caseStatus: true,

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
      },
    });

    const points = cases.flatMap((c: any) =>
      c.locations.map((cl: any) => ({
        caseId: c.id,
        caseNumber: c.caseNumber,
        title: c.title,

        crimeType: getCrimeType(c),

        incidentDate: getIncidentDate(c),

        status: c.caseStatus.caseStatusName,

        address: cl.location.address,

        latitude: cl.location.latitude,
        longitude: cl.location.longitude,

        locationType: cl.locationType || cl.location.locationType,

        district:
          cl.location.district?.districtName ||
          cl.location.districtName ||
          null,

        station:
          cl.location.policeUnit?.unitName || cl.location.stationName || null,
      })),
    );

    return res.status(200).json({
      success: true,
      count: points.length,
      data: points,
    });
  } catch (error: any) {
    console.error("getGeospatialPoints:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 2. District Statistics
 *
 * New schema:
 * PoliceUnit
 *   -> District
 *   -> Case[]
 */
export const getDistrictStats = async (req: Request, res: Response) => {
  try {
    const policeUnits = await prisma.policeUnit.findMany({
      where: {
        active: true,
      },

      include: {
        district: true,

        cases: {
          select: {
            id: true,

            crimeMajorHead: {
              select: {
                crimeGroupName: true,
              },
            },

            crimeMinorHead: {
              select: {
                crimeHeadName: true,
              },
            },

            caseStatus: {
              select: {
                caseStatusName: true,
              },
            },
          },
        },
      },
    });

    /**
     * Station / Police Unit level statistics
     */
    const stationStats = policeUnits.map((unit: any) => {
      const totalCases = unit.cases.length;

      const typeBreakdown = unit.cases.reduce(
        (acc: any, c: any) => {
          const type =
            c.crimeMinorHead?.crimeHeadName ||
            c.crimeMajorHead?.crimeGroupName ||
            "Unknown";

          acc[type] = (acc[type] || 0) + 1;

          return acc;
        },
        {} as Record<string, number>,
      );

      const statusBreakdown = unit.cases.reduce(
        (acc: any, c: any) => {
          const status = c.caseStatus?.caseStatusName || "Unknown";

          acc[status] = (acc[status] || 0) + 1;

          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        stationId: unit.id,
        stationName: unit.unitName,

        districtId: unit.districtId,
        district: unit.district?.districtName || "Unknown District",

        totalCases,

        typeBreakdown,
        statusBreakdown,
      };
    });

    /**
     * Group police units by district
     */
    const districtGroups = stationStats.reduce(
      (acc: any, stat: any) => {
        const district = stat.district || "Unknown District";

        if (!acc[district]) {
          acc[district] = {
            district,
            districtId: stat.districtId,
            totalCases: 0,
            stations: [],
            typeBreakdown: {},
            statusBreakdown: {},
          };
        }

        acc[district].totalCases += stat.totalCases;

        acc[district].stations.push({
          stationId: stat.stationId,
          stationName: stat.stationName,
          totalCases: stat.totalCases,
          typeBreakdown: stat.typeBreakdown,
          statusBreakdown: stat.statusBreakdown,
        });

        /**
         * Merge crime types
         */
        Object.entries(stat.typeBreakdown).forEach(([type, count]) => {
          acc[district].typeBreakdown[type] =
            (acc[district].typeBreakdown[type] || 0) + count;
        });

        /**
         * Merge statuses
         */
        Object.entries(stat.statusBreakdown).forEach(([status, count]) => {
          acc[district].statusBreakdown[status] =
            (acc[district].statusBreakdown[status] || 0) + count;
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    return res.status(200).json({
      success: true,
      data: Object.values(districtGroups),
    });
  } catch (error: any) {
    console.error("getDistrictStats:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 3. Trend Alerts
 *
 * Uses:
 * Case.crimeRegisteredDate / incidentFromDate
 * Case.policeUnit -> District
 * Case.crimeMajorHead / crimeMinorHead
 */
export const getTrendAlerts = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    /**
     * Recent cases
     */
    const recentCases = await prisma.case.findMany({
      where: {
        OR: [
          {
            incidentFromDate: {
              gte: thirtyDaysAgo,
            },
          },
          {
            AND: [
              {
                incidentFromDate: null,
              },
              {
                crimeRegisteredDate: {
                  gte: thirtyDaysAgo,
                },
              },
            ],
          },
        ],
      },

      include: {
        crimeMajorHead: true,
        crimeMinorHead: true,

        policeUnit: {
          include: {
            district: true,
          },
        },
      },
    });

    /**
     * Historical cases
     *
     * We can aggregate directly from Case instead
     * of going through Location.
     */
    const allCases = await prisma.case.findMany({
      select: {
        id: true,

        crimeRegisteredDate: true,
        incidentFromDate: true,

        crimeMajorHead: {
          select: {
            crimeGroupName: true,
          },
        },

        crimeMinorHead: {
          select: {
            crimeHeadName: true,
          },
        },

        policeUnit: {
          select: {
            district: {
              select: {
                districtName: true,
              },
            },
          },
        },
      },
    });

    /**
     * district -> crimeType -> historical count
     */
    const baseline: Record<string, Record<string, number>> = {};

    let totalHistorical = 0;

    allCases.forEach((c: any) => {
      const district =
        c.policeUnit?.district?.districtName || "Unknown District";

      const type =
        c.crimeMinorHead?.crimeHeadName ||
        c.crimeMajorHead?.crimeGroupName ||
        "Unknown";

      if (!baseline[district]) {
        baseline[district] = {};
      }

      baseline[district][type] = (baseline[district][type] || 0) + 1;

      totalHistorical++;
    });

    /**
     * Recent cases:
     *
     * district -> crimeType -> count
     */
    const recent: Record<string, Record<string, number>> = {};

    recentCases.forEach((c: any) => {
      const district =
        c.policeUnit?.district?.districtName || "Unknown District";

      const type =
        c.crimeMinorHead?.crimeHeadName ||
        c.crimeMajorHead?.crimeGroupName ||
        "Unknown";

      if (!recent[district]) {
        recent[district] = {};
      }

      recent[district][type] = (recent[district][type] || 0) + 1;
    });

    /**
     * Compute spike alerts
     */
    const alerts: any[] = [];

    const baseAvgWeight = totalHistorical > 0 ? 30 / totalHistorical : 1;

    Object.entries(recent).forEach(([district, types]) => {
      Object.entries(types).forEach(([type, recentCount]) => {
        const historicalCount = baseline[district]?.[type] || 0;

        const expectedCount = Math.max(1, historicalCount * baseAvgWeight);

        const ratio = recentCount / expectedCount;

        if (ratio > 1.3 && recentCount >= 2) {
          alerts.push({
            district,
            crimeType: type,

            recentCount,

            baselineExpected: Number(expectedCount.toFixed(2)),

            spikeRatio: Number(ratio.toFixed(2)),

            severity: ratio > 2 ? "CRITICAL" : "WARNING",

            pulsingIndicator: true,
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      alertCount: alerts.length,
      alerts,
    });
  } catch (error: any) {
    console.error("getTrendAlerts:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 4. Graph & Network Analysis
 *
 * New Person relationships:
 *
 * Person
 *  ├── caseRoles
 *  ├── phones
 *  ├── vehicles
 *  ├── addresses
 *  ├── organizations
 *  ├── outgoingRelationships
 *  └── incomingRelationships
 */
export const getNetworkGraph = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const limit = Math.min(Number(req.query.limit) || 100, 300);

    const personId = (req.query.personId as string) || "";
    const incidentId =
      (req.query.incidentId as string) || (req.query.caseId as string) || "";
    const district = (req.query.district as string) || "";
    const category = (req.query.category as string) || "";

    const graphFilters: any[] = [];

    if (q) {
      graphFilters.push(
        {
          name: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          aliases: {
            has: q,
          },
        },
      );
    }

    if (incidentId) {
      graphFilters.push({
        caseRoles: {
          some: {
            caseId: incidentId,
          },
        },
      });
    }

    if (district) {
      graphFilters.push({
        caseRoles: {
          some: {
            case: {
              policeUnit: {
                district: {
                  districtName: {
                    contains: district,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
      });
    }

    if (category) {
      graphFilters.push({
        caseRoles: {
          some: {
            case: {
              OR: [
                {
                  crimeMinorHead: {
                    is: {
                      crimeHeadName: {
                        contains: category,
                        mode: "insensitive",
                      },
                    },
                  },
                },
                {
                  crimeMajorHead: {
                    is: {
                      crimeGroupName: {
                        contains: category,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      });
    }

    const where: any = {};

    if (personId) {
      where.id = personId;
    }

    if (graphFilters.length) {
      where.AND = graphFilters;
    }

    const persons = await prisma.person.findMany({
      where: Object.keys(where).length ? where : undefined,

      include: {
        incomingRelationships: true,
        outgoingRelationships: true,

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
            organization: true,
          },
        },

        caseRoles: {
          include: {
            case: {
              include: {
                crimeMajorHead: true,
                crimeMinorHead: true,
                caseStatus: true,
              },
            },
          },
        },
      },

      take: limit,
    });

    const nodesMap: Record<string, any> = {};
    const edges: any[] = [];

    persons.forEach((p: any) => {
      /**
       * PERSON
       */
      nodesMap[`person-${p.id}`] = {
        id: `person-${p.id}`,
        type: "personNode",

        position: {
          x: 0,
          y: 0,
        },

        data: {
          entityType: "person",
          recordId: p.id,

          label: p.name || "Unknown Person",

          role: "Person",

          age: p.age,
          gender: p.gender,

          riskScore: p.riskScore,

          threatScore: p.threatScore,
          influenceScore: p.influenceScore,

          aliases: p.aliases,
        },
      };

      /**
       * PERSON RELATIONSHIPS
       */
      p.outgoingRelationships.forEach((rel: any) => {
        edges.push({
          id: `relationship-${rel.id}`,

          source: `person-${rel.sourcePersonId}`,
          target: `person-${rel.targetPersonId}`,

          label: rel.relationType,

          data: {
            entityType: "relationship",
            recordId: rel.id,

            confidence: rel.confidence,
            source: rel.source,
            notes: rel.notes,
          },
        });
      });

      /**
       * PHONES
       */
      p.phones.forEach((owner: any) => {
        const phone = owner.phone;

        const phoneNodeId = `phone-${phone.id}`;

        if (!nodesMap[phoneNodeId]) {
          nodesMap[phoneNodeId] = {
            id: phoneNodeId,
            type: "evidenceNode",

            position: {
              x: 0,
              y: 0,
            },

            data: {
              entityType: "phone",
              recordId: phone.id,

              title: phone.number,
              category: "Phone",

              countryCode: phone.countryCode,

              ownershipType: owner.ownershipType,

              confidence: owner.confidence,
            },
          };
        }

        edges.push({
          id: `phone-${p.id}-${phone.id}`,

          source: `person-${p.id}`,
          target: phoneNodeId,

          label: "Owns",
        });
      });

      /**
       * VEHICLES
       */
      p.vehicles.forEach((owner: any) => {
        const vehicle = owner.vehicle;

        const vehicleNodeId = `vehicle-${vehicle.id}`;

        if (!nodesMap[vehicleNodeId]) {
          nodesMap[vehicleNodeId] = {
            id: vehicleNodeId,
            type: "vehicleNode",

            position: {
              x: 0,
              y: 0,
            },

            data: {
              entityType: "vehicle",
              recordId: vehicle.id,

              registrationNo: vehicle.registrationNo,

              make: vehicle.make,
              model: vehicle.model,
              color: vehicle.color,

              vehicleType: vehicle.vehicleType,

              ownershipType: owner.ownershipType,

              confidence: owner.confidence,
            },
          };
        }

        edges.push({
          id: `vehicle-${p.id}-${vehicle.id}`,

          source: `person-${p.id}`,
          target: vehicleNodeId,

          label: "Owns Vehicle",
        });
      });

      /**
       * ADDRESSES / LOCATIONS
       */
      p.addresses.forEach((personLocation: any) => {
        const location = personLocation.location;

        const locationNodeId = `location-${location.id}`;

        if (!nodesMap[locationNodeId]) {
          nodesMap[locationNodeId] = {
            id: locationNodeId,
            type: "locationNode",

            position: {
              x: 0,
              y: 0,
            },

            data: {
              entityType: "location",
              recordId: location.id,

              title: location.address,

              district:
                location.district?.districtName || location.districtName,

              station: location.policeUnit?.unitName || location.stationName,

              latitude: location.latitude,

              longitude: location.longitude,

              relationship: personLocation.relationship,

              confidence: personLocation.confidence,
            },
          };
        }

        edges.push({
          id: `address-${p.id}-${location.id}`,

          source: `person-${p.id}`,
          target: locationNodeId,

          label: personLocation.relationship || "Located At",
        });
      });

      /**
       * ORGANIZATIONS
       */
      p.organizations.forEach((member: any) => {
        const org = member.organization;

        const orgNodeId = `organization-${org.id}`;

        if (!nodesMap[orgNodeId]) {
          nodesMap[orgNodeId] = {
            id: orgNodeId,
            type: "organizationNode",

            position: {
              x: 0,
              y: 0,
            },

            data: {
              entityType: "organization",

              recordId: org.id,

              title: org.name,

              category: org.organizationType,

              description: org.description,

              role: member.role,
              customRole: member.customRole,

              confidence: member.confidence,
            },
          };
        }

        edges.push({
          id: `organization-${p.id}-${org.id}`,

          source: `person-${p.id}`,
          target: orgNodeId,

          label: member.customRole || member.role || "Member Of",
        });
      });

      /**
       * CASES
       */
      p.caseRoles.forEach((casePerson: any) => {
        const c = casePerson.case;

        const caseNodeId = `case-${c.id}`;

        if (!nodesMap[caseNodeId]) {
          nodesMap[caseNodeId] = {
            id: caseNodeId,
            type: "incidentNode",

            position: {
              x: 0,
              y: 0,
            },

            data: {
              entityType: "case",
              recordId: c.id,

              title: c.title,

              incidentNumber: c.caseNumber,

              category:
                c.crimeMinorHead?.crimeHeadName ||
                c.crimeMajorHead?.crimeGroupName,

              status: c.caseStatus?.caseStatusName,

              incidentDate: c.incidentFromDate || c.crimeRegisteredDate,
            },
          };
        }

        edges.push({
          id: `case-${p.id}-${c.id}-${casePerson.role}`,

          source: `person-${p.id}`,
          target: caseNodeId,

          label: casePerson.role,

          data: {
            role: casePerson.role,
            notes: casePerson.notes,
            isPrimary: casePerson.isPrimary,
          },
        });
      });
    });

    return res.status(200).json({
      success: true,

      data: {
        nodes: Object.values(nodesMap),
        edges,
      },
    });
  } catch (error: any) {
    console.error("getNetworkGraph:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 5. Repeat Offender Tracking
 */
export const getRepeatOffenders = async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      include: {
        caseRoles: {
          include: {
            case: {
              include: {
                modusOperandi: true,

                policeUnit: {
                  include: {
                    district: true,
                  },
                },

                crimeMajorHead: true,
                crimeMinorHead: true,
              },
            },
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

        addresses: {
          include: {
            location: true,
          },
        },
      },
    });

    const profiles = persons
      .map((p: any) => {
        /**
         * Case involvement
         */
        const caseInvolvements = p.caseRoles.map((cp: any) => {
          const c = cp.case;

          return {
            caseId: c.id,

            caseNumber: c.caseNumber,

            title: c.title,

            role: cp.role,

            crimeType:
              c.crimeMinorHead?.crimeHeadName ||
              c.crimeMajorHead?.crimeGroupName ||
              "Unknown",

            incidentDate: c.incidentFromDate || c.crimeRegisteredDate,

            modusOperandi: c.modusOperandi,

            stationName: c.policeUnit?.unitName || null,

            district: c.policeUnit?.district?.districtName || null,
          };
        });

        const totalCases = caseInvolvements.length;

        /**
         * Only SUSPECT involvement contributes
         * heavily to the calculated risk score.
         */
        const suspectCases = caseInvolvements.filter(
          (c: any) => c.role === "SUSPECT",
        );

        /**
         * Dynamic risk score
         */
        const baseScore =
          suspectCases.length * 25 + (totalCases - suspectCases.length) * 5;

        const calculatedRiskScore = Math.min(100, baseScore);

        /**
         * Collect MO descriptions
         */
        const moPatterns = caseInvolvements
          .map((c: any) => c.modusOperandi?.description)
          .filter(Boolean) as string[];

        /**
         * Remove duplicate MO descriptions
         */
        const uniqueMoPatterns = Array.from(new Set(moPatterns));

        return {
          id: p.id,

          name: p.name || "Unknown Suspect",

          age: p.age,

          gender: p.gender,

          aliases: p.aliases,

          /**
           * Stored risk values from Person
           */
          riskScore: p.riskScore,
          threatScore: p.threatScore,
          influenceScore: p.influenceScore,

          /**
           * Calculated intelligence score
           */
          calculatedRiskScore,

          totalCases,

          suspectCaseCount: suspectCases.length,

          cases: caseInvolvements,

          moPatterns: uniqueMoPatterns,

          phones: p.phones.map((owner: any) => owner.phone.number),

          vehicles: p.vehicles
            .map((owner: any) => owner.vehicle.registrationNo)
            .filter(Boolean),

          addresses: p.addresses
            .map((address: any) => address.location.address)
            .filter(Boolean),
        };
      })
      .filter((profile: any) => profile.totalCases > 1)
      .sort((a: any, b: any) => b.calculatedRiskScore - a.calculatedRiskScore);

    return res.status(200).json({
      success: true,

      count: profiles.length,

      data: profiles,
    });
  } catch (error: any) {
    console.error("getRepeatOffenders:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * 6. ASSOCIATION DETECTION
 * ============================================================
 *
 * Finds people who share:
 * - Phone
 * - Vehicle
 * - Location
 * - Organization
 */
export const getAssociationNetworks = async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      where: {
        name: {
          not: null,
        },
      },

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
            organization: true,
          },
        },
      },
    });

    const associations: any[] = [];

    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const p1 = persons[i];
        const p2 = persons[j];

        if (!p1.name || !p2.name) {
          continue;
        }

        /**
         * --------------------------------------------------------
         * SHARED PHONES
         * --------------------------------------------------------
         */
        const sharedPhones = p1.phones.filter((p1Phone: any) =>
          p2.phones.some((p2Phone: any) => p2Phone.phoneId === p1Phone.phoneId),
        );

        sharedPhones.forEach((owner: any) => {
          const phone = owner.phone;

          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,

            suspect1Id: p1.id,
            suspect2Id: p2.id,

            sharedEntityType: "Phone",

            sharedEntityId: phone.id,
            sharedEntityValue: phone.number,

            connectionDescription: `Both persons are connected via Phone (${phone.number})`,

            confidence: owner.confidence,
          });
        });

        /**
         * --------------------------------------------------------
         * SHARED VEHICLES
         * --------------------------------------------------------
         */
        const sharedVehicles = p1.vehicles.filter((p1Vehicle: any) =>
          p2.vehicles.some(
            (p2Vehicle: any) => p2Vehicle.vehicleId === p1Vehicle.vehicleId,
          ),
        );

        sharedVehicles.forEach((owner: any) => {
          const vehicle = owner.vehicle;

          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,

            suspect1Id: p1.id,
            suspect2Id: p2.id,

            sharedEntityType: "Vehicle",

            sharedEntityId: vehicle.id,
            sharedEntityValue: vehicle.registrationNo || vehicle.id,

            connectionDescription: `Both persons are connected via Vehicle (${vehicle.registrationNo || vehicle.id})`,

            confidence: owner.confidence,
          });
        });

        /**
         * --------------------------------------------------------
         * SHARED LOCATIONS
         * --------------------------------------------------------
         */
        const sharedLocations = p1.addresses.filter((p1Location: any) =>
          p2.addresses.some(
            (p2Location: any) =>
              p2Location.locationId === p1Location.locationId,
          ),
        );

        sharedLocations.forEach((personLocation: any) => {
          const location = personLocation.location;

          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,

            suspect1Id: p1.id,
            suspect2Id: p2.id,

            sharedEntityType: "Location",

            sharedEntityId: location.id,

            sharedEntityValue:
              location.address || `${location.latitude}, ${location.longitude}`,

            connectionDescription: `Both persons are associated with Location (${location.address || `${location.latitude}, ${location.longitude}`})`,

            district:
              location.district?.districtName || location.districtName || null,

            latitude: location.latitude,

            longitude: location.longitude,

            confidence: personLocation.confidence,
          });
        });

        /**
         * --------------------------------------------------------
         * SHARED ORGANIZATIONS
         * --------------------------------------------------------
         */
        const sharedOrganizations = p1.organizations.filter(
          (p1Organization: any) =>
            p2.organizations.some(
              (p2Organization: any) =>
                p2Organization.organizationId === p1Organization.organizationId,
            ),
        );

        sharedOrganizations.forEach((member: any) => {
          const organization = member.organization;

          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,

            suspect1Id: p1.id,
            suspect2Id: p2.id,

            sharedEntityType: "Organization",

            sharedEntityId: organization.id,

            sharedEntityValue: organization.name,

            connectionDescription: `Both persons are connected via Organization (${organization.name})`,

            organizationType: organization.organizationType,

            role1: member.role,
            customRole1: member.customRole,

            confidence: member.confidence,
          });
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: associations.length,
      data: associations,
    });
  } catch (error: any) {
    console.error("getAssociationNetworks:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * 7. SOCIOLOGICAL / PREDICTIVE DASHBOARD
 * ============================================================
 *
 * NOTE:
 * The old implementation used Location.district directly.
 *
 * In the new schema:
 *
 * Location -> District
 *
 * Therefore district is obtained from:
 *
 * location.district.districtName
 *
 * This endpoint still uses synthesized demographic values,
 * because those demographic fields do not exist in the
 * current database schema.
 */
export const getPredictiveStats = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      select: {
        id: true,

        districtId: true,

        district: {
          select: {
            districtName: true,
          },
        },
      },
    });

    /**
     * Group locations by district.
     */
    const districtCounts: Record<
      string,
      {
        districtId: number | null;
        incidentCount: number;
      }
    > = {};

    locations.forEach((location: any) => {
      const district = location.district?.districtName || "Unknown District";

      if (!districtCounts[district]) {
        districtCounts[district] = {
          districtId: location.districtId || null,
          incidentCount: 0,
        };
      }

      districtCounts[district].incidentCount++;
    });

    const dashboard = Object.entries(districtCounts).map(
      ([district, stats]) => {
        const incidentCount = stats.incidentCount;

        /**
         * Deterministic synthetic parameters.
         *
         * IMPORTANT:
         * These are NOT actual demographic data.
         * Replace them with a proper demographic
         * table/API when available.
         */
        let hash = 0;

        for (let i = 0; i < district.length; i++) {
          hash = district.charCodeAt(i) + ((hash << 5) - hash);
        }

        const urbanizationRate = Math.min(
          98,
          Math.max(15, Math.abs(hash % 85) + 12),
        );

        const unemploymentRate = parseFloat(
          (3.5 + Math.abs((hash >> 2) % 12) * 0.8).toFixed(1),
        );

        const literacyRate = Math.min(
          99,
          Math.max(45, 95 - Math.abs((hash >> 4) % 40)),
        );

        const populationDensity =
          Math.abs((hash >> 6) % 1500) + 200 + incidentCount * 25;

        /**
         * Predictive risk score
         */
        const predictedRiskScore = Math.min(
          100,
          Math.round(
            incidentCount * 2.5 +
              unemploymentRate * 3.5 +
              urbanizationRate * 0.3 -
              literacyRate * 0.2,
          ),
        );

        const forecastTrend =
          predictedRiskScore > 65
            ? "INCREASING"
            : predictedRiskScore < 40
              ? "DECREASING"
              : "STABLE";

        return {
          district,
          districtId: stats.districtId,

          incidentCount,

          demographics: {
            urbanizationRatePercent: urbanizationRate,

            unemploymentRatePercent: unemploymentRate,

            literacyRatePercent: literacyRate,

            populationDensitySqKm: populationDensity,
          },

          predictiveAnalysis: {
            predictedRiskScore,

            forecastTrend,

            recommendedPatrolResourceWeight: parseFloat(
              (predictedRiskScore / 10).toFixed(1),
            ),

            riskLevel:
              predictedRiskScore > 75
                ? "HIGH"
                : predictedRiskScore > 45
                  ? "MEDIUM"
                  : "LOW",
          },
        };
      },
    );

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error("getPredictiveStats:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * 8. ANOMALY DETECTION
 * ============================================================
 *
 * New Case fields:
 *
 * incidentFromDate / crimeRegisteredDate
 * policeUnit -> district
 * crimeMinorHead / crimeMajorHead
 */
export const getAnomalies = async (req: Request, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        modusOperandi: true,

        crimeMajorHead: true,
        crimeMinorHead: true,

        policeUnit: {
          include: {
            district: true,
          },
        },
      },
    });

    const anomalies = cases
      .map((c: any) => {
        const incidentDate = c.incidentFromDate || c.crimeRegisteredDate;

        const hour = new Date(incidentDate).getHours();

        const crimeType =
          c.crimeMinorHead?.crimeHeadName ||
          c.crimeMajorHead?.crimeGroupName ||
          "UNKNOWN";

        const normalizedCrimeType = crimeType.toUpperCase().replace(/\s+/g, "");

        const mo = c.modusOperandi;

        const reasons: string[] = [];

        /**
         * Homicide / Murder during daylight
         */
        if (
          (normalizedCrimeType === "HOMICIDE" ||
            normalizedCrimeType === "MURDER") &&
          hour >= 6 &&
          hour <= 18
        ) {
          reasons.push("Homicide occurring during broad daylight");
        }

        /**
         * Cybercrime + physical weapon
         */
        if (normalizedCrimeType === "CYBERCRIME" && mo?.weaponType) {
          reasons.push(
            `Cybercrime involving a physical weapon pattern (${mo.weaponType})`,
          );
        }

        /**
         * Fraud during midnight
         */
        if (
          hour >= 1 &&
          hour <= 4 &&
          (normalizedCrimeType === "FRAUD" ||
            normalizedCrimeType.includes("FRAUD"))
        ) {
          reasons.push(
            "Fraud/financial activity occurring during midnight hours (1am - 4am)",
          );
        }

        if (reasons.length === 0) {
          return null;
        }

        return {
          caseId: c.id,

          caseNumber: c.caseNumber,

          title: c.title,

          crimeType,

          incidentDate,

          hour,

          district: c.policeUnit?.district?.districtName || null,

          policeUnit: c.policeUnit?.unitName || null,

          reasons,

          anomalyScore: Math.min(100, reasons.length * 35),
        };
      })
      .filter(
        (anomaly: any): anomaly is NonNullable<typeof anomaly> =>
          anomaly !== null,
      );

    return res.status(200).json({
      success: true,

      count: anomalies.length,

      data: anomalies,
    });
  } catch (error: any) {
    console.error("getAnomalies:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * PERSON NAME SIMILARITY
 * ============================================================
 */

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];

  let i: number;
  let j: number;

  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }

  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }

  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return tmp[a.length][b.length];
}

function getNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();

  const n2 = name2.toLowerCase().trim();

  if (n1 === n2) {
    return 1;
  }

  const maxLen = Math.max(n1.length, n2.length);

  if (maxLen === 0) {
    return 1;
  }

  const distance = getLevenshteinDistance(n1, n2);

  return 1 - distance / maxLen;
}

/**
 * ============================================================
 * 9. PERSON SIMILARITY
 * ============================================================
 */
export async function calculatePersonSimilarity(targetPersonId: string) {
  const target = await prisma.person.findUnique({
    where: {
      id: targetPersonId,
    },

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

      caseRoles: {
        include: {
          case: true,
        },
      },
    },
  });

  if (!target) {
    return [];
  }

  const others = await prisma.person.findMany({
    where: {
      id: {
        not: targetPersonId,
      },
    },

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

      caseRoles: {
        include: {
          case: true,
        },
      },
    },
  });

  /**
   * Target data
   */
  const targetPhones = target.phones.map((owner: any) => owner.phone.number);

  const targetVehicles = target.vehicles
    .map((owner: any) => owner.vehicle.registrationNo)
    .filter(Boolean) as string[];

  /**
   * Use location IDs rather than
   * floating-point coordinates.
   */
  const targetLocations = target.addresses.map(
    (address: any) => address.locationId,
  );

  const targetCases = target.caseRoles.map((caseRole: any) => caseRole.caseId);

  const targetAliases = target.aliases || [];

  const matches = others
    .map((other: any) => {
      let confidence = 0;

      const reasons: string[] = [];

      /**
       * --------------------------------------------------------
       * NAME
       * --------------------------------------------------------
       */
      if (target.name && other.name) {
        const nameSim = getNameSimilarity(target.name, other.name);

        if (nameSim > 0.75) {
          confidence += Math.round(nameSim * 35);

          reasons.push(
            `Similar name: "${other.name}" (confidence: ${Math.round(nameSim * 100)}%)`,
          );
        }
      }

      /**
       * --------------------------------------------------------
       * AGE
       * --------------------------------------------------------
       */
      if (target.age != null && other.age != null) {
        const ageDiff = Math.abs(target.age - other.age);

        if (ageDiff <= 3) {
          confidence += 10;

          reasons.push(
            `Similar age group (age: ${other.age}, diff: ${ageDiff} years)`,
          );
        }
      }

      /**
       * --------------------------------------------------------
       * ALIAS
       * --------------------------------------------------------
       */
      const aliasOverlap = targetAliases.filter((alias: any) =>
        other.aliases.includes(alias),
      );

      if (aliasOverlap.length > 0) {
        confidence += 25;

        reasons.push(`Matching aliases: ${aliasOverlap.join(", ")}`);
      }

      /**
       * --------------------------------------------------------
       * PHONE
       * --------------------------------------------------------
       */
      const otherPhones = other.phones.map((owner: any) => owner.phone.number);

      const sharedPhones = otherPhones.filter((number: any) =>
        targetPhones.includes(number),
      );

      if (sharedPhones.length > 0) {
        confidence += 50;

        reasons.push(`Shared contact numbers: ${sharedPhones.join(", ")}`);
      }

      /**
       * --------------------------------------------------------
       * VEHICLE
       * --------------------------------------------------------
       */
      const otherVehicles = other.vehicles
        .map((owner: any) => owner.vehicle.registrationNo)
        .filter(Boolean) as string[];

      const sharedVehicles = otherVehicles.filter((registrationNo) =>
        targetVehicles.includes(registrationNo),
      );

      if (sharedVehicles.length > 0) {
        confidence += 50;

        reasons.push(`Shared vehicles: ${sharedVehicles.join(", ")}`);
      }

      /**
       * --------------------------------------------------------
       * LOCATION
       * --------------------------------------------------------
       */
      const otherLocations = other.addresses.map(
        (address: any) => address.locationId,
      );

      const sharedLocations = otherLocations.filter((locationId: any) =>
        targetLocations.includes(locationId),
      );

      if (sharedLocations.length > 0) {
        confidence += 20;

        reasons.push(
          `Both persons are associated with ${sharedLocations.length} shared location(s)`,
        );
      }

      /**
       * --------------------------------------------------------
       * CASE
       * --------------------------------------------------------
       */
      const otherCases = other.caseRoles.map(
        (caseRole: any) => caseRole.caseId,
      );

      const sharedCases = otherCases.filter((caseId: any) =>
        targetCases.includes(caseId),
      );

      if (sharedCases.length > 0) {
        confidence += 15;

        reasons.push(
          `Found in same case investigations: ${sharedCases.length} shared case(s)`,
        );
      }

      /**
       * --------------------------------------------------------
       * SAME NAME + SHARED PHONE
       * --------------------------------------------------------
       */
      let finalConfidence = Math.min(100, confidence);

      if (
        target.name &&
        other.name &&
        target.name === other.name &&
        sharedPhones.length > 0 &&
        finalConfidence > 90
      ) {
        finalConfidence = 100;
      }

      return {
        person: {
          id: other.id,

          name: other.name,

          age: other.age,

          gender: other.gender,

          aliases: other.aliases,

          phones: other.phones.map((owner: any) => owner.phone.number),

          vehicles: other.vehicles.map(
            (owner: any) => owner.vehicle.registrationNo,
          ),

          cases: other.caseRoles.map((caseRole: any) => ({
            caseId: caseRole.case.id,

            caseNumber: caseRole.case.caseNumber,

            title: caseRole.case.title,

            role: caseRole.role,
          })),
        },

        confidence: finalConfidence,

        reasons,
      };
    })
    .filter((match: any) => match.confidence >= 25)
    .sort((a: any, b: any) => b.confidence - a.confidence);

  return matches;
}

/**
 * ============================================================
 * 10. SIMILAR PERSONS ROUTE
 * ============================================================
 */
export const getSimilarPersons = async (req: Request, res: Response) => {
  try {
    const personId = req.params.personId as string;

    const matches = await calculatePersonSimilarity(personId);

    return res.status(200).json({
      success: true,

      count: matches.length,

      data: matches,
    });
  } catch (error: any) {
    console.error("getSimilarPersons:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * 11. TIMELINE STATISTICS
 * ============================================================
 */
export const getTimelineStats = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as string) || "month";

    const cases = await prisma.case.findMany({
      orderBy: {
        crimeRegisteredDate: "asc",
      },

      include: {
        crimeMajorHead: true,
        crimeMinorHead: true,

        caseStatus: true,

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
      },
    });

    const timelineMap: Record<
      string,
      {
        timeLabel: string;

        caseCount: number;

        crimeTypes: Record<string, number>;

        districts: Record<string, number>;

        incidents: any[];
      }
    > = {};

    cases.forEach((c: any) => {
      /**
       * Prefer actual incident date.
       * Fall back to registration date.
       */
      const incidentDate = c.incidentFromDate || c.crimeRegisteredDate;

      const date = new Date(incidentDate);

      let timeLabel = "";

      /**
       * --------------------------------------------------------
       * DAY
       * --------------------------------------------------------
       */
      if (groupBy === "day") {
        timeLabel = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        /**
         * --------------------------------------------------------
         * WEEK
         * --------------------------------------------------------
         */
        const oneJan = new Date(date.getFullYear(), 0, 1);

        const numberOfDays = Math.floor(
          (date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
        );

        const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);

        timeLabel = `${date.getFullYear()}-W${weekNum
          .toString()
          .padStart(2, "0")}`;
      } else if (groupBy === "year") {
        /**
         * --------------------------------------------------------
         * YEAR
         * --------------------------------------------------------
         */
        timeLabel = date.getFullYear().toString();
      } else {
        /**
         * --------------------------------------------------------
         * MONTH
         * --------------------------------------------------------
         */
        timeLabel = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      }

      /**
       * Create bucket
       */
      if (!timelineMap[timeLabel]) {
        timelineMap[timeLabel] = {
          timeLabel,

          caseCount: 0,

          crimeTypes: {},

          districts: {},

          incidents: [],
        };
      }

      const bucket = timelineMap[timeLabel];

      bucket.caseCount++;

      /**
       * Crime type
       */
      const crimeType =
        c.crimeMinorHead?.crimeHeadName ||
        c.crimeMajorHead?.crimeGroupName ||
        "Unknown";

      bucket.crimeTypes[crimeType] = (bucket.crimeTypes[crimeType] || 0) + 1;

      /**
       * --------------------------------------------------------
       * LOCATION-BASED INCIDENTS
       * --------------------------------------------------------
       */
      c.locations.forEach((caseLocation: any) => {
        const location = caseLocation.location;

        const district =
          location.district?.districtName ||
          location.districtName ||
          "Unknown District";

        bucket.districts[district] = (bucket.districts[district] || 0) + 1;

        bucket.incidents.push({
          caseId: c.id,

          caseNumber: c.caseNumber,

          title: c.title,

          crimeType,

          incidentDate,

          caseStatus: c.caseStatus?.caseStatusName || null,

          latitude: location.latitude,

          longitude: location.longitude,

          district,

          policeUnit:
            location.policeUnit?.unitName || location.stationName || null,

          address: location.address,

          locationType: caseLocation.locationType || location.locationType,

          occurredAt: caseLocation.occurredAt,
        });
      });
    });

    /**
     * Sort timeline
     */
    const sortedBuckets = Object.keys(timelineMap)
      .sort()
      .map((key) => timelineMap[key]);

    /**
     * Cumulative case count
     */
    let cumulativeTotal = 0;

    const data = sortedBuckets.map((bucket) => {
      cumulativeTotal += bucket.caseCount;

      return {
        ...bucket,

        cumulativeTotal,
      };
    });

    return res.status(200).json({
      success: true,

      groupBy,

      data,
    });
  } catch (error: any) {
    console.error("getTimelineStats:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getCaseBoard = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.caseId as string;

    const caseObj = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        policeUnit: {
          include: {
            state: true,
            district: true,
          },
        },

        caseStatus: true,
        crimeMajorHead: true,
        crimeMinorHead: true,

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
                    location: {
                      include: {
                        district: true,
                        policeUnit: true,
                      },
                    },
                  },
                },
                caseRoles: {
                  include: {
                    case: {
                      include: {
                        caseStatus: true,
                        crimeMajorHead: true,
                        crimeMinorHead: true,
                      },
                    },
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
                cases: {
                  include: {
                    case: {
                      include: {
                        caseStatus: true,
                        crimeMajorHead: true,
                        crimeMinorHead: true,
                      },
                    },
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
                cases: {
                  include: {
                    case: {
                      include: {
                        caseStatus: true,
                        crimeMajorHead: true,
                        crimeMinorHead: true,
                      },
                    },
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
                residents: {
                  include: {
                    person: true,
                  },
                },
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
      },
    });

    if (!caseObj) {
      res.status(404).json({
        success: false,
        message: "Case not found",
      });
      return;
    }

    const getCrimeType = (c: any) => {
      return (
        c.crimeMinorHead?.crimeHeadName ||
        c.crimeMajorHead?.crimeGroupName ||
        "Unknown"
      );
    };

    const getCaseStatus = (c: any) => {
      return c.caseStatus?.caseStatusName || "Unknown";
    };

    const getEmployeeName = (employee: any) => {
      if (!employee) return undefined;

      return [employee.firstName, employee.lastName].filter(Boolean).join(" ");
    };

    const nodes: any[] = [];
    const edges: any[] = [];
    const similarSuspects: any[] = [];

    // ---------------------------------------------------------
    // 1. CENTRAL CASE
    // ---------------------------------------------------------

    nodes.push({
      id: caseObj.id,
      type: "CASE",
      label: caseObj.caseNumber,
      properties: {
        title: caseObj.title,
        crimeType: getCrimeType(caseObj),
        crimeMajorHead: caseObj.crimeMajorHead?.crimeGroupName,
        crimeMinorHead: caseObj.crimeMinorHead?.crimeHeadName,
        status: getCaseStatus(caseObj),
        incidentDate: caseObj.incidentFromDate || caseObj.crimeRegisteredDate,
        description: caseObj.description,
        crimeRegisteredDate: caseObj.crimeRegisteredDate,
        policeUnit: caseObj.policeUnit?.unitName,
        district: caseObj.policeUnit?.district?.districtName,
        state: caseObj.policeUnit?.state?.stateName,
      },
    });

    // ---------------------------------------------------------
    // 2. MODUS OPERANDI
    // ---------------------------------------------------------

    if (caseObj.modusOperandi) {
      const mo = caseObj.modusOperandi;

      nodes.push({
        id: mo.id,
        type: "MODUS_OPERANDI",
        label: mo.name,
        properties: {
          description: mo.description,
          targetType: mo.targetType,
          weaponType: mo.weaponType,
          timePattern: mo.timePattern,
          vehiclePattern: mo.vehiclePattern,
          entryMethod: mo.entryMethod,
          escapeMethod: mo.escapeMethod,
          communicationMethod: mo.communicationMethod,
          riskLevel: mo.riskLevel,
        },
      });

      edges.push({
        id: `edge-case-mo-${mo.id}`,
        source: caseObj.id,
        target: mo.id,
        type: "EXECUTION_PATTERN",
      });
    }

    // ---------------------------------------------------------
    // 3. POLICE UNIT
    // ---------------------------------------------------------

    if (caseObj.policeUnit) {
      const unit = caseObj.policeUnit;

      nodes.push({
        id: String(unit.id),
        type: "POLICE_UNIT",
        label: unit.unitName,
        properties: {
          unitType: unit.unitTypeId,
          district: unit.district?.districtName,
          state: unit.state?.stateName,
        },
      });

      edges.push({
        id: `edge-case-unit-${unit.id}`,
        source: caseObj.id,
        target: String(unit.id),
        type: "REGISTERED_AT",
      });
    }

    // ---------------------------------------------------------
    // NODE / EDGE HELPERS
    // ---------------------------------------------------------

    const addedNodeIds = new Set<string>();

    addedNodeIds.add(caseObj.id);

    if (caseObj.modusOperandiId) {
      addedNodeIds.add(caseObj.modusOperandiId);
    }

    addedNodeIds.add(String(caseObj.policeUnitId));

    const addNode = (
      id: string,
      type: string,
      label: string,
      properties: any,
    ) => {
      if (!id) return false;

      if (!addedNodeIds.has(id)) {
        addedNodeIds.add(id);

        nodes.push({
          id,
          type,
          label,
          properties,
        });

        return true;
      }

      return false;
    };

    const addEdge = (source: string, target: string, type: string) => {
      const id = `edge-${source}-${target}-${type}`;

      if (!edges.some((edge) => edge.id === id)) {
        edges.push({
          id,
          source,
          target,
          type,
        });
      }
    };

    // ---------------------------------------------------------
    // 4. EVIDENCE
    // ---------------------------------------------------------

    caseObj.evidences.forEach((ev: any) => {
      addNode(ev.id, "EVIDENCE", ev.title || ev.type, {
        type: ev.type,
        title: ev.title,
        description: ev.description,
        fileUrl: ev.fileUrl,
        fileName: ev.fileName,
        mimeType: ev.mimeType,
        fileSize: ev.fileSize,
        uploadedById: ev.uploadedById,
        uploadedByName: getEmployeeName(ev.uploadedBy),
        uploadedByBadge: ev.uploadedBy?.badgeNumber,
        aiSummary: ev.aiSummary,
        aiClassification: ev.aiClassification,
        aiConfidence: ev.aiConfidence,
      });

      addEdge(caseObj.id, ev.id, "HAS_EVIDENCE");
    });

    // ---------------------------------------------------------
    // 5. PERSONS
    // ---------------------------------------------------------

    for (const cp of caseObj.persons) {
      const p = cp.person;

      addNode(p.id, "PERSON", p.name || "Unknown Person", {
        name: p.name,
        age: p.age,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        aliases: p.aliases,
        riskScore: p.riskScore,
        threatScore: p.threatScore,
        influenceScore: p.influenceScore,
        roleInCase: cp.role,
        notes: cp.notes,
        isPrimary: cp.isPrimary,
      });

      addEdge(p.id, caseObj.id, `INVOLVED_AS_${cp.role}`);

      // Similar suspects
      if (cp.role === "SUSPECT") {
        const similarities = await calculatePersonSimilarity(p.id);

        similarities.forEach((sim: any) => {
          similarSuspects.push({
            suspectInCase: {
              id: p.id,
              name: p.name,
            },
            matchedCandidate: sim.person,
            confidence: sim.confidence,
            reasons: sim.reasons,
          });
        });
      }

      // Phones
      p.phones.forEach((phoneOwner: any) => {
        const ph = phoneOwner.phone;

        addNode(ph.id, "PHONE", ph.number, {
          number: ph.number,
          countryCode: ph.countryCode,
          isActive: ph.isActive,
          ownershipType: phoneOwner.ownershipType,
          confidence: phoneOwner.confidence,
        });

        addEdge(p.id, ph.id, "OWNS_PHONE");
      });

      // Vehicles
      p.vehicles.forEach((vehicleOwner: any) => {
        const v = vehicleOwner.vehicle;

        addNode(v.id, "VEHICLE", v.registrationNo || "No Registration", {
          registrationNo: v.registrationNo,
          make: v.make,
          model: v.model,
          color: v.color,
          vehicleType: v.vehicleType,
          chassisNumber: v.chassisNumber,
          engineNumber: v.engineNumber,
          ownershipType: vehicleOwner.ownershipType,
          confidence: vehicleOwner.confidence,
        });

        addEdge(p.id, v.id, "OWNS_VEHICLE");
      });

      // Addresses
      p.addresses.forEach((personLocation: any) => {
        const loc = personLocation.location;

        addNode(loc.id, "LOCATION", loc.address || "Address", {
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          district: loc.district?.districtName,
          station: loc.policeUnit?.unitName,
          locationType: loc.locationType,
          relationship: personLocation.relationship,
          confidence: personLocation.confidence,
        });

        addEdge(p.id, loc.id, "RESIDES_AT");
      });

      // Historical cases
      p.caseRoles.forEach((otherCaseLink: any) => {
        if (otherCaseLink.caseId === caseObj.id) {
          return;
        }

        const oc = otherCaseLink.case;

        addNode(oc.id, "CASE", oc.caseNumber, {
          title: oc.title,
          crimeType: getCrimeType(oc),
          status: getCaseStatus(oc),
          incidentDate: oc.incidentFromDate || oc.crimeRegisteredDate,
          isCrossLinked: true,
        });

        addEdge(p.id, oc.id, `INVOLVED_IN_HISTORICAL_AS_${otherCaseLink.role}`);
      });
    }

    // ---------------------------------------------------------
    // 6. DIRECT VEHICLES
    // ---------------------------------------------------------

    caseObj.vehicles.forEach((caseVehicle: any) => {
      const v = caseVehicle.vehicle;

      addNode(v.id, "VEHICLE", v.registrationNo || "No Registration", {
        registrationNo: v.registrationNo,
        make: v.make,
        model: v.model,
        color: v.color,
        vehicleType: v.vehicleType,
        chassisNumber: v.chassisNumber,
        engineNumber: v.engineNumber,
        context: caseVehicle.context,
        confidence: caseVehicle.confidence,
      });

      addEdge(caseObj.id, v.id, "VEHICLE_SPOTTED");

      // Owners
      v.owners.forEach((owner: any) => {
        const person = owner.person;

        addNode(person.id, "PERSON", person.name || "Unknown Person", {
          name: person.name,
          age: person.age,
          gender: person.gender,
          aliases: person.aliases,
          riskScore: person.riskScore,
        });

        addEdge(person.id, v.id, "OWNS_VEHICLE");
      });

      // Vehicle case history
      v.cases.forEach((vehicleCase: any) => {
        if (vehicleCase.caseId === caseObj.id) {
          return;
        }

        const oc = vehicleCase.case;

        addNode(oc.id, "CASE", oc.caseNumber, {
          title: oc.title,
          crimeType: getCrimeType(oc),
          status: getCaseStatus(oc),
          incidentDate: oc.incidentFromDate || oc.crimeRegisteredDate,
          isCrossLinked: true,
        });

        addEdge(v.id, oc.id, "VEHICLE_USED_IN_CASE");
      });
    });

    // ---------------------------------------------------------
    // 7. DIRECT PHONES
    // ---------------------------------------------------------

    caseObj.phones.forEach((casePhone: any) => {
      const ph = casePhone.phone;

      addNode(ph.id, "PHONE", ph.number, {
        number: ph.number,
        countryCode: ph.countryCode,
        isActive: ph.isActive,
        context: casePhone.context,
        confidence: casePhone.confidence,
      });

      addEdge(caseObj.id, ph.id, "PHONE_LINKED");

      // Owners
      ph.owners.forEach((owner: any) => {
        const person = owner.person;

        addNode(person.id, "PERSON", person.name || "Unknown Person", {
          name: person.name,
          age: person.age,
          gender: person.gender,
          aliases: person.aliases,
          riskScore: person.riskScore,
        });

        addEdge(person.id, ph.id, "SUBSCRIBER_OF");
      });

      // Phone case history
      ph.cases.forEach((phoneCase: any) => {
        if (phoneCase.caseId === caseObj.id) {
          return;
        }

        const oc = phoneCase.case;

        addNode(oc.id, "CASE", oc.caseNumber, {
          title: oc.title,
          crimeType: getCrimeType(oc),
          status: getCaseStatus(oc),
          incidentDate: oc.incidentFromDate || oc.crimeRegisteredDate,
          isCrossLinked: true,
        });

        addEdge(ph.id, oc.id, "PHONE_LINKED_TO_CASE");
      });
    });

    // ---------------------------------------------------------
    // 8. CASE LOCATIONS
    // ---------------------------------------------------------

    caseObj.locations.forEach((caseLocation: any) => {
      const loc = caseLocation.location;

      addNode(loc.id, "LOCATION", loc.address || "Crime Location", {
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        district: loc.district?.districtName,
        station: loc.policeUnit?.unitName,
        locationType: caseLocation.locationType || loc.locationType,
        description: caseLocation.description,
        occurredAt: caseLocation.occurredAt,
        accuracyMeters: loc.accuracyMeters,
        source: loc.source,
      });

      addEdge(
        caseObj.id,
        loc.id,
        `OCCURRED_AT_${
          caseLocation.locationType || loc.locationType || "LOCATION"
        }`,
      );

      // Residents
      loc.residents.forEach((resident: any) => {
        const person = resident.person;

        addNode(person.id, "PERSON", person.name || "Resident", {
          name: person.name,
          age: person.age,
          gender: person.gender,
          aliases: person.aliases,
        });

        addEdge(person.id, loc.id, "RESIDES_AT");
      });
    });

    // ---------------------------------------------------------
    // 9. ORGANIZATIONS
    // ---------------------------------------------------------

    caseObj.organizations.forEach((caseOrganization: any) => {
      const org = caseOrganization.organization;

      addNode(org.id, "ORGANIZATION", org.name, {
        description: org.description,
        organizationType: org.organizationType,
        context: caseOrganization.context,
        confidence: caseOrganization.confidence,
      });

      addEdge(caseObj.id, org.id, "ORGANIZATION_INVOLVED");

      org.members.forEach((member: any) => {
        const person = member.person;

        addNode(person.id, "PERSON", person.name || "Member", {
          name: person.name,
          age: person.age,
          gender: person.gender,
          aliases: person.aliases,
        });

        addEdge(person.id, org.id, `MEMBER_OF_${member.role}`);
      });
    });

    res.status(200).json({
      success: true,
      data: {
        caseId,
        nodes,
        edges,
        similarSuspects,
      },
    });
  } catch (error: any) {
    console.error("getCaseBoard error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ============================================================
 * CASE BOARD SEARCH
 * ============================================================
 *
 * Searches cases from multiple perspectives (case metadata, people,
 * evidence/media, statements, phone numbers, vehicles, locations and
 * organizations) and returns every hit grouped by entity type so the
 * investigation board can link results to related records.
 */
export const searchCaseBoard = async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const typesParam = String(req.query.types || "");
    const enabledTypes = typesParam
      ? typesParam
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    const wants = (type: string) =>
      enabledTypes.length === 0 || enabledTypes.includes(type);

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "A search query is required",
      });
    }

    const contains = { contains: q, mode: "insensitive" as const };

    const results: Record<string, any[]> = {};

    /**
     * CASE metadata
     */
    if (wants("case")) {
      results.cases = await prisma.case.findMany({
        where: {
          OR: [
            { title: contains },
            { description: contains },
            { caseNumber: contains },
            { crimeNo: contains },
            { caseNo: contains },
          ],
        },
        take: limit,
        include: CASE_SEARCH_INCLUDE,
        orderBy: { crimeRegisteredDate: "desc" },
      });
    }

    /**
     * PEOPLE (name, aliases, notes/statements in their case role)
     */
    if (wants("person")) {
      results.persons = await prisma.person.findMany({
        where: {
          OR: [{ name: contains }, { aliases: { has: q } }],
        },
        take: limit,
        include: {
          phones: { include: { phone: true } },
          vehicles: { include: { vehicle: true } },
          addresses: { include: { location: true } },
          organizations: { include: { organization: true } },
          caseRoles: {
            include: {
              case: {
                include: {
                  caseStatus: true,
                  crimeMajorHead: true,
                  crimeMinorHead: true,
                },
              },
            },
          },
        },
      });
    }

    /**
     * EVIDENCE / MEDIA
     */
    if (wants("evidence")) {
      results.evidence = await prisma.evidence.findMany({
        where: {
          OR: [
            { title: contains },
            { description: contains },
            { fileName: contains },
          ],
        },
        take: limit,
        include: {
          case: {
            include: {
              caseStatus: true,
              crimeMajorHead: true,
              crimeMinorHead: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    /**
     * STATEMENTS (free-text notes attached to a person within a case,
     * plus manual "Statement" evidence records)
     */
    if (wants("statement")) {
      const roleNotes = await prisma.casePerson.findMany({
        where: {
          notes: contains,
        },
        take: limit,
        include: {
          case: {
            include: {
              caseStatus: true,
              crimeMajorHead: true,
              crimeMinorHead: true,
            },
          },
          person: true,
        },
      });

      const statementEvidence = await prisma.evidence.findMany({
        where: {
          AND: [
            { title: { contains: "Statement", mode: "insensitive" } },
            { description: contains },
          ],
        },
        take: limit,
        include: {
          case: {
            include: {
              caseStatus: true,
              crimeMajorHead: true,
              crimeMinorHead: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      results.statements = [
        ...roleNotes.map((roleNote: any) => ({
          statement: roleNote.notes,
          person: roleNote.person,
          role: roleNote.role,
          caseId: roleNote.caseId,
          case: roleNote.case,
        })),
        ...statementEvidence.map((evidence: any) => ({
          statement: evidence.description,
          evidence,
          caseId: evidence.caseId,
          case: evidence.case,
        })),
      ].slice(0, limit);
    }

    /**
     * PHONE NUMBERS
     */
    if (wants("phone")) {
      results.phones = await prisma.phone.findMany({
        where: {
          OR: [{ number: contains }],
        },
        take: limit,
        include: {
          owners: { include: { person: true } },
          cases: {
            include: {
              case: {
                include: {
                  caseStatus: true,
                  crimeMajorHead: true,
                  crimeMinorHead: true,
                },
              },
            },
          },
        },
      });
    }

    /**
     * VEHICLES
     */
    if (wants("vehicle")) {
      results.vehicles = await prisma.vehicle.findMany({
        where: {
          OR: [
            { registrationNo: contains },
            { make: contains },
            { model: contains },
            { color: contains },
          ],
        },
        take: limit,
        include: {
          owners: { include: { person: true } },
          cases: {
            include: {
              case: {
                include: {
                  caseStatus: true,
                  crimeMajorHead: true,
                  crimeMinorHead: true,
                },
              },
            },
          },
        },
      });
    }

    /**
     * LOCATIONS
     */
    if (wants("location")) {
      results.locations = await prisma.location.findMany({
        where: {
          OR: [
            { address: contains },
            { districtName: contains },
            { stationName: contains },
          ],
        },
        take: limit,
        include: {
          district: true,
          policeUnit: true,
          cases: {
            include: {
              case: {
                include: {
                  caseStatus: true,
                  crimeMajorHead: true,
                  crimeMinorHead: true,
                },
              },
            },
          },
          residents: { include: { person: true } },
        },
      });
    }

    /**
     * ORGANIZATIONS
     */
    if (wants("organization")) {
      results.organizations = await prisma.organization.findMany({
        where: {
          OR: [{ name: contains }, { description: contains }],
        },
        take: limit,
        include: {
          members: { include: { person: true } },
          cases: {
            include: {
              case: {
                include: {
                  caseStatus: true,
                  crimeMajorHead: true,
                  crimeMinorHead: true,
                },
              },
            },
          },
        },
      });
    }

    const total = Object.values(results).reduce(
      (sum, items) => sum + items.length,
      0,
    );

    return res.status(200).json({
      success: true,
      query: q,
      total,
      results,
    });
  } catch (error: any) {
    console.error("searchCaseBoard error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Dashboard Summary – aggregates all key dashboard data in a single call.
 * Supports optional filters: state, crimeType, groupBy (time grain).
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as string) || "year";
    const timeOfDay = req.query.timeOfDay as string | undefined;
    const activeAlerts = req.query.activeAlerts === "true";
    const minCases = Number(req.query.minCases || 0);

    const caseWhere = buildCaseWhere(req.query);

    // ---------------------------------------------------------
    // FETCH CASES
    // ---------------------------------------------------------

    const fetchedCases = await prisma.case.findMany({
      where: caseWhere,
      include: {
        policeUnit: {
          include: {
            state: true,
            district: true,
          },
        },

        caseStatus: true,
        crimeMajorHead: true,
        crimeMinorHead: true,

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

        modusOperandi: true,

        persons: {
          where: {
            role: "SUSPECT",
          },
          select: {
            personId: true,
          },
        },
      },
    });

    const yearFilter = req.query.year as string | undefined;

    const timeFiltered = fetchedCases.filter(
      (c: any) => matchesTimeOfDay(c, timeOfDay) && matchesYear(c, yearFilter),
    );

    let cases = timeFiltered;

    if (activeAlerts) {
      const alertDistricts = computeAlertDistricts(timeFiltered);

      cases = timeFiltered.filter((c: any) => {
        const district =
          c.policeUnit?.district?.districtName ||
          c.locations?.[0]?.location?.district?.districtName ||
          "Unknown";

        return alertDistricts.has(district);
      });
    }

    const getCrimeType = (c: any) =>
      c.crimeMinorHead?.crimeHeadName ||
      c.crimeMajorHead?.crimeGroupName ||
      "Unknown";

    const getDistrict = (c: any) =>
      c.policeUnit?.district?.districtName ||
      c.locations?.[0]?.location?.district?.districtName ||
      "Unknown";

    const getState = (c: any) => c.policeUnit?.state?.stateName || "Unknown";

    const getIncidentDate = (c: any) =>
      c.incidentFromDate || c.crimeRegisteredDate;

    const totalCases = cases.length;

    // ---------------------------------------------------------
    // CRIME MIX
    // ---------------------------------------------------------

    const crimeTypeBreakdown: Record<string, number> = {};

    cases.forEach((c: any) => {
      const crimeType = getCrimeType(c);

      crimeTypeBreakdown[crimeType] = (crimeTypeBreakdown[crimeType] || 0) + 1;
    });

    const crimeMix = Object.entries(crimeTypeBreakdown).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    // ---------------------------------------------------------
    // DISTRICT STATS
    // ---------------------------------------------------------

    const districtMap: Record<
      string,
      {
        district: string;
        state: string;
        cases: number;
        crimeTypes: Record<string, number>;
      }
    > = {};

    cases.forEach((c: any) => {
      const district = getDistrict(c);
      const state = getState(c);
      const crimeType = getCrimeType(c);

      if (!districtMap[district]) {
        districtMap[district] = {
          district,
          state,
          cases: 0,
          crimeTypes: {},
        };
      }

      districtMap[district].cases++;

      districtMap[district].crimeTypes[crimeType] =
        (districtMap[district].crimeTypes[crimeType] || 0) + 1;
    });

    const districtStats = Object.values(districtMap)
      .filter((d) => d.cases >= minCases)
      .sort((a, b) => b.cases - a.cases);

    // ---------------------------------------------------------
    // ANOMALIES
    // ---------------------------------------------------------

    let anomalyCount = 0;

    cases.forEach((c: any) => {
      const hour = new Date(getIncidentDate(c)).getHours();

      const crimeType = getCrimeType(c).toUpperCase();

      if (
        ["HOMICIDE", "MURDER"].includes(crimeType) &&
        hour >= 6 &&
        hour <= 18
      ) {
        anomalyCount++;
      }

      if (crimeType === "CYBERCRIME" && c.modusOperandi?.weaponType) {
        anomalyCount++;
      }

      if (crimeType === "FRAUD" && hour >= 1 && hour <= 4) {
        anomalyCount++;
      }
    });

    // ---------------------------------------------------------
    // MO NETWORK
    // ---------------------------------------------------------

    const moMap: Record<
      string,
      {
        mo: string;
        suspects: Set<string>;
        incidents: number;
      }
    > = {};

    cases.forEach((c: any) => {
      if (!c.modusOperandi) return;

      const moName = c.modusOperandi.name;

      if (!moMap[moName]) {
        moMap[moName] = {
          mo: moName,
          suspects: new Set<string>(),
          incidents: 0,
        };
      }

      moMap[moName].incidents++;

      c.persons.forEach((person: any) => {
        moMap[moName].suspects.add(person.personId);
      });
    });

    const moNetwork = Object.values(moMap)
      .map((m) => ({
        mo: m.mo,
        suspects: m.suspects.size,
        incidents: m.incidents,
        confidence: Math.min(
          99,
          Math.round(60 + m.incidents * 3 + m.suspects.size * 2),
        ),
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // ---------------------------------------------------------
    // PREDICTIVE RISKS
    // ---------------------------------------------------------

    const predictiveRisks = districtStats.map((d) => {
      let hash = 0;

      for (let i = 0; i < d.district.length; i++) {
        hash = d.district.charCodeAt(i) + ((hash << 5) - hash);
      }

      const urbanization = Math.min(98, Math.max(15, Math.abs(hash % 85) + 12));

      const unemployment = parseFloat(
        (3.5 + Math.abs((hash >> 2) % 12) * 0.8).toFixed(1),
      );

      const forecast = Math.min(
        100,
        Math.round(
          d.cases * 2.5 + unemployment * 3.5 + urbanization * 0.3 - 10,
        ),
      );

      const risk = forecast > 75 ? "high" : forecast > 45 ? "medium" : "low";

      return {
        id: d.district.toLowerCase().replace(/\s+/g, "-"),

        name: d.district,
        state: d.state,
        cases: d.cases,
        risk,
        forecast,
        urbanization,
        unemployment,

        anomaly:
          risk === "high"
            ? "Elevated activity above baseline threshold"
            : risk === "medium"
              ? "Moderate deviation from expected patterns"
              : "Within normal operating range",
      };
    });

    // ---------------------------------------------------------
    // TIMELINE
    // ---------------------------------------------------------

    const timelineMap: Record<
      string,
      {
        label: string;
        cases: number;
        crimeTypes: Record<string, number>;
      }
    > = {};

    cases.forEach((c: any) => {
      const date = new Date(getIncidentDate(c));

      let label: string;

      if (groupBy === "day") {
        label = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const oneJan = new Date(date.getFullYear(), 0, 1);

        const numberOfDays = Math.floor(
          (date.getTime() - oneJan.getTime()) / 86400000,
        );

        const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);

        label = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
      } else if (groupBy === "year") {
        label = date.getFullYear().toString();
      } else {
        label = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
      }

      if (!timelineMap[label]) {
        timelineMap[label] = {
          label,
          cases: 0,
          crimeTypes: {},
        };
      }

      timelineMap[label].cases++;

      const crimeType = getCrimeType(c);

      timelineMap[label].crimeTypes[crimeType] =
        (timelineMap[label].crimeTypes[crimeType] || 0) + 1;
    });

    const timeline = Object.values(timelineMap)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => ({
        label: t.label,
        cases: t.cases,

        forecast: Math.round(t.cases * 1.12),

        // Deterministic instead of Math.random()
        sentiment: Math.max(
          -82,
          Math.min(
            36,
            -28 + Math.round(t.cases > 10 ? 8 : t.cases > 5 ? 2 : -5),
          ),
        ),

        ...t.crimeTypes,
      }));

    // ---------------------------------------------------------
    // HIGH RISK
    // ---------------------------------------------------------

    const highRiskCount = predictiveRisks.filter(
      (d) => d.risk === "high",
    ).length;

    // ---------------------------------------------------------
    // SOCIOECONOMIC POINTS
    // ---------------------------------------------------------

    const socioeconomicPoints = predictiveRisks.map((d) => ({
      name: d.name,
      urbanization: d.urbanization,
      unemployment: d.unemployment,
      cases: d.cases,
      forecast: d.forecast,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        anomalyCount,
        highRiskCount,
        moCount: moNetwork.length,
        crimeMix,
        districtStats,
        moNetwork,
        predictiveRisks,
        timeline,
        socioeconomicPoints,
      },
    });
  } catch (error: any) {
    console.error("getDashboardSummary error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Map Data – returns filterable geospatial crime points grouped by state/district.
 * Used by the CrimeMap page for overlay rendering and markers.
 */
export const getMapData = async (req: Request, res: Response) => {
  try {
    const riskLevel = req.query.riskLevel as string | undefined;
    const timeOfDay = req.query.timeOfDay as string | undefined;
    const activeAlerts = req.query.activeAlerts === "true";
    const minCases = Number(req.query.minCases || 0);

    const caseWhere = buildCaseWhere(req.query);

    // ---------------------------------------------------------
    // FETCH CASES
    // ---------------------------------------------------------

    const cases = await prisma.case.findMany({
      where: caseWhere,

      include: {
        policeUnit: {
          include: {
            state: true,
            district: true,
          },
        },

        caseStatus: true,
        crimeMajorHead: true,
        crimeMinorHead: true,

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
      },
    });

    // ---------------------------------------------------------
    // BACKEND POST-FILTERS (time of day, year, active alerts)
    // ---------------------------------------------------------

    const yearFilter = req.query.year as string | undefined;

    const timeFiltered = cases.filter(
      (c: any) => matchesTimeOfDay(c, timeOfDay) && matchesYear(c, yearFilter),
    );

    let activeFiltered = timeFiltered;

    if (activeAlerts) {
      const alertDistricts = computeAlertDistricts(timeFiltered);

      activeFiltered = timeFiltered.filter((c: any) => {
        const district =
          c.policeUnit?.district?.districtName ||
          c.locations?.[0]?.location?.district?.districtName ||
          "Unknown";

        return alertDistricts.has(district);
      });
    }

    const getCrimeType = (c: any) =>
      c.crimeMinorHead?.crimeHeadName ||
      c.crimeMajorHead?.crimeGroupName ||
      "Unknown";

    const getIncidentDate = (c: any) =>
      c.incidentFromDate || c.crimeRegisteredDate;

    // ---------------------------------------------------------
    // GEOSPATIAL POINTS
    // ---------------------------------------------------------

    const points = activeFiltered.flatMap((c: any) =>
      c.locations.map((caseLocation: any) => {
        const location = caseLocation.location;

        const district =
          location.district?.districtName ||
          c.policeUnit?.district?.districtName ||
          "Unknown";

        const state = c.policeUnit?.state?.stateName || "Unknown";

        return {
          caseId: c.id,
          caseNumber: c.caseNumber,
          title: c.title,

          crimeType: getCrimeType(c),

          incidentDate: getIncidentDate(c),

          status: c.caseStatus?.caseStatusName || "Unknown",

          latitude: location.latitude,
          longitude: location.longitude,

          district,
          state,

          stationName:
            location.policeUnit?.unitName ||
            c.policeUnit?.unitName ||
            "Unknown",

          policeUnitId: location.policeUnit?.id || c.policeUnitId,

          address: location.address,

          locationType: caseLocation.locationType || location.locationType,

          description: caseLocation.description,

          occurredAt: caseLocation.occurredAt,

          accuracyMeters: location.accuracyMeters,

          source: location.source,
        };
      }),
    );

    // ---------------------------------------------------------
    // STATE GROUPS
    // ---------------------------------------------------------

    const stateGroups: Record<
      string,
      {
        state: string;
        totalCases: number;
        crimeTypes: Record<string, number>;
        districts: Record<string, number>;
      }
    > = {};

    points.forEach((point: any) => {
      const state = point.state || "Unknown";

      if (!stateGroups[state]) {
        stateGroups[state] = {
          state,
          totalCases: 0,
          crimeTypes: {},
          districts: {},
        };
      }

      stateGroups[state].totalCases++;

      stateGroups[state].crimeTypes[point.crimeType] =
        (stateGroups[state].crimeTypes[point.crimeType] || 0) + 1;

      const district = point.district || "Unknown";

      stateGroups[state].districts[district] =
        (stateGroups[state].districts[district] || 0) + 1;
    });

    // ---------------------------------------------------------
    // STATE RISK
    // ---------------------------------------------------------

    const stateStats = Object.values(stateGroups).map((stateGroup) => {
      const riskScore = Math.min(100, Math.round(stateGroup.totalCases * 2.5));

      const riskLevelValue =
        riskScore > 75 ? "high" : riskScore > 45 ? "medium" : "low";

      return {
        ...stateGroup,
        riskScore,
        riskLevel: riskLevelValue,
      };
    });

    // ---------------------------------------------------------
    // MINIMUM CASES + RISK FILTER
    // ---------------------------------------------------------

    let filteredStateStats = stateStats.filter(
      (state) => state.totalCases >= minCases,
    );

    if (riskLevel && riskLevel !== "All Risk Levels") {
      filteredStateStats = filteredStateStats.filter(
        (state) => state.riskLevel === riskLevel.toLowerCase(),
      );
    }

    // When no state/district is selected, only surface points for states that
    // pass the minimum-cases + risk filters.
    const stateSelected = req.query.state && req.query.state !== "All States";
    const districtSelected =
      req.query.district && req.query.district !== "All Districts";

    let visiblePoints = points;

    if (!stateSelected && !districtSelected) {
      const visibleStates = new Set(filteredStateStats.map((s) => s.state));

      visiblePoints = points.filter((point: any) =>
        visibleStates.has(point.state),
      );
    }

    // ---------------------------------------------------------
    // RESPONSE (always normalized — never empty/undefined arrays)
    // ---------------------------------------------------------

    const highRiskCount = filteredStateStats.filter(
      (state) => state.riskLevel === "high" || state.riskLevel === "critical",
    ).length;

    res.status(200).json({
      success: true,

      data: {
        totalPoints: visiblePoints.length,

        points: visiblePoints,

        stateStats: filteredStateStats,

        summary: {
          totalCases: visiblePoints.length,

          highRiskCount,

          statesWithData: stateStats.length,
        },
      },
    });
  } catch (error: any) {
    console.error("getMapData error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
