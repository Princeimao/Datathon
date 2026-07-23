import { CrimeExtractionResult, LocationExtraction, LocationType, RelationshipType, EntityRelationship } from "../types";
import { prisma } from "../config/prisma.config";

interface LocationResult {
    locationType: LocationType;
    latitude: number;
    longitude: number;
}

const VALID_RELATIONSHIP_TYPES = [
    "FAMILY",
    "ACCOMPLICE",
    "GANG_MEMBER",
    "ASSOCIATED_WITH",
    "CONTACTED",
    "FINANCIAL_LINK",
    "OWNER",
    "RESIDENT",
    "MEMBER_OF"
];

function sanitizeRelationshipType(type: string): string {
    const upper = type.toUpperCase().replace(/\s+/g, "_");
    if (VALID_RELATIONSHIP_TYPES.includes(upper)) {
        return upper;
    }
    return "ASSOCIATED_WITH";
}

function isPersonRelationshipType(type: string): type is "FAMILY" | "ACCOMPLICE" | "GANG_MEMBER" | "ASSOCIATED_WITH" | "CONTACTED" | "FINANCIAL_LINK" {
    return ["ASSOCIATED_WITH", "FAMILY", "GANG_MEMBER", "CONTACTED", "ACCOMPLICE", "FINANCIAL_LINK"].includes(type);
}

