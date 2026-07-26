import type { Request, Response } from "express";
import { prisma } from "../config/prisma.config.js";
export const getGeospatialPoints = async (req: Request, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        locations: {
          include: {
            location: true,
          },
        },
      },
    });

    const points = cases.flatMap((c) =>
      c.locations.map((cl) => ({
        caseId: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        crimeType: c.crimeType,
        incidentDate: c.incidentDate,
        status: c.status,
        address: cl.location.address,
        latitude: cl.location.latitude,
        longitude: cl.location.longitude,
        locationType: cl.location.locationType,
        district: cl.location.district,
        station: cl.location.station,
      })),
    );

    res.status(200).json({
      success: true,
      count: points.length,
      data: points,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. District & Station Level Stats (Drill-down)
 * Aggregates crime counts, crime status, and crime categories by district and specific police stations.
 */
export const getDistrictStats = async (req: Request, res: Response) => {
  try {
    const stations = await prisma.policeStation.findMany({
      include: {
        cases: {
          select: {
            id: true,
            crimeType: true,
            status: true,
          },
        },
      },
    });

    // Compute district level aggregates and station level aggregates
    const stationStats = stations.map((s) => {
      const totalCases = s.cases.length;
      const typeBreakdown = s.cases.reduce(
        (acc, c) => {
          acc[c.crimeType] = (acc[c.crimeType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const statusBreakdown = s.cases.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        stationId: s.id,
        stationName: s.name,
        district: s.district,
        totalCases,
        typeBreakdown,
        statusBreakdown,
      };
    });

    // Group station stats by district
    const districtGroups = stationStats.reduce(
      (acc, stat) => {
        const district = stat.district || "Unknown District";
        if (!acc[district]) {
          acc[district] = {
            district,
            totalCases: 0,
            stations: [],
            typeBreakdown: {} as Record<string, number>,
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

        // Merge type breakdown
        Object.entries(stat.typeBreakdown).forEach(([type, count]) => {
          acc[district].typeBreakdown[type] =
            (acc[district].typeBreakdown[type] || 0) + count;
        });

        return acc;
      },
      {} as Record<string, any>,
    );

    res.status(200).json({
      success: true,
      data: Object.values(districtGroups),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Emerging Trend Alerts & Spatiotemporal Hotspots
 * Compares recent crime rates (last 30 days) to historical records to detect spikes (pulsing red-zones).
 */
export const getTrendAlerts = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Fetch recent cases
    const recentCases = await prisma.case.findMany({
      where: {
        incidentDate: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        station: true,
      },
    });

    // Fetch all-time crime type count by district
    const allLocations = await prisma.location.findMany({
      include: {
        cases: {
          include: {
            case: true,
          },
        },
      },
    });

    // Compile baseline counts (district -> crimeType -> count)
    const baseline: Record<string, Record<string, number>> = {};
    let totalHistorical = 0;

    allLocations.forEach((loc) => {
      const district = loc.district || "Unknown District";
      if (!baseline[district]) baseline[district] = {};

      loc.cases.forEach((cl) => {
        const type = cl.case.crimeType;
        baseline[district][type] = (baseline[district][type] || 0) + 1;
        totalHistorical++;
      });
    });

    // Group recent crimes by district and type
    const recent: Record<string, Record<string, number>> = {};
    recentCases.forEach((c) => {
      const district = c.station.district || "Unknown District";
      const type = c.crimeType;

      if (!recent[district]) recent[district] = {};
      recent[district][type] = (recent[district][type] || 0) + 1;
    });

    // Compute threshold violations (spikes)
    const alerts: any[] = [];
    const baseAvgWeight = totalHistorical > 0 ? 30 / totalHistorical : 1; // expected weight of 30 days relative to total history

    Object.entries(recent).forEach(([district, types]) => {
      Object.entries(types).forEach(([type, recentCount]) => {
        const historicalCount = baseline[district]?.[type] || 0;
        // If historical baseline is small, set a low baseline average
        const expectedCount = Math.max(1, historicalCount * baseAvgWeight);

        // If current count exceeds expected count by a threshold (e.g. 1.5x and count >= 2)
        const ratio = recentCount / expectedCount;
        if (ratio > 1.3 && recentCount >= 2) {
          alerts.push({
            district,
            crimeType: type,
            recentCount,
            baselineExpected: parseFloat(expectedCount.toFixed(2)),
            spikeRatio: parseFloat(ratio.toFixed(2)),
            severity: ratio > 2.0 ? "CRITICAL" : "WARNING",
            pulsingIndicator: true,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      alertCount: alerts.length,
      alerts,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Graph & Network Analysis (Prisma-powered)
 * Returns nodes and edges from Prisma database for interactive graph visualization.
 */
// export const getNetworkGraph = async (req: Request, res: Response) => {
//   try {
//     const persons = await prisma.person.findMany({
//       include: {
//         incomingRelationships: true,
//         outgoingRelationships: true,
//         phones: true,
//         vehicles: true,
//         addresses: true,
//         organization: { include: { organization: true } },
//         cases: { include: { case: true } },
//       },
//       take: 100,
//     });

//     const nodesMap: Record<string, any> = {};
//     const edges: any[] = [];

//     persons.forEach((p) => {
//       nodesMap[p.id] = {
//         id: p.id,
//         labels: ["Person"],
//         properties: {
//           name: p.name,
//           age: p.age,
//           gender: p.gender,
//           riskScore: p.riskScore,
//           aliases: p.aliases,
//         },
//       };

//       p.outgoingRelationships.forEach((rel) => {
//         edges.push({
//           id: rel.id,
//           source: rel.sourcePersonId,
//           target: rel.targetPersonId,
//           type: rel.relationType,
//           properties: { confidence: rel.confidence },
//         });
//       });

//       p.phones.forEach((ph) => {
//         nodesMap[ph.id] = {
//           id: ph.id,
//           labels: ["Phone"],
//           properties: { number: ph.number },
//         };
//         edges.push({
//           id: `rel-${p.id}-${ph.id}`,
//           source: p.id,
//           target: ph.id,
//           type: "OWNER",
//           properties: {},
//         });
//       });

//       p.vehicles.forEach((v) => {
//         nodesMap[v.id] = {
//           id: v.id,
//           labels: ["Vehicle"],
//           properties: {
//             registrationNo: v.registrationNo,
//             make: v.make,
//             model: v.model,
//           },
//         };
//         edges.push({
//           id: `rel-${p.id}-${v.id}`,
//           source: p.id,
//           target: v.id,
//           type: "OWNS_VEHICLE",
//           properties: {},
//         });
//       });

//       p.addresses.forEach((loc) => {
//         nodesMap[loc.id] = {
//           id: loc.id,
//           labels: ["Location"],
//           properties: { address: loc.address, district: loc.district },
//         };
//         edges.push({
//           id: `rel-${p.id}-${loc.id}`,
//           source: p.id,
//           target: loc.id,
//           type: "LIVES_AT",
//           properties: {},
//         });
//       });

//       p.organization.forEach((om) => {
//         nodesMap[om.organization.id] = {
//           id: om.organization.id,
//           labels: ["Organization"],
//           properties: { name: om.organization.name },
//         };
//         edges.push({
//           id: `rel-${p.id}-${om.organization.id}`,
//           source: p.id,
//           target: om.organization.id,
//           type: "MEMBER_OF",
//           properties: { role: om.role },
//         });
//       });

//       p.cases.forEach((cp) => {
//         nodesMap[cp.case.id] = {
//           id: cp.case.id,
//           labels: ["Case"],
//           properties: {
//             caseNumber: cp.case.caseNumber,
//             title: cp.case.title,
//             crimeType: cp.case.crimeType,
//           },
//         };
//         edges.push({
//           id: `rel-${p.id}-${cp.case.id}`,
//           source: p.id,
//           target: cp.case.id,
//           type: "INVOLVED_IN",
//           properties: { role: cp.role },
//         });
//       });
//     });

//     res.status(200).json({
//       success: true,
//       data: {
//         nodes: Object.values(nodesMap),
//         edges,
//       },
//     });
//   } catch (error: any) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

export const getNetworkGraph = async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      include: {
        incomingRelationships: true,
        outgoingRelationships: true,
        phones: true,
        vehicles: true,
        addresses: true,
        organization: {
          include: {
            organization: true,
          },
        },
        cases: {
          include: {
            case: true,
          },
        },
      },
      take: 100,
    });

    const nodesMap: Record<string, any> = {};
    const edges: any[] = [];

    persons.forEach((p) => {
      // ------------------------
      // PERSON
      // ------------------------
      nodesMap[p.id] = {
        id: p.id,
        type: "personNode",
        position: { x: 0, y: 0 },

        data: {
          entityType: "person",
          recordId: p.id,
          label: p.name,
          role: "Person",
          age: p.age,
          gender: p.gender,
          riskScore: p.riskScore,
          aliases: p.aliases,
        },
      };

      // ------------------------
      // PERSON RELATIONSHIPS
      // ------------------------
      p.outgoingRelationships.forEach((rel) => {
        edges.push({
          id: rel.id,
          source: rel.sourcePersonId,
          target: rel.targetPersonId,
          label: rel.relationType,
          data: {
            entityType: "relationship",
            recordId: rel.id,
            confidence: rel.confidence,
          },
        });
      });

      // ------------------------
      // PHONES
      // ------------------------
      p.phones.forEach((phone) => {
        if (!nodesMap[phone.id]) {
          nodesMap[phone.id] = {
            id: phone.id,
            type: "evidenceNode",
            position: { x: 0, y: 0 },

            data: {
              entityType: "phone",
              recordId: phone.id,
              title: phone.number,
              category: "Phone",
            },
          };
        }

        edges.push({
          id: `phone-${p.id}-${phone.id}`,
          source: p.id,
          target: phone.id,
          label: "Owns",
        });
      });

      // ------------------------
      // VEHICLES
      // ------------------------
      p.vehicles.forEach((vehicle) => {
        if (!nodesMap[vehicle.id]) {
          nodesMap[vehicle.id] = {
            id: vehicle.id,
            type: "vehicleNode",
            position: { x: 0, y: 0 },

            data: {
              entityType: "vehicle",
              recordId: vehicle.id,
              registrationNo: vehicle.registrationNo,
              make: vehicle.make,
              model: vehicle.model,
              color: vehicle.color,
            },
          };
        }

        edges.push({
          id: `vehicle-${p.id}-${vehicle.id}`,
          source: p.id,
          target: vehicle.id,
          label: "Owns Vehicle",
        });
      });

      // ------------------------
      // ADDRESSES
      // ------------------------
      p.addresses.forEach((address) => {
        if (!nodesMap[address.id]) {
          nodesMap[address.id] = {
            id: address.id,
            type: "locationNode",
            position: { x: 0, y: 0 },

            data: {
              entityType: "location",
              recordId: address.id,
              title: address.address,
              district: address.district,
              latitude: address.latitude,
              longitude: address.longitude,
            },
          };
        }

        edges.push({
          id: `address-${p.id}-${address.id}`,
          source: p.id,
          target: address.id,
          label: "Lives At",
        });
      });

      // ------------------------
      // ORGANIZATIONS
      // ------------------------
      p.organization.forEach((member) => {
        const org = member.organization;

        if (!nodesMap[org.id]) {
          nodesMap[org.id] = {
            id: org.id,
            type: "caseNode",
            position: { x: 0, y: 0 },

            data: {
              entityType: "organization",
              recordId: org.id,
              title: org.name,
              category: "Organization",
            },
          };
        }

        edges.push({
          id: `org-${p.id}-${org.id}`,
          source: p.id,
          target: org.id,
          label: member.role || "Member Of",
        });
      });

      // ------------------------
      // CASES
      // ------------------------
      p.cases.forEach((pc) => {
        const c = pc.case;

        if (!nodesMap[c.id]) {
          nodesMap[c.id] = {
            id: c.id,
            type: "incidentNode",
            position: { x: 0, y: 0 },

            data: {
              entityType: "incident",
              recordId: c.id,
              title: c.title,
              incidentNumber: c.caseNumber,
              category: c.crimeType,
              status: c.status,
            },
          };
        }

        edges.push({
          id: `case-${p.id}-${c.id}`,
          source: p.id,
          target: c.id,
          label: pc.role || "Involved In",
        });
      });
    });

    res.status(200).json({
      success: true,
      data: {
        nodes: Object.values(nodesMap),
        edges,
      },
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * 5. Repeat Offender Tracking
 * Aggregates suspects linked to multiple incidents, analyzing their Modus Operandi and risk profile.
 */
export const getRepeatOffenders = async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      include: {
        cases: {
          include: {
            case: {
              include: {
                modusOperandi: true,
                station: true,
              },
            },
          },
        },
        phones: true,
        vehicles: true,
        addresses: true,
      },
    });

    const profiles = persons
      .map((p) => {
        const caseInvolvements = p.cases.map((cp) => ({
          caseId: cp.case.id,
          caseNumber: cp.case.caseNumber,
          title: cp.case.title,
          role: cp.role,
          crimeType: cp.case.crimeType,
          incidentDate: cp.case.incidentDate,
          modusOperandi: cp.case.modusOperandi,
          stationName: cp.case.station.name,
          district: cp.case.station.district,
        }));

        const totalCases = caseInvolvements.length;
        const suspectCases = caseInvolvements.filter(
          (c) => c.role === "SUSPECT",
        );

        // Calculate a dynamic risk score based on number of cases involved, role, and historical average
        const baseScore =
          suspectCases.length * 25 + (totalCases - suspectCases.length) * 5;
        const calculatedRiskScore = Math.min(100, baseScore);

        // Collect common Modus Operandi descriptors
        const moPatterns = caseInvolvements
          .map((c) => c.modusOperandi?.description)
          .filter(Boolean) as string[];

        return {
          id: p.id,
          name: p.name || "Unknown Suspect",
          age: p.age,
          gender: p.gender,
          aliases: p.aliases,
          calculatedRiskScore,
          totalCases,
          suspectCaseCount: suspectCases.length,
          cases: caseInvolvements,
          moPatterns,
          phones: p.phones.map((ph) => ph.number),
          vehicles: p.vehicles.map((v) => v.registrationNo),
          addresses: p.addresses.map((a) => a.address),
        };
      })
      .filter((profile) => profile.totalCases > 1) // repeat offenders have 2 or more cases
      .sort((a, b) => b.calculatedRiskScore - a.calculatedRiskScore);

    res.status(200).json({
      success: true,
      count: profiles.length,
      data: profiles,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Association Detection (Prisma-powered)
 * Connects suspects that share a common Phone, Vehicle, Location, or Organization.
 */
export const getAssociationNetworks = async (req: Request, res: Response) => {
  try {
    const persons = await prisma.person.findMany({
      include: {
        phones: true,
        vehicles: true,
        addresses: true,
        organization: { include: { organization: true } },
      },
    });

    const associations: any[] = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        const p1 = persons[i];
        const p2 = persons[j];
        if (!p1.name || !p2.name) continue;

        // Check shared phones
        const sharedPhones = p1.phones.filter((ph1) =>
          p2.phones.some((ph2) => ph2.id === ph1.id),
        );
        sharedPhones.forEach((ph) => {
          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,
            sharedEntityType: "Phone",
            sharedEntityValue: ph.number,
            connectionDescription: `Both suspects are connected via Phone (${ph.number})`,
          });
        });

        // Check shared vehicles
        const sharedVehicles = p1.vehicles.filter((v1) =>
          p2.vehicles.some((v2) => v2.id === v1.id),
        );
        sharedVehicles.forEach((v) => {
          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,
            sharedEntityType: "Vehicle",
            sharedEntityValue: v.registrationNo,
            connectionDescription: `Both suspects are connected via Vehicle (${v.registrationNo})`,
          });
        });

        // Check shared locations
        const sharedLocs = p1.addresses.filter((l1) =>
          p2.addresses.some((l2) => l2.id === l1.id),
        );
        sharedLocs.forEach((l) => {
          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,
            sharedEntityType: "Location",
            sharedEntityValue: l.address,
            connectionDescription: `Both suspects are connected via Location (${l.address})`,
          });
        });

        // Check shared organizations
        const sharedOrgs = p1.organization.filter((o1) =>
          p2.organization.some((o2) => o2.organizationId === o1.organizationId),
        );
        sharedOrgs.forEach((o) => {
          associations.push({
            suspect1: p1.name,
            suspect2: p2.name,
            sharedEntityType: "Organization",
            sharedEntityValue: o.organization.name,
            connectionDescription: `Both suspects are connected via Organization (${o.organization.name})`,
          });
        });
      }
    }

    res.status(200).json({
      success: true,
      count: associations.length,
      data: associations,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Sociological & AI-Driven Predictive Dashboards
 * Overlays crime rates with synthesized socio-economic indicators and returns forecasting metrics.
 */
export const getPredictiveStats = async (req: Request, res: Response) => {
  try {
    const districtStats = await prisma.location.groupBy({
      by: ["district"],
      _count: {
        id: true,
      },
    });

    // Overlays actual database counts with structured socio-economic predictors
    const dashboard = districtStats.map((d, index) => {
      const district = d.district || "Unknown District";
      const incidentCount = d._count.id;

      // Generate deterministic correlation parameters based on district name hash & count
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

      // Compute predictive risk index
      const predictedRiskScore = Math.min(
        100,
        Math.round(
          incidentCount * 2.5 +
            unemploymentRate * 3.5 +
            urbanizationRate * 0.3 -
            literacyRate * 0.2,
        ),
      );

      // Forecast crime rate trends for next 3 months (spatially calculated)
      const forecastTrend =
        predictedRiskScore > 65
          ? "INCREASING"
          : predictedRiskScore < 40
            ? "DECREASING"
            : "STABLE";

      return {
        district,
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
    });

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Anomaly Detection
 * Finds incidents that deviate from standard behavioral patterns (e.g. unexpected crime type or abnormal time).
 */
export const getAnomalies = async (req: Request, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        modusOperandi: true,
        station: true,
      },
    });

    // Simple behavioral pattern baseline: homicides or robberies occurring at unusual times/locations
    const anomalies = cases
      .map((c) => {
        const hour = new Date(c.incidentDate).getHours();
        const mo = c.modusOperandi;
        const reasons: string[] = [];

        // Pattern checks
        if (
          (c.crimeType === "HOMICIDE" || c.crimeType === "MURDER") &&
          hour >= 6 &&
          hour <= 18
        ) {
          reasons.push("Homicide occurring during broad daylight");
        }
        if (c.crimeType === "CYBERCRIME" && mo?.weaponType) {
          reasons.push(
            `Cybercrime involving a physical weapon pattern (${mo.weaponType})`,
          );
        }
        if (hour >= 1 && hour <= 4 && c.crimeType === "FRAUD") {
          reasons.push(
            "Fraud/cyber financial activity peak in midnight (1am - 4am)",
          );
        }

        if (reasons.length > 0) {
          return {
            caseId: c.id,
            caseNumber: c.caseNumber,
            title: c.title,
            crimeType: c.crimeType,
            incidentDate: c.incidentDate,
            hour,
            district: c.station.district,
            reasons,
            anomalyScore: reasons.length * 35,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.status(200).json({
      success: true,
      count: anomalies.length,
      data: anomalies,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- ADDITIONAL VISUALIZATION ENDPOINTS FOR ADVANCED CASE BOARD & TIMELINE ---

function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  let i: number, j: number;
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
  if (n1 === n2) return 1.0;
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;
  const distance = getLevenshteinDistance(n1, n2);
  return 1.0 - distance / maxLen;
}

export async function calculatePersonSimilarity(targetPersonId: string) {
  const target = await prisma.person.findUnique({
    where: { id: targetPersonId },
    include: {
      phones: true,
      vehicles: true,
      addresses: true,
      cases: {
        include: {
          case: true,
        },
      },
    },
  });

  if (!target) return [];

  const others = await prisma.person.findMany({
    where: {
      id: { not: targetPersonId },
    },
    include: {
      phones: true,
      vehicles: true,
      addresses: true,
      cases: {
        include: {
          case: true,
        },
      },
    },
  });

  const targetPhones = target.phones.map((p) => p.number);
  const targetVehicles = target.vehicles
    .map((v) => v.registrationNo)
    .filter(Boolean) as string[];
  const targetLocations = target.addresses.map(
    (l) => `${l.latitude.toFixed(4)},${l.longitude.toFixed(4)}`,
  );
  const targetCases = target.cases.map((c) => c.caseId);

  const matches = others
    .map((other) => {
      let confidence = 0;
      const reasons: string[] = [];

      if (target.name && other.name) {
        const nameSim = getNameSimilarity(target.name, other.name);
        if (nameSim > 0.75) {
          confidence += Math.round(nameSim * 35);
          reasons.push(
            `Similar name: "${other.name}" (confidence: ${Math.round(nameSim * 100)}%)`,
          );
        }
      }

      if (target.age && other.age) {
        const ageDiff = Math.abs(target.age - other.age);
        if (ageDiff <= 3) {
          confidence += 10;
          reasons.push(
            `Similar age group (age: ${other.age}, diff: ${ageDiff} years)`,
          );
        }
      }

      const aliasOverlap = target.aliases.filter((a) =>
        other.aliases.includes(a),
      );
      if (aliasOverlap.length > 0) {
        confidence += 25;
        reasons.push(`Matching aliases: ${aliasOverlap.join(", ")}`);
      }

      const otherPhones = other.phones.map((p) => p.number);
      const sharedPhones = otherPhones.filter((num) =>
        targetPhones.includes(num),
      );
      if (sharedPhones.length > 0) {
        confidence += 50;
        reasons.push(`Shared contact numbers: ${sharedPhones.join(", ")}`);
      }

      const otherVehicles = other.vehicles
        .map((v) => v.registrationNo)
        .filter(Boolean) as string[];
      const sharedVehicles = otherVehicles.filter((reg) =>
        targetVehicles.includes(reg),
      );
      if (sharedVehicles.length > 0) {
        confidence += 50;
        reasons.push(`Shared vehicles: ${sharedVehicles.join(", ")}`);
      }

      const otherLocations = other.addresses.map(
        (l) => `${l.latitude.toFixed(4)},${l.longitude.toFixed(4)}`,
      );
      const sharedLocations = otherLocations.filter((loc) =>
        targetLocations.includes(loc),
      );
      if (sharedLocations.length > 0) {
        confidence += 20;
        reasons.push(`Both associated with same locations`);
      }

      const otherCases = other.cases.map((c) => c.caseId);
      const sharedCases = otherCases.filter((cid) => targetCases.includes(cid));
      if (sharedCases.length > 0) {
        confidence += 15;
        reasons.push(
          `Found in same case investigations: ${sharedCases.length} shared case(s)`,
        );
      }

      let finalConfidence = Math.min(100, confidence);
      if (
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
          phones: other.phones.map((p) => p.number),
          vehicles: other.vehicles.map((v) => v.registrationNo),
          cases: other.cases.map((c) => ({
            caseId: c.case.id,
            caseNumber: c.case.caseNumber,
            title: c.case.title,
            role: c.role,
          })),
        },
        confidence: finalConfidence,
        reasons,
      };
    })
    .filter((match) => match.confidence >= 25)
    .sort((a, b) => b.confidence - a.confidence);

  return matches;
}

export const getSimilarPersons = async (req: Request, res: Response) => {
  try {
    const personId = req.params.personId as string;
    const matches = await calculatePersonSimilarity(personId);
    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTimelineStats = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as string) || "month";

    const cases = await prisma.case.findMany({
      orderBy: {
        incidentDate: "asc",
      },
      include: {
        locations: {
          include: {
            location: true,
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

    cases.forEach((c) => {
      const date = new Date(c.incidentDate);
      let timeLabel = "";

      if (groupBy === "day") {
        timeLabel = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const oneJan = new Date(date.getFullYear(), 0, 1);
        const numberOfDays = Math.floor(
          (date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000),
        );
        const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
        timeLabel = `${date.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
      } else if (groupBy === "year") {
        timeLabel = date.getFullYear().toString();
      } else {
        timeLabel = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      }

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
      bucket.crimeTypes[c.crimeType] =
        (bucket.crimeTypes[c.crimeType] || 0) + 1;

      c.locations.forEach((cl) => {
        const district = cl.location.district || "Unknown District";
        bucket.districts[district] = (bucket.districts[district] || 0) + 1;

        bucket.incidents.push({
          caseId: c.id,
          caseNumber: c.caseNumber,
          title: c.title,
          crimeType: c.crimeType,
          incidentDate: c.incidentDate,
          latitude: cl.location.latitude,
          longitude: cl.location.longitude,
          district: cl.location.district,
          address: cl.location.address,
        });
      });
    });

    const sortedBuckets = Object.keys(timelineMap)
      .sort()
      .map((key) => timelineMap[key]);

    let cumulativeTotal = 0;
    const data = sortedBuckets.map((bucket) => {
      cumulativeTotal += bucket.caseCount;
      return {
        ...bucket,
        cumulativeTotal,
      };
    });

    res.status(200).json({
      success: true,
      groupBy,
      data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCaseBoard = async (req: Request, res: Response) => {
  try {
    const caseId = req.params.caseId as string;

    const caseObj = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        station: true,
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
                phones: true,
                vehicles: true,
                addresses: true,
                cases: {
                  include: {
                    case: true,
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
                owners: true,
                cases: {
                  include: {
                    case: true,
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
                owners: true,
                cases: {
                  include: {
                    case: true,
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
                residents: true,
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
      res.status(404).json({ success: false, message: "Case not found" });
      return;
    }

    const nodes: any[] = [];
    const edges: any[] = [];
    const similarSuspects: any[] = [];

    // 1. Add central case node
    nodes.push({
      id: caseObj.id,
      type: "CASE",
      label: caseObj.caseNumber,
      properties: {
        title: caseObj.title,
        crimeType: caseObj.crimeType,
        status: caseObj.status,
        incidentDate: caseObj.incidentDate,
        description: caseObj.description,
      },
    });

    // 2. Modus Operandi
    if (caseObj.modusOperandi) {
      const mo = caseObj.modusOperandi;
      nodes.push({
        id: mo.id,
        type: "MODUS_OPERANDI",
        label: mo.name,
        properties: {
          description: mo.description,
          weaponType: mo.weaponType,
          timePattern: mo.timePattern,
          vehiclePattern: mo.vehiclePattern,
        },
      });
      edges.push({
        id: `edge-case-mo-${mo.id}`,
        source: caseObj.id,
        target: mo.id,
        type: "EXECUTION_PATTERN",
      });
    }

    // 3. Police Station
    if (caseObj.station) {
      const ps = caseObj.station;
      nodes.push({
        id: ps.id,
        type: "POLICE_STATION",
        label: ps.name,
        properties: {
          district: ps.district,
        },
      });
      edges.push({
        id: `edge-case-station-${ps.id}`,
        source: caseObj.id,
        target: ps.id,
        type: "REGISTERED_AT",
      });
    }

    // Keep track of visited nodes to avoid duplicates
    const addedNodeIds: Record<string, boolean> = {};
    addedNodeIds[caseObj.id] = true;
    if (caseObj.modusOperandiId) {
      addedNodeIds[caseObj.modusOperandiId] = true;
    }
    if (caseObj.stationId) {
      addedNodeIds[caseObj.stationId] = true;
    }

    // Helper to push node
    const addNode = (
      id: string,
      type: string,
      label: string,
      properties: any,
    ) => {
      if (!id) return false;
      if (!addedNodeIds[id]) {
        addedNodeIds[id] = true;
        nodes.push({ id, type, label, properties });
        return true;
      }
      return false;
    };

    // Helper to push edge
    const addEdge = (source: string, target: string, type: string) => {
      const id = `edge-${source}-${target}-${type}`;
      edges.push({ id, source, target, type });
    };

    // 4. Case Evidences
    caseObj.evidences.forEach((ev: any) => {
      addNode(ev.id, "EVIDENCE", ev.type, {
        description: ev.description,
        fileUrl: ev.fileUrl,
        uploadedByBadge: ev.uploadedBy?.badgeNumber,
        uploadedByName: ev.uploadedBy?.name,
      });
      addEdge(caseObj.id, ev.id, "HAS_EVIDENCE");
    });

    // 5. Persons (Suspects, Victims, Witnesses, Informants)
    for (const cp of caseObj.persons) {
      const p = cp.person;
      const properties = {
        name: p.name,
        age: p.age,
        gender: p.gender,
        aliases: p.aliases,
        riskScore: p.riskScore,
        roleInCase: cp.role,
      };

      addNode(p.id, "PERSON", p.name || "Unknown Person", properties);
      addEdge(p.id, caseObj.id, `INVOLVED_AS_${cp.role}`);

      // Calculate similarities for SUSPECTS
      if (cp.role === "SUSPECT") {
        const similarities = await calculatePersonSimilarity(p.id);
        similarities.forEach((sim: any) => {
          similarSuspects.push({
            suspectInCase: { id: p.id, name: p.name },
            matchedCandidate: sim.person,
            confidence: sim.confidence,
            reasons: sim.reasons,
          });
        });
      }

      // Person Phones
      p.phones.forEach((ph: any) => {
        addNode(ph.id, "PHONE", ph.number, {});
        addEdge(p.id, ph.id, "OWNS_PHONE");
      });

      // Person Vehicles
      p.vehicles.forEach((v: any) => {
        addNode(v.id, "VEHICLE", v.registrationNo || "No Reg", {
          make: v.make,
          model: v.model,
          color: v.color,
        });
        addEdge(p.id, v.id, "OWNER_OR_DRIVER");
      });

      // Person Addresses
      p.addresses.forEach((addr: any) => {
        addNode(addr.id, "LOCATION", addr.address || "Address", {
          latitude: addr.latitude,
          longitude: addr.longitude,
          district: addr.district,
        });
        addEdge(p.id, addr.id, "RESIDES_AT");
      });

      // Person Other Cases history
      p.cases.forEach((otherCaseLink: any) => {
        if (otherCaseLink.caseId !== caseObj.id) {
          const oc = otherCaseLink.case;
          addNode(oc.id, "CASE", oc.caseNumber, {
            title: oc.title,
            crimeType: oc.crimeType,
            status: oc.status,
            incidentDate: oc.incidentDate,
            isCrossLinked: true,
          });
          addEdge(
            p.id,
            oc.id,
            `INVOLVED_IN_HISTORICAL_AS_${otherCaseLink.role}`,
          );
        }
      });
    }

    // 6. Direct Vehicles in Case (and their histories)
    caseObj.vehicles.forEach((cv: any) => {
      const v = cv.vehicle;
      addNode(v.id, "VEHICLE", v.registrationNo || "No Reg", {
        make: v.make,
        model: v.model,
        color: v.color,
      });
      addEdge(caseObj.id, v.id, "VEHICLE_SPOTTED");

      // Owners
      v.owners.forEach((owner: any) => {
        addNode(owner.id, "PERSON", owner.name || "Unknown Person", {
          name: owner.name,
          aliases: owner.aliases,
        });
        addEdge(owner.id, v.id, "OWNS_VEHICLE");
      });

      // Case history of vehicle
      v.cases.forEach((vc: any) => {
        if (vc.caseId !== caseObj.id) {
          const oc = vc.case;
          addNode(oc.id, "CASE", oc.caseNumber, {
            title: oc.title,
            crimeType: oc.crimeType,
            status: oc.status,
            incidentDate: oc.incidentDate,
            isCrossLinked: true,
          });
          addEdge(v.id, oc.id, "VEHICLE_USED_IN_CASE");
        }
      });
    });

    // 7. Direct Phones in Case (and their histories)
    caseObj.phones.forEach((cph: any) => {
      const ph = cph.phone;
      addNode(ph.id, "PHONE", ph.number, {});
      addEdge(caseObj.id, ph.id, "PHONE_INTERCEPTED");

      ph.owners.forEach((owner: any) => {
        addNode(owner.id, "PERSON", owner.name || "Unknown Person", {
          name: owner.name,
          aliases: owner.aliases,
        });
        addEdge(owner.id, ph.id, "SUBSCRIBER_OF");
      });

      ph.cases.forEach((phc: any) => {
        if (phc.caseId !== caseObj.id) {
          const oc = phc.case;
          addNode(oc.id, "CASE", oc.caseNumber, {
            title: oc.title,
            crimeType: oc.crimeType,
            status: oc.status,
            incidentDate: oc.incidentDate,
            isCrossLinked: true,
          });
          addEdge(ph.id, oc.id, "PHONE_LINKED_TO_CASE");
        }
      });
    });

    // 8. Locations directly in Case
    caseObj.locations.forEach((cl: any) => {
      const loc = cl.location;
      addNode(loc.id, "LOCATION", loc.address || "Crime Location", {
        latitude: loc.latitude,
        longitude: loc.longitude,
        district: loc.district,
        station: loc.station,
        locationType: loc.locationType,
      });
      addEdge(caseObj.id, loc.id, `OCCURRED_AT_${loc.locationType}`);

      loc.residents.forEach((res: any) => {
        addNode(res.id, "PERSON", res.name || "Resident", {
          name: res.name,
        });
        addEdge(res.id, loc.id, "RESIDES_AT");
      });
    });

    // 9. Organizations directly in Case
    caseObj.organizations.forEach((co: any) => {
      const org = co.organization;
      addNode(org.id, "ORGANIZATION", org.name, {
        description: org.description,
      });
      addEdge(caseObj.id, org.id, "ORGANIZATION_INVOLVED");

      org.members.forEach((member: any) => {
        addNode(member.personId, "PERSON", member.person.name || "Member", {
          name: member.person.name,
        });
        addEdge(
          member.personId,
          org.id,
          `MEMBER_OF_${member.role || "MEMBER"}`,
        );
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
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Dashboard Summary – aggregates all key dashboard data in a single call.
 * Supports optional filters: state, crimeType, groupBy (time grain).
 */
export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const stateFilter = req.query.state as string | undefined;
    const crimeTypeFilter = req.query.crimeType as string | undefined;
    const groupBy = (req.query.groupBy as string) || "year";

    // Build case where-clause from filters
    const caseWhere: any = {};
    if (crimeTypeFilter && crimeTypeFilter !== "all") {
      caseWhere.crimeType = crimeTypeFilter.toUpperCase();
    }

    // If state filter is set, we need to find stations in that state first
    let stationIds: string[] | undefined;
    if (stateFilter && stateFilter !== "all") {
      const stations = await prisma.policeStation.findMany({
        where: { state: { equals: stateFilter, mode: "insensitive" } },
        select: { id: true },
      });
      stationIds = stations.map((s) => s.id);
      caseWhere.stationId = { in: stationIds };
    }

    // 1. Fetch cases matching filters
    const cases = await prisma.case.findMany({
      where: caseWhere,
      include: {
        station: true,
        locations: { include: { location: true } },
        modusOperandi: true,
      },
    });

    const totalCases = cases.length;

    // 2. Crime type breakdown (for pie chart)
    const crimeTypeBreakdown: Record<string, number> = {};
    cases.forEach((c) => {
      crimeTypeBreakdown[c.crimeType] =
        (crimeTypeBreakdown[c.crimeType] || 0) + 1;
    });

    const crimeMix = Object.entries(crimeTypeBreakdown).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    // 3. District-level stats (for bar chart)
    const districtMap: Record<
      string,
      {
        district: string;
        state: string;
        cases: number;
        crimeTypes: Record<string, number>;
      }
    > = {};
    cases.forEach((c) => {
      const district = c.station.district || "Unknown";
      const state = c.station.state || "Unknown";
      if (!districtMap[district]) {
        districtMap[district] = { district, state, cases: 0, crimeTypes: {} };
      }
      districtMap[district].cases++;
      districtMap[district].crimeTypes[c.crimeType] =
        (districtMap[district].crimeTypes[c.crimeType] || 0) + 1;
    });

    const districtStats = Object.values(districtMap).sort(
      (a, b) => b.cases - a.cases,
    );

    // 4. Anomaly count – cases with unusual patterns
    let anomalyCount = 0;
    cases.forEach((c) => {
      const hour = new Date(c.incidentDate).getHours();
      if (
        (c.crimeType === "HOMICIDE" || c.crimeType === "MURDER") &&
        hour >= 6 &&
        hour <= 18
      )
        anomalyCount++;
      if (c.crimeType === "CYBERCRIME" && c.modusOperandi?.weaponType)
        anomalyCount++;
      if (hour >= 1 && hour <= 4 && c.crimeType === "FRAUD") anomalyCount++;
    });

    // 5. MO patterns (for radar chart and network cards)
    const moMap: Record<
      string,
      {
        mo: string;
        suspects: Set<string>;
        incidents: number;
        confidence: number;
      }
    > = {};
    for (const c of cases) {
      if (c.modusOperandi) {
        const moName = c.modusOperandi.name;
        if (!moMap[moName]) {
          moMap[moName] = {
            mo: moName,
            suspects: new Set(),
            incidents: 0,
            confidence: 0,
          };
        }
        moMap[moName].incidents++;
      }
    }

    // Fetch suspect counts per MO
    const moIds = [
      ...new Set(
        cases.filter((c) => c.modusOperandiId).map((c) => c.modusOperandiId!),
      ),
    ];
    if (moIds.length > 0) {
      const moCases = await prisma.case.findMany({
        where: { modusOperandiId: { in: moIds } },
        include: {
          modusOperandi: true,
          persons: { where: { role: "SUSPECT" }, select: { personId: true } },
        },
      });

      moCases.forEach((mc) => {
        const moName = mc.modusOperandi?.name;
        if (moName && moMap[moName]) {
          mc.persons.forEach((p) => moMap[moName].suspects.add(p.personId));
        }
      });
    }

    const moNetwork = Object.values(moMap)
      .map((m) => ({
        mo: m.mo,
        suspects: m.suspects.size,
        incidents: m.incidents,
        confidence:
          m.incidents > 0
            ? Math.min(
                99,
                Math.round(60 + m.incidents * 3 + m.suspects.size * 2),
              )
            : 0,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // 6. Predictive risk scoring (per district)
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

    // 7. Timeline data (for trend chart)
    const timelineMap: Record<
      string,
      { label: string; cases: number; crimeTypes: Record<string, number> }
    > = {};
    cases.forEach((c) => {
      const date = new Date(c.incidentDate);
      let label = "";
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
        label = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      }

      if (!timelineMap[label]) {
        timelineMap[label] = { label, cases: 0, crimeTypes: {} };
      }
      timelineMap[label].cases++;
      timelineMap[label].crimeTypes[c.crimeType] =
        (timelineMap[label].crimeTypes[c.crimeType] || 0) + 1;
    });

    const timeline = Object.values(timelineMap)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((t) => ({
        label: t.label,
        cases: t.cases,
        forecast: Math.round(t.cases * 1.12),
        sentiment: Math.max(
          -82,
          Math.min(36, -28 + Math.round(Math.random() * 20 - 10)),
        ),
        ...t.crimeTypes,
      }));

    // 8. High risk zone count
    const highRiskCount = predictiveRisks.filter(
      (d) => d.risk === "high",
    ).length;

    // 9. Socio-economic correlation points
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
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Map Data – returns filterable geospatial crime points grouped by state/district.
 * Used by the CrimeMap page for overlay rendering and markers.
 */
export const getMapData = async (req: Request, res: Response) => {
  try {
    const stateFilter = req.query.state as string | undefined;
    const districtFilter = req.query.district as string | undefined;
    const crimeTypeFilter = req.query.crimeType as string | undefined;
    const stationId = req.query.stationId as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const riskLevel = req.query.riskLevel as string | undefined;

    // Build where-clause for cases
    const caseWhere: any = {};
    if (crimeTypeFilter && crimeTypeFilter !== "All Crime Types") {
      caseWhere.crimeType = crimeTypeFilter.toUpperCase();
    }
    if (stationId) {
      caseWhere.stationId = stationId;
    }
    if (dateFrom || dateTo) {
      caseWhere.incidentDate = {};
      if (dateFrom) caseWhere.incidentDate.gte = new Date(dateFrom);
      if (dateTo) caseWhere.incidentDate.lte = new Date(dateTo);
    }

    // Station filter by state/district
    let stationWhere: any = {};
    if (stateFilter && stateFilter !== "All States") {
      stationWhere.state = { equals: stateFilter, mode: "insensitive" };
    }
    if (districtFilter && districtFilter !== "All Cities") {
      stationWhere.district = { equals: districtFilter, mode: "insensitive" };
    }

    // If we have station filters, fetch matching station IDs
    if (Object.keys(stationWhere).length > 0) {
      const matchingStations = await prisma.policeStation.findMany({
        where: stationWhere,
        select: { id: true },
      });
      const ids = matchingStations.map((s) => s.id);
      if (caseWhere.stationId) {
        // Intersect with existing stationId filter
        if (ids.includes(caseWhere.stationId)) {
          // keep existing
        } else {
          caseWhere.stationId = { in: [] }; // no match
        }
      } else {
        caseWhere.stationId = { in: ids };
      }
    }

    // Fetch cases
    const cases = await prisma.case.findMany({
      where: caseWhere,
      include: {
        station: true,
        locations: {
          include: { location: true },
        },
      },
    });

    // Build geospatial points
    const points = cases.flatMap((c) =>
      c.locations.map((cl) => ({
        caseId: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        crimeType: c.crimeType,
        incidentDate: c.incidentDate,
        status: c.status,
        latitude: cl.location.latitude,
        longitude: cl.location.longitude,
        district: cl.location.district || c.station.district,
        state: c.station.state,
        stationName: c.station.name,
        address: cl.location.address,
      })),
    );

    // Group by state for overlay stats
    const stateGroups: Record<
      string,
      {
        state: string;
        totalCases: number;
        crimeTypes: Record<string, number>;
        districts: Record<string, number>;
      }
    > = {};
    points.forEach((p) => {
      const s = p.state || "Unknown";
      if (!stateGroups[s]) {
        stateGroups[s] = {
          state: s,
          totalCases: 0,
          crimeTypes: {},
          districts: {},
        };
      }
      stateGroups[s].totalCases++;
      stateGroups[s].crimeTypes[p.crimeType] =
        (stateGroups[s].crimeTypes[p.crimeType] || 0) + 1;
      const d = p.district || "Unknown";
      stateGroups[s].districts[d] = (stateGroups[s].districts[d] || 0) + 1;
    });

    // Compute risk per state
    const stateStats = Object.values(stateGroups).map((sg) => {
      const riskScore = Math.min(100, Math.round(sg.totalCases * 2.5));
      const level = riskScore > 75 ? "high" : riskScore > 45 ? "medium" : "low";
      return { ...sg, riskScore, riskLevel: level };
    });

    // Apply risk level filter if provided
    let filteredStateStats = stateStats;
    if (riskLevel && riskLevel !== "All Risk Levels") {
      filteredStateStats = stateStats.filter(
        (s) => s.riskLevel === riskLevel.toLowerCase(),
      );
    }

    res.status(200).json({
      success: true,
      data: {
        totalPoints: points.length,
        points,
        stateStats: filteredStateStats,
        summary: {
          totalCases: points.length,
          highRiskStates: stateStats.filter((s) => s.riskLevel === "high")
            .length,
          statesWithData: stateStats.length,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
