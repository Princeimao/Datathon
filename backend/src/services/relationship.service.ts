import {
  type CrimeExtractionResult,
  type LocationType,
  type RelationshipType,
} from "../types.js";
import { prisma } from "../config/prisma.config.js";

interface LocationResult {
  locationType: LocationType;
  latitude: number;
  longitude: number;
}

const VALID_PERSON_RELATIONSHIP_TYPES: RelationshipType[] = [
  "ASSOCIATED_WITH",
  "FAMILY",
  "GANG_MEMBER",
  "CONTACTED",
  "ACCOMPLICE",
  "FINANCIAL_LINK",
  "BUSINESS_PARTNER",
  "FRIEND",
  "COLLEAGUE",
  "RELATIVE",
  "OTHER",
];

function sanitizeRelationshipType(type: string): RelationshipType {
  const normalized = type.toUpperCase().replace(/\s+/g, "_");

  if (
    VALID_PERSON_RELATIONSHIP_TYPES.includes(normalized as RelationshipType)
  ) {
    return normalized as RelationshipType;
  }

  return "ASSOCIATED_WITH";
}

function isPersonRelationshipType(type: string): type is RelationshipType {
  return VALID_PERSON_RELATIONSHIP_TYPES.includes(type as RelationshipType);
}

// Generate deterministic coordinates when extraction does not contain
// actual coordinates.
function stringToCoords(
  str: string | null | undefined,
  index: number,
): { latitude: number; longitude: number } {
  if (!str) {
    return {
      latitude: 28.6139 + index * 0.001,
      longitude: 77.209 + index * 0.001,
    };
  }

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const latOffset = (hash % 1000) / 10000;
  const lngOffset = ((hash >> 8) % 1000) / 10000;

  return {
    latitude: 28.6139 + latOffset,
    longitude: 77.209 + lngOffset,
  };
}

function mapEvidenceType(typeStr?: string | null) {
  if (!typeStr) return "OTHER";

  const normalized = typeStr.toUpperCase();

  if (
    normalized.includes("DOCUMENT") ||
    normalized.includes("FILE") ||
    normalized.includes("PAPER")
  ) {
    return "DOCUMENT";
  }

  if (
    normalized.includes("IMAGE") ||
    normalized.includes("PHOTO") ||
    normalized.includes("PICTURE")
  ) {
    return "IMAGE";
  }

  if (
    normalized.includes("VIDEO") ||
    normalized.includes("CCTV") ||
    normalized.includes("RECORDING")
  ) {
    return "VIDEO";
  }

  if (
    normalized.includes("AUDIO") ||
    normalized.includes("VOICE") ||
    normalized.includes("CALL")
  ) {
    return "AUDIO";
  }

  if (
    normalized.includes("DIGITAL") ||
    normalized.includes("PHONE") ||
    normalized.includes("EMAIL") ||
    normalized.includes("SMS")
  ) {
    return "DIGITAL";
  }

  if (
    normalized.includes("PHYSICAL") ||
    normalized.includes("WEAPON") ||
    normalized.includes("KNIFE") ||
    normalized.includes("GUN") ||
    normalized.includes("BLOOD") ||
    normalized.includes("HAIR")
  ) {
    return "PHYSICAL";
  }

  return "OTHER";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export const relationshipService = async (data: CrimeExtractionResult) => {
  try {
    const {
      persons = [],
      phones = [],
      vehicles = [],
      organizations = [],
      locations = [],
      evidence = [],
      case: caseData,
      relationships = [],
    } = data;

    const transactionResult = await prisma.$transaction(async (tx: any) => {
      // ============================================================
      // 1. POLICE ADMINISTRATION
      // ============================================================

      let state = await tx.state.findFirst({
        where: {
          stateName: "Delhi",
        },
      });

      if (!state) {
        state = await tx.state.create({
          data: {
            stateName: "Delhi",
          },
        });
      }

      let districtName = "Default District";

      const reportingStationLocation = locations.find(
        (location: any) => location.locationType === "REPORTING_STATION",
      );

      if (reportingStationLocation?.district) {
        districtName = reportingStationLocation.district;
      } else {
        const locationWithDistrict = locations.find(
          (location: any) => location.district,
        );

        if (locationWithDistrict?.district) {
          districtName = locationWithDistrict.district;
        }
      }

      let district = await tx.district.findFirst({
        where: {
          stateId: state.id,
          districtName,
        },
      });

      if (!district) {
        district = await tx.district.create({
          data: {
            districtName,
            stateId: state.id,
          },
        });
      }

      // Find an existing police unit for the district.
      // If your application has a proper station/unit master,
      // this should resolve against that master instead.
      let unitType = await tx.unitType.findFirst({
        where: {
          unitTypeName: "POLICE_STATION",
        },
      });

      if (!unitType) {
        unitType = await tx.unitType.create({
          data: {
            unitTypeName: "POLICE_STATION",
          },
        });
      }

      let stationName = "Default Police Station";

      if (reportingStationLocation?.station) {
        stationName = reportingStationLocation.station;
      } else {
        const locationWithStation = locations.find(
          (location: any) => location.station,
        );

        if (locationWithStation?.station) {
          stationName = locationWithStation.station;
        }
      }

      let policeUnit = await tx.policeUnit.findFirst({
        where: {
          unitName: stationName,
          districtId: district.id,
        },
      });

      if (!policeUnit) {
        policeUnit = await tx.policeUnit.create({
          data: {
            unitName: stationName,
            unitTypeId: unitType.id,
            stateId: state.id,
            districtId: district.id,
          },
        });
      }

      // ============================================================
      // 2. SYSTEM EMPLOYEE / OFFICER
      // ============================================================

      let dbOfficer = await tx.employee.findUnique({
        where: {
          badgeNumber: "SYS-999",
        },
      });

      if (!dbOfficer) {
        dbOfficer = await tx.employee.create({
          data: {
            badgeNumber: "SYS-999",
            firstName: "System",
            lastName: "Officer",
            districtId: district.id,
            unitId: policeUnit.id,
          },
        });
      }

      // ============================================================
      // 3. CASE MASTER DATA
      // ============================================================

      /*
       * The new Case schema requires:
       *
       * caseCategoryId
       * gravityOffenceId
       * crimeMajorHeadId
       * crimeMinorHeadId
       * caseStatusId
       * policeUnitId
       *
       * Resolve these from your extraction/master-data mapping here.
       */

      const caseCategory = await tx.caseCategory.findFirst({
        where: {
          code: "OTHER",
        },
      });

      if (!caseCategory) {
        throw new Error("CaseCategory with code OTHER does not exist");
      }

      let gravityOffence = await tx.gravityOffence.findFirst({
        where: {
          lookupValue: "OTHER",
        },
      });

      if (!gravityOffence) {
        gravityOffence = await tx.gravityOffence.create({
          data: {
            lookupValue: "OTHER",
            description: "Default gravity offence",
          },
        });
      }

      let crimeHead = await tx.crimeHead.findFirst({
        where: {
          crimeGroupName: "OTHER",
        },
      });

      if (!crimeHead) {
        crimeHead = await tx.crimeHead.create({
          data: {
            crimeGroupName: "OTHER",
          },
        });
      }

      let crimeSubHead = await tx.crimeSubHead.findFirst({
        where: {
          crimeHeadId: crimeHead.id,
          crimeHeadName: "OTHER",
        },
      });

      if (!crimeSubHead) {
        crimeSubHead = await tx.crimeSubHead.create({
          data: {
            crimeHeadId: crimeHead.id,
            crimeHeadName: "OTHER",
          },
        });
      }

      let caseStatus = await tx.caseStatusMaster.findFirst({
        where: {
          caseStatusName: caseData.caseStatus || "OPEN",
        },
      });

      if (!caseStatus) {
        caseStatus = await tx.caseStatusMaster.create({
          data: {
            caseStatusName: caseData.caseStatus || "OPEN",
          },
        });
      }

      // ============================================================
      // 4. MODUS OPERANDI
      // ============================================================

      let dbMO = null;

      if (
        data.modusOperandi &&
        (data.modusOperandi.name || data.modusOperandi.description)
      ) {
        const moName = data.modusOperandi.name || "Default MO";

        const moData = {
          description: data.modusOperandi.description || "",
          targetType: data.modusOperandi.targetType || null,
          weaponType: data.modusOperandi.weaponType || null,
          timePattern: data.modusOperandi.timePattern || null,
          vehiclePattern: data.modusOperandi.vehiclePattern || null,
          entryMethod: data.modusOperandi.entryMethod || null,
          escapeMethod: data.modusOperandi.escapeMethod || null,
          communicationMethod: data.modusOperandi.communicationMethod || null,
          riskLevel: data.modusOperandi.riskLevel ?? null,
          confidence: data.modusOperandi.confidence ?? null,
          patterns: data.modusOperandi.patterns || [],
        };

        dbMO = await tx.modusOperandi.upsert({
          where: {
            name: moName,
          },
          update: moData,
          create: {
            name: moName,
            ...moData,
          },
        });
      }

      // ============================================================
      // 5. CASE
      // ============================================================

      const caseNumber =
        caseData.caseNumber ||
        `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const crimeNo =
        caseData.crimeNo || caseData.caseNumber || `CRIME-${Date.now()}`;

      const caseNo = caseData.caseNo || caseNumber;

      const crimeRegisteredDate = caseData.incidentDate
        ? new Date(caseData.incidentDate)
        : new Date();

      const dbCase = await tx.case.upsert({
        where: {
          caseNumber,
        },
        update: {
          title: caseData.title || "Untitled Case",
          description: caseData.description || null,

          crimeNo,
          caseNo,

          crimeRegisteredDate,

          incidentFromDate: caseData.incidentDate
            ? new Date(caseData.incidentDate)
            : null,

          caseCategoryId: caseCategory.id,
          gravityOffenceId: gravityOffence.id,
          crimeMajorHeadId: crimeHead.id,
          crimeMinorHeadId: crimeSubHead.id,
          caseStatusId: caseStatus.id,

          policeUnitId: policeUnit.id,

          modusOperandiId: dbMO?.id || null,

          registeringOfficerId: dbOfficer.id,
        },
        create: {
          caseNumber,
          crimeNo,
          caseNo,

          title: caseData.title || "Untitled Case",
          description: caseData.description || null,

          crimeRegisteredDate,

          incidentFromDate: caseData.incidentDate
            ? new Date(caseData.incidentDate)
            : null,

          caseCategoryId: caseCategory.id,
          gravityOffenceId: gravityOffence.id,
          crimeMajorHeadId: crimeHead.id,
          crimeMinorHeadId: crimeSubHead.id,
          caseStatusId: caseStatus.id,

          registeringOfficerId: dbOfficer.id,

          policeUnitId: policeUnit.id,

          modusOperandiId: dbMO?.id || null,
        },
      });

      // ============================================================
      // 6. LOCATIONS
      // ============================================================

      const createdLocations: any[] = [];

      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];

        const { latitude, longitude } = stringToCoords(
          loc.address || loc.name,
          i,
        );

        /*
         * Prisma Decimal fields are represented more
         * reliably using strings.
         */
        const latitudeDecimal = latitude.toFixed(7);

        const longitudeDecimal = longitude.toFixed(7);

        let dbLocation = await tx.location.findFirst({
          where: {
            latitude: latitudeDecimal,
            longitude: longitudeDecimal,
          },
        });

        if (dbLocation) {
          dbLocation = await tx.location.update({
            where: {
              id: dbLocation.id,
            },
            data: {
              address: loc.address || loc.name || dbLocation.address,

              districtId: district.id,
              stateId: state.id,
              policeUnitId: policeUnit.id,

              districtName: loc.district || dbLocation.districtName,

              stationName: loc.station || dbLocation.stationName,

              locationType: loc.locationType || "UNKNOWN",
            },
          });
        } else {
          dbLocation = await tx.location.create({
            data: {
              address: loc.address || loc.name || "Unknown Address",

              latitude: latitudeDecimal,
              longitude: longitudeDecimal,

              districtId: district.id,

              stateId: state.id,

              policeUnitId: policeUnit.id,

              districtName: loc.district || district.districtName,

              stationName: loc.station || stationName,

              locationType: loc.locationType || "UNKNOWN",
            },
          });
        }

        await tx.caseLocation.upsert({
          where: {
            caseId_locationId: {
              caseId: dbCase.id,
              locationId: dbLocation.id,
            },
          },
          update: {
            locationType: loc.locationType || null,
            description: loc.description || null,
            occurredAt: loc.occurredAt ? new Date(loc.occurredAt) : null,
          },
          create: {
            caseId: dbCase.id,
            locationId: dbLocation.id,
            locationType: loc.locationType || null,
            description: loc.description || null,
            occurredAt: loc.occurredAt ? new Date(loc.occurredAt) : null,
          },
        });

        createdLocations.push(dbLocation);
      }

      // ============================================================
      // 7. PERSONS
      // ============================================================

      const createdPersons: any[] = [];

      for (const person of persons) {
        if (!person.name) continue;

        let dbPerson = await tx.person.findFirst({
          where: {
            name: person.name,
          },
        });

        if (dbPerson) {
          const aliases = uniqueStrings([
            ...dbPerson.aliases,
            ...(person.aliases || []),
          ]);

          dbPerson = await tx.person.update({
            where: {
              id: dbPerson.id,
            },
            data: {
              age: person.age ?? dbPerson.age,
              gender: (person.gender as any) || dbPerson.gender,
              aliases,
            },
          });
        } else {
          dbPerson = await tx.person.create({
            data: {
              name: person.name,
              age: person.age ?? null,
              gender: (person.gender as any) || "UNKNOWN",
              aliases: person.aliases || [],
            },
          });
        }

        const role = person.role || "UNKNOWN";

        await tx.casePerson.upsert({
          where: {
            caseId_personId_role: {
              caseId: dbCase.id,
              personId: dbPerson.id,
              role,
            },
          },
          update: {
            notes: person.notes || null,
            isPrimary: person.isPrimary || false,
          },
          create: {
            caseId: dbCase.id,
            personId: dbPerson.id,
            role,
            notes: person.notes || null,
            isPrimary: person.isPrimary || false,
          },
        });

        createdPersons.push({
          ...dbPerson,
          role,
        });
      }

      // ============================================================
      // 8. PHONES
      // ============================================================

      const createdPhones: any[] = [];

      for (const phone of phones) {
        if (!phone.number) continue;

        const dbPhone = await tx.phone.upsert({
          where: {
            number: phone.number,
          },
          update: {
            countryCode: phone.countryCode || null,
          },
          create: {
            number: phone.number,
            countryCode: phone.countryCode || null,
          },
        });

        await tx.casePhone.upsert({
          where: {
            caseId_phoneId: {
              caseId: dbCase.id,
              phoneId: dbPhone.id,
            },
          },
          update: {
            context: phone.context || null,
            confidence: phone.confidence ?? null,
          },
          create: {
            caseId: dbCase.id,
            phoneId: dbPhone.id,
            context: phone.context || null,
            confidence: phone.confidence ?? null,
          },
        });

        createdPhones.push(dbPhone);
      }

      // ============================================================
      // 9. VEHICLES
      // ============================================================

      const createdVehicles: any[] = [];

      for (const vehicle of vehicles) {
        if (!vehicle.registrationNumber) {
          /*
           * registrationNo is nullable and unique.
           * Create a vehicle without registration number rather
           * than manufacturing a fake registration number.
           */
          const dbVehicle = await tx.vehicle.create({
            data: {
              make: vehicle.make || vehicle.type || null,

              model: vehicle.model || null,

              color: vehicle.color || null,

              vehicleType: vehicle.type || null,
            },
          });

          await tx.caseVehicle.upsert({
            where: {
              caseId_vehicleId: {
                caseId: dbCase.id,
                vehicleId: dbVehicle.id,
              },
            },
            update: {
              context: vehicle.context || null,
              confidence: vehicle.confidence ?? null,
            },
            create: {
              caseId: dbCase.id,
              vehicleId: dbVehicle.id,
              context: vehicle.context || null,
              confidence: vehicle.confidence ?? null,
            },
          });

          createdVehicles.push(dbVehicle);
          continue;
        }

        const dbVehicle = await tx.vehicle.upsert({
          where: {
            registrationNo: vehicle.registrationNumber,
          },
          update: {
            make: vehicle.make || vehicle.type || null,

            model: vehicle.model || null,

            color: vehicle.color || null,

            vehicleType: vehicle.type || null,
          },
          create: {
            registrationNo: vehicle.registrationNumber,

            make: vehicle.make || vehicle.type || null,

            model: vehicle.model || null,

            color: vehicle.color || null,

            vehicleType: vehicle.type || null,
          },
        });

        await tx.caseVehicle.upsert({
          where: {
            caseId_vehicleId: {
              caseId: dbCase.id,
              vehicleId: dbVehicle.id,
            },
          },
          update: {
            context: vehicle.context || null,
            confidence: vehicle.confidence ?? null,
          },
          create: {
            caseId: dbCase.id,
            vehicleId: dbVehicle.id,
            context: vehicle.context || null,
            confidence: vehicle.confidence ?? null,
          },
        });

        createdVehicles.push(dbVehicle);
      }

      // ============================================================
      // 10. ORGANIZATIONS
      // ============================================================

      const createdOrganizations: any[] = [];

      for (const org of organizations) {
        if (!org.name) continue;

        const dbOrg = await tx.organization.upsert({
          where: {
            name: org.name,
          },
          update: {
            description: org.description || null,
            organizationType: org.organizationType || null,
          },
          create: {
            name: org.name,
            description: org.description || null,
            organizationType: org.organizationType || null,
          },
        });

        await tx.caseOrganization.upsert({
          where: {
            caseId_organizationId: {
              caseId: dbCase.id,
              organizationId: dbOrg.id,
            },
          },
          update: {
            context: org.context || null,
            confidence: org.confidence ?? null,
          },
          create: {
            caseId: dbCase.id,
            organizationId: dbOrg.id,
            context: org.context || null,
            confidence: org.confidence ?? null,
          },
        });

        createdOrganizations.push(dbOrg);
      }

      // ============================================================
      // 11. EVIDENCE
      // ============================================================

      const createdEvidence: any[] = [];

      for (const ev of evidence) {
        const dbEvidence = await tx.evidence.create({
          data: {
            caseId: dbCase.id,
            type: mapEvidenceType(ev.type),
            title: ev.title || null,
            description: ev.description || "No description provided",
            fileUrl: ev.fileUrl || "stratus://unavailable/evidence",
            mimeType: ev.mimeType || null,
            fileName: ev.fileName || null,
            fileSize: ev.fileSize ?? null,
            fileHash: ev.fileHash || null,
            uploadedById: dbOfficer.id,
            extractedData: (ev.extractedData as any) || null,
            aiSummary: ev.aiSummary || null,
            aiClassification: (ev.aiClassification as any) || null,
            aiConfidence: ev.aiConfidence ?? null,
          },
        });

        createdEvidence.push(dbEvidence);
      }

      // ============================================================
      // 12. PERSON ↔ PHONE / VEHICLE / LOCATION
      // ============================================================

      for (const rel of relationships || []) {
        const relationshipType = sanitizeRelationshipType(rel.type);

        const sourcePerson = createdPersons.find((p) => p.name === rel.source);

        if (!sourcePerson) {
          continue;
        }

        // ----------------------------------------------------------
        // PERSON ↔ PERSON
        // ----------------------------------------------------------

        if (isPersonRelationshipType(relationshipType)) {
          const targetPerson = createdPersons.find(
            (p) => p.name === rel.target,
          );

          if (targetPerson && sourcePerson.id !== targetPerson.id) {
            const existingRel = await tx.personRelationship.findFirst({
              where: {
                sourcePersonId: sourcePerson.id,
                targetPersonId: targetPerson.id,
                relationType: relationshipType as any,
              },
            });

            if (existingRel) {
              await tx.personRelationship.update({
                where: {
                  id: existingRel.id,
                },
                data: {
                  confidence: rel.confidence ?? existingRel.confidence,
                  source: rel.sourceText || existingRel.source,
                  notes: rel.notes || existingRel.notes,
                },
              });
            } else {
              await tx.personRelationship.create({
                data: {
                  sourcePersonId: sourcePerson.id,
                  targetPersonId: targetPerson.id,
                  relationType: relationshipType as any,
                  confidence: rel.confidence ?? 1,
                  source: rel.sourceText || "AI_EXTRACTION",
                  notes: rel.notes || null,
                },
              });
            }
          }

          continue;
        }

        // ----------------------------------------------------------
        // PERSON → PHONE
        // ----------------------------------------------------------

        if (relationshipType === "OWNER") {
          const targetPhone = createdPhones.find(
            (phone) => phone.number === rel.target,
          );

          if (targetPhone) {
            await tx.phoneOwner.upsert({
              where: {
                personId_phoneId: {
                  personId: sourcePerson.id,
                  phoneId: targetPhone.id,
                },
              },
              update: {
                confidence: rel.confidence ?? null,
                ownershipType: "OWNER",
              },
              create: {
                personId: sourcePerson.id,
                phoneId: targetPhone.id,
                ownershipType: "OWNER",
                confidence: rel.confidence ?? 1,
              },
            });

            continue;
          }

          // --------------------------------------------------------
          // PERSON → VEHICLE
          // --------------------------------------------------------

          const targetVehicle = createdVehicles.find(
            (vehicle) => vehicle.registrationNo === rel.target,
          );

          if (targetVehicle) {
            await tx.vehicleOwner.upsert({
              where: {
                personId_vehicleId: {
                  personId: sourcePerson.id,
                  vehicleId: targetVehicle.id,
                },
              },
              update: {
                confidence: rel.confidence ?? null,
                ownershipType: "OWNER",
              },
              create: {
                personId: sourcePerson.id,
                vehicleId: targetVehicle.id,
                ownershipType: "OWNER",
                confidence: rel.confidence ?? 1,
              },
            });
          }

          continue;
        }

        // ----------------------------------------------------------
        // PERSON → LOCATION
        // ----------------------------------------------------------

        if (relationshipType === "RESIDENT") {
          const targetLocation = createdLocations.find(
            (location) =>
              location.address === rel.target ||
              location.stationName === rel.target ||
              location.districtName === rel.target,
          );

          if (targetLocation) {
            await tx.personLocation.upsert({
              where: {
                personId_locationId: {
                  personId: sourcePerson.id,
                  locationId: targetLocation.id,
                },
              },
              update: {
                relationship: "RESIDENT",
                confidence: rel.confidence ?? null,
              },
              create: {
                personId: sourcePerson.id,
                locationId: targetLocation.id,
                relationship: "RESIDENT",
                confidence: rel.confidence ?? 1,
              },
            });
          }

          continue;
        }

        // ----------------------------------------------------------
        // PERSON → ORGANIZATION
        // ----------------------------------------------------------

        if (relationshipType === "MEMBER_OF") {
          /*
           * MEMBER_OF does not exist in the new
           * RelationshipType enum. Organization
           * membership is represented by
           * OrganizationMember.
           */
          const targetOrg = createdOrganizations.find(
            (org) => org.name === rel.target,
          );

          if (targetOrg) {
            await tx.organizationMember.upsert({
              where: {
                personId_organizationId: {
                  personId: sourcePerson.id,
                  organizationId: targetOrg.id,
                },
              },
              update: {
                confidence: rel.confidence ?? null,
              },
              create: {
                personId: sourcePerson.id,
                organizationId: targetOrg.id,
                role: "MEMBER",
                confidence: rel.confidence ?? 1,
              },
            });
          }
        }
      }

      // ============================================================
      // 13. RETURN
      // ============================================================

      return {
        dbCase,
        dbMO,
        policeUnit,
        district,
        state,
        createdLocations,
        createdPersons,
        createdPhones,
        createdVehicles,
        createdOrganizations,
        createdEvidence,
      };
    });

    return transactionResult.dbCase;
  } catch (error) {
    console.error("Error creating relationship:", error);

    return null;
  }
};