// Generate deterministic coordinates based on location details
function stringToCoords(str: string | null, index: number): { latitude: number; longitude: number } {
    if (!str) {
        return {
            latitude: 19.0760 + (index * 0.01),
            longitude: 72.8777 + (index * 0.01)
        };
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const lat = 19.0760 + ((hash % 1000) / 10000);
    const lng = 72.8777 + (((hash >> 8) % 1000) / 10000);
    return { latitude: lat, longitude: lng };
}

function mapEvidenceType(typeStr: string | null) {
    if (!typeStr) return "OTHER";
    const normalized = typeStr.toUpperCase();
    if (normalized.includes("DOCUMENT") || normalized.includes("FILE") || normalized.includes("PAPER")) return "DOCUMENT";
    if (normalized.includes("IMAGE") || normalized.includes("PHOTO") || normalized.includes("PICTURE")) return "IMAGE";
    if (normalized.includes("VIDEO") || normalized.includes("CCTV") || normalized.includes("RECORDING")) return "VIDEO";
    if (normalized.includes("AUDIO") || normalized.includes("VOICE") || normalized.includes("CALL")) return "AUDIO";
    if (normalized.includes("DIGITAL") || normalized.includes("PHONE") || normalized.includes("EMAIL") || normalized.includes("SMS")) return "DIGITAL";
    if (normalized.includes("PHYSICAL") || normalized.includes("WEAPON") || normalized.includes("KNIFE") || normalized.includes("GUN") || normalized.includes("BLOOD") || normalized.includes("HAIR")) return "PHYSICAL";
    return "OTHER";
}

export const relationshipService = async (data: CrimeExtractionResult) => {
    try {
        const { persons, phones, vehicles, organizations, locations, evidence, case: caseData, relationships } = data;

        const transactionResult = await prisma.$transaction(async (tx) => {
            // Find or create police station
            let stationName = "Default Police Station";
            let stationDistrict = "Default District";

            const reportingStationLoc = locations.find(l => l.locationType === "REPORTING_STATION");
            if (reportingStationLoc) {
                if (reportingStationLoc.station) stationName = reportingStationLoc.station;
                if (reportingStationLoc.district) stationDistrict = reportingStationLoc.district;
            } else {
                // look for any location with station info
                const withStation = locations.find(l => l.station);
                if (withStation) {
                    stationName = withStation.station!;
                    if (withStation.district) stationDistrict = withStation.district;
                }
            }

            let dbStation = await tx.policeStation.findFirst({
                where: { name: stationName }
            });

            if (!dbStation) {
                dbStation = await tx.policeStation.create({
                    data: {
                        name: stationName,
                        district: stationDistrict,
                        state: "Delhi",
                        lat: 28.6139,
                        lng: 77.2090
                    }
                });
            }

            // Find or create Modus Operandi
            let dbMO = null;
            if (data.modusOperandi && (data.modusOperandi.name || data.modusOperandi.description)) {
                const moName = data.modusOperandi.name || "Default MO";
                dbMO = await tx.modusOperandi.upsert({
                    where: { name: moName },
                    update: {
                        description: data.modusOperandi.description || "",
                        targetType: data.modusOperandi.weaponType,
                        weaponType: data.modusOperandi.weaponType,
                        timePattern: data.modusOperandi.timePattern,
                        vehiclePattern: data.modusOperandi.vehiclePattern
                    },
                    create: {
                        name: moName,
                        description: data.modusOperandi.description || "",
                        targetType: data.modusOperandi.weaponType,
                        weaponType: data.modusOperandi.weaponType,
                        timePattern: data.modusOperandi.timePattern,
                        vehiclePattern: data.modusOperandi.vehiclePattern
                    }
                });
            }

            // Create/Upsert Case
            const caseNumber = caseData.caseNumber || `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const dbCase = await tx.case.upsert({
                where: { caseNumber },
                update: {
                    title: caseData.title || "Untitled Case",
                    description: caseData.description,
                    crimeType: caseData.crimeType || "OTHER",
                    status: caseData.caseStatus || "OPEN",
                    incidentDate: caseData.incidentDate ? new Date(caseData.incidentDate) : new Date(),
                    stationId: dbStation.id,
                    modusOperandiId: dbMO?.id || null
                },
                create: {
                    caseNumber,
                    title: caseData.title || "Untitled Case",
                    description: caseData.description,
                    crimeType: caseData.crimeType || "OTHER",
                    status: caseData.caseStatus || "OPEN",
                    incidentDate: caseData.incidentDate ? new Date(caseData.incidentDate) : new Date(),
                    stationId: dbStation.id,
                    modusOperandiId: dbMO?.id || null
                }
            });

            // Create/Upsert Locations and CaseLocation joins
            const createdLocations = [];
            for (let i = 0; i < locations.length; i++) {
                const loc = locations[i];
                const { latitude, longitude } = stringToCoords(loc.address || loc.name, i);

                const dbLocation = await tx.location.upsert({
                    where: {
                        latitude_longitude: { latitude, longitude }
                    },
                    update: {
                        address: loc.address || loc.name || "Unknown Address",
                        district: loc.district || null,
                        station: loc.station || null,
                        locationType: loc.locationType || "UNKNOWN"
                    },
                    create: {
                        address: loc.address || loc.name || "Unknown Address",
                        latitude,
                        longitude,
                        district: loc.district || null,
                        station: loc.station || null,
                        locationType: loc.locationType || "UNKNOWN"
                    }
                });

                await tx.caseLocation.upsert({
                    where: {
                        caseId_locationId: {
                            caseId: dbCase.id,
                            locationId: dbLocation.id
                        }
                    },
                    update: {},
                    create: {
                        caseId: dbCase.id,
                        locationId: dbLocation.id
                    }
                });

                createdLocations.push(dbLocation);
            }

            // Create/Upsert Persons and CasePerson joins
            const createdPersons = [];
            for (const person of persons) {
                if (!person.name) continue;

                // Since name is not unique in schema, we look it up first
                let dbPerson = await tx.person.findFirst({
                    where: { name: person.name }
                });

                if (dbPerson) {
                    dbPerson = await tx.person.update({
                        where: { id: dbPerson.id },
                        data: {
                            age: person.age || dbPerson.age,
                            gender: (person.gender as any) || dbPerson.gender,
                            aliases: [...dbPerson.aliases, ...(person.aliases || [])].filter((val, idx, self) => self.indexOf(val) === idx)
                        }
                    });
                } else {
                    dbPerson = await tx.person.create({
                        data: {
                            name: person.name,
                            age: person.age,
                            gender: (person.gender as any) || "UNKNOWN",
                            aliases: person.aliases || []
                        }
                    });
                }

                await tx.casePerson.upsert({
                    where: {
                        caseId_personId: {
                            caseId: dbCase.id,
                            personId: dbPerson.id
                        }
                    },
                    update: {
                        role: person.role || "UNKNOWN"
                    },
                    create: {
                        caseId: dbCase.id,
                        personId: dbPerson.id,
                        role: person.role || "UNKNOWN"
                    }
                });

                createdPersons.push({ ...dbPerson, role: person.role || "UNKNOWN" });
            }

            // Create/Upsert Phones and CasePhone joins
            const createdPhones = [];
            for (const phone of phones) {
                if (!phone.number) continue;

                const dbPhone = await tx.phone.upsert({
                    where: { number: phone.number },
                    update: {},
                    create: { number: phone.number }
                });

                await tx.casePhone.upsert({
                    where: {
                        caseId_phoneId: {
                            caseId: dbCase.id,
                            phoneId: dbPhone.id
                        }
                    },
                    update: {},
                    create: {
                        caseId: dbCase.id,
                        phoneId: dbPhone.id
                    }
                });

                createdPhones.push(dbPhone);
            }

            // Create/Upsert Vehicles and CaseVehicle joins
            const createdVehicles = [];
            for (const vehicle of vehicles) {
                const regNo = vehicle.registrationNumber || `TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const dbVehicle = await tx.vehicle.upsert({
                    where: { registrationNo: regNo },
                    update: {
                        make: vehicle.type || null,
                        model: vehicle.type || null,
                        color: vehicle.color || null
                    },
                    create: {
                        registrationNo: regNo,
                        make: vehicle.type || null,
                        model: vehicle.type || null,
                        color: vehicle.color || null
                    }
                });

                await tx.caseVehicle.upsert({
                    where: {
                        caseId_vehicleId: {
                            caseId: dbCase.id,
                            vehicleId: dbVehicle.id
                        }
                    },
                    update: {},
                    create: {
                        caseId: dbCase.id,
                        vehicleId: dbVehicle.id
                    }
                });

                createdVehicles.push(dbVehicle);
            }

            // Create/Upsert Organizations and CaseOrganization joins
            const createdOrganizations = [];
            for (const org of organizations) {
                if (!org.name) continue;

                const dbOrg = await tx.organization.upsert({
                    where: { name: org.name },
                    update: {},
                    create: { name: org.name }
                });

                await tx.caseOrganization.upsert({
                    where: {
                        caseId_organizationId: {
                            caseId: dbCase.id,
                            organizationId: dbOrg.id
                        }
                    },
                    update: {},
                    create: {
                        caseId: dbCase.id,
                        organizationId: dbOrg.id
                    }
                });

                createdOrganizations.push(dbOrg);
            }

            // Create/Upsert Evidence (requires a default officer)
            const dbOfficer = await tx.officer.upsert({
                where: { badgeNumber: "SYS-999" },
                update: {},
                create: {
                    badgeNumber: "SYS-999",
                    name: "System Officer",
                    rank: "System"
                }
            });

            for (const ev of evidence) {
                await tx.evidence.create({
                    data: {
                        caseId: dbCase.id,
                        type: mapEvidenceType(ev.type),
                        description: ev.description || "No description provided",
                        fileUrl: "http://example.com/evidence",
                        uploadedById: dbOfficer.id
                    }
                });
            }

            // Establish Explicit Connections between Entities
            for (const rel of relationships || []) {
                if (isPersonRelationshipType(rel.type)) {
                    // Person to Person Relationship
                    const sourcePerson = createdPersons.find(p => p.name === rel.source);
                    const targetPerson = createdPersons.find(p => p.name === rel.target);

                    if (sourcePerson && targetPerson) {
                        const existingRel = await tx.personRelationship.findFirst({
                            where: {
                                sourcePersonId: sourcePerson.id,
                                targetPersonId: targetPerson.id,
                                relationType: rel.type
                            }
                        });

                        if (!existingRel) {
                            await tx.personRelationship.create({
                                data: {
                                    sourcePersonId: sourcePerson.id,
                                    targetPersonId: targetPerson.id,
                                    relationType: rel.type,
                                    confidence: rel.confidence || 1.0
                                }
                            });
                        }
                    }
                } else if (rel.type === "OWNER") {
                    // Person to Phone / Vehicle
                    const sourcePerson = createdPersons.find(p => p.name === rel.source);
                    if (sourcePerson) {
                        // Try Phone target
                        const targetPhone = createdPhones.find(p => p.number === rel.target);
                        if (targetPhone) {
                            await tx.person.update({
                                where: { id: sourcePerson.id },
                                data: {
                                    phones: {
                                        connect: { id: targetPhone.id }
                                    }
                                }
                            });
                        }

                        // Try Vehicle target
                        const targetVehicle = createdVehicles.find(v => v.registrationNo === rel.target);
                        if (targetVehicle) {
                            await tx.person.update({
                                where: { id: sourcePerson.id },
                                data: {
                                    vehicles: {
                                        connect: { id: targetVehicle.id }
                                    }
                                }
                            });
                        }
                    }
                } else if (rel.type === "RESIDENT") {
                    // Person to Location
                    const sourcePerson = createdPersons.find(p => p.name === rel.source);
                    const targetLocation = createdLocations.find(l => l.address === rel.target || l.station === rel.target);
                    if (sourcePerson && targetLocation) {
                        await tx.person.update({
                            where: { id: sourcePerson.id },
                            data: {
                                addresses: {
                                    connect: { id: targetLocation.id }
                                }
                            }
                        });
                    }
                } else if (rel.type === "MEMBER_OF") {
                    // Person to Organization
                    const sourcePerson = createdPersons.find(p => p.name === rel.source);
                    const targetOrg = createdOrganizations.find(o => o.name === rel.target);
                    if (sourcePerson && targetOrg) {
                        await tx.organizationMember.upsert({
                            where: {
                                personId_organizationId: {
                                    personId: sourcePerson.id,
                                    organizationId: targetOrg.id
                                }
                            },
                            update: {
                                confidence: rel.confidence || 1.0
                            },
                            create: {
                                personId: sourcePerson.id,
                                organizationId: targetOrg.id,
                                role: "MEMBER",
                                confidence: rel.confidence || 1.0
                            }
                        });
                    }
                }
            }

            return {
                dbStation,
                dbMO,
                dbCase,
                createdLocations,
                createdPersons,
                createdPhones,
                createdVehicles,
                createdOrganizations
            };
        });

        return transactionResult.dbCase;
    } catch (error) {
        console.log("Error creating relationship:", error);
        return null;
    }
};