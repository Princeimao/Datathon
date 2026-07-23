import "dotenv/config";
import { prisma } from "../src/config/prisma.config";

import {
    policeStations as mockStations,
    officers as mockOfficers,
    persons as mockPersons,
    vehicles as mockVehicles,
    phones as mockPhones,
    locations as mockLocations,
    organizations as mockOrgs,
    modusOperandis as mockMOs,
    cases as mockCases,
    evidences as mockEvidences,
    casePersons as mockCasePersons,
    caseVehicles as mockCaseVehicles,
    casePhones as mockCasePhones,
    caseLocations as mockCaseLocations,
    caseOrganizations as mockCaseOrganizations,
    personRelationships as mockPersonRelationships,
    organizationMembers as mockOrgMembers,
    personVehicles as mockPersonVehicles,
    personPhones as mockPersonPhones,
    personAddresses as mockPersonAddresses
} from "../../mockData";

import { cases as extraCases } from "../../caseData";
import { persons as extraPersons, personRelationships as extraPersonRelationships } from "../../personData";
import { clusterPhones, getPhoneData } from "../../phoneData";
import { vehicles as extraVehicles } from "../../vehicleData";
import { locations as extraLocations } from "../../LocationData";

// Helper for deterministic coordinates fallback
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

async function main() {
    console.log("=== STARTING PRISMA DATABASE SEEDING ===");

    // ----------------------------------------------------
    // 1. POLICE STATIONS
    // ----------------------------------------------------
    console.log("Seeding Police Stations...");
    const stationMap = new Map<string, string>(); // name -> id

    for (const st of mockStations) {
        const station = await prisma.policeStation.upsert({
            where: { id: st.id },
            update: { name: st.name, state: st.state, district: st.district, lat: st.lat, lng: st.lng },
            create: st
        });
        stationMap.set(st.name, station.id);
    }

    // Collect additional stations from LocationData and caseData
    const extraStationNames = new Set<string>();
    for (const loc of extraLocations) {
        if (loc.station) extraStationNames.add(loc.station);
    }
    for (const c of extraCases) {
        if (c.stationName) extraStationNames.add(c.stationName);
    }

    let idx = 100;
    for (const stName of extraStationNames) {
        let existing = await prisma.policeStation.findFirst({ where: { name: stName } });
        if (!existing) {
            const locObj = extraLocations.find(l => l.station === stName);
            const district = locObj?.district || "Delhi District";
            const lat = locObj?.latitude || (28.61 + (idx * 0.005));
            const lng = locObj?.longitude || (77.20 + (idx * 0.005));

            existing = await prisma.policeStation.create({
                data: {
                    name: stName,
                    district,
                    state: "Delhi",
                    lat,
                    lng
                }
            });
        }
        stationMap.set(stName, existing.id);
        idx++;
    }
    console.log(`✓ Police Stations ready (${stationMap.size} total)`);

    // ----------------------------------------------------
    // 2. OFFICERS
    // ----------------------------------------------------
    console.log("Seeding Officers...");
    const officerIds: string[] = [];

    for (const off of mockOfficers) {
        const o = await prisma.officer.upsert({
            where: { badgeNumber: off.badgeNumber },
            update: { name: off.name, rank: off.rank },
            create: {
                id: off.id,
                badgeNumber: off.badgeNumber,
                name: off.name,
                rank: off.rank
            }
        });
        officerIds.push(o.id);
    }

    // Ensure default officer
    const defaultOfficer = await prisma.officer.upsert({
        where: { badgeNumber: "SYS-999" },
        update: {},
        create: {
            badgeNumber: "SYS-999",
            name: "System Inspector Sharma",
            rank: "Inspector"
        }
    });
    officerIds.push(defaultOfficer.id);

    // Create a few more officers for stations
    const extraOfficerNames = [
        "SI Rajesh Kumar", "Insp. Anuj Verma", "SI Sunita Rani", 
        "Insp. Vikram Malhotra", "SI Deepak Tyagi", "Insp. Surender Pal"
    ];
    for (let i = 0; i < extraOfficerNames.length; i++) {
        const badge = `DL-OFF-${100 + i}`;
        const off = await prisma.officer.upsert({
            where: { badgeNumber: badge },
            update: {},
            create: {
                badgeNumber: badge,
                name: extraOfficerNames[i],
                rank: i % 2 === 0 ? "Sub-Inspector" : "Inspector"
            }
        });
        officerIds.push(off.id);
    }
    console.log(`✓ Officers ready (${officerIds.length} total)`);

    // ----------------------------------------------------
    // 3. MODUS OPERANDI
    // ----------------------------------------------------
    console.log("Seeding Modus Operandi...");
    const moMap = new Map<string, string>(); // name -> id

    for (const mo of mockMOs) {
        const created = await prisma.modusOperandi.upsert({
            where: { name: mo.name },
            update: { description: mo.description, targetType: mo.targetType, weaponType: mo.weaponType, timePattern: mo.timePattern, vehiclePattern: mo.vehiclePattern },
            create: {
                id: mo.id,
                name: mo.name,
                description: mo.description,
                targetType: mo.targetType,
                weaponType: mo.weaponType,
                timePattern: mo.timePattern,
                vehiclePattern: mo.vehiclePattern
            }
        });
        moMap.set(mo.name, created.id);
    }

    const extraMONames = new Set<string>();
    for (const c of extraCases) {
        if (c.modusOperandi) extraMONames.add(c.modusOperandi);
    }

    for (const moName of extraMONames) {
        let existing = await prisma.modusOperandi.findUnique({ where: { name: moName } });
        if (!existing) {
            existing = await prisma.modusOperandi.create({
                data: {
                    name: moName,
                    description: `Method of operation: ${moName}`,
                    targetType: moName.toLowerCase().includes("snatching") ? "Commuter / Pedestrian" : "General",
                    weaponType: moName.toLowerCase().includes("armed") ? "Firearm / Knife" : null
                }
            });
        }
        moMap.set(moName, existing.id);
    }
    console.log(`✓ Modus Operandi ready (${moMap.size} total)`);

    // ----------------------------------------------------
    // 4. ORGANIZATIONS
    // ----------------------------------------------------
    console.log("Seeding Organizations...");
    const orgMap = new Map<string, string>(); // name -> id

    for (const org of mockOrgs) {
        const created = await prisma.organization.upsert({
            where: { name: org.name },
            update: { description: org.description },
            create: { id: org.id, name: org.name, description: org.description }
        });
        orgMap.set(org.name, created.id);
    }

    const customOrgs = [
        { name: "Rohini Snatching Gang", description: "Active motorcycle snatching syndicate in North West Delhi" },
        { name: "Delhi Vehicle Theft Ring", description: "Interstate stolen vehicle lifting and chop shop network" },
        { name: "Seelampur Narcotics Syndicate", description: "Local drug distribution and peddling syndicate" }
    ];
    for (const cOrg of customOrgs) {
        const created = await prisma.organization.upsert({
            where: { name: cOrg.name },
            update: { description: cOrg.description },
            create: cOrg
        });
        orgMap.set(cOrg.name, created.id);
    }
    console.log(`✓ Organizations ready (${orgMap.size} total)`);

    // ----------------------------------------------------
    // 5. LOCATIONS
    // ----------------------------------------------------
    console.log("Seeding Locations...");
    const locationMap = new Map<string, string>(); // address -> id

    for (const loc of mockLocations) {
        const created = await prisma.location.upsert({
            where: { latitude_longitude: { latitude: loc.latitude, longitude: loc.longitude } },
            update: { address: loc.address, district: loc.district, station: loc.station, locationType: loc.locationType as any },
            create: {
                id: loc.id,
                address: loc.address,
                latitude: loc.latitude,
                longitude: loc.longitude,
                district: loc.district,
                station: loc.station,
                locationType: loc.locationType as any
            }
        });
        if (loc.address) locationMap.set(loc.address, created.id);
    }

    for (let i = 0; i < extraLocations.length; i++) {
        const loc = extraLocations[i];
        const { latitude, longitude } = loc.latitude && loc.longitude 
            ? { latitude: loc.latitude, longitude: loc.longitude }
            : stringToCoords(loc.address, i);

        const created = await prisma.location.upsert({
            where: { latitude_longitude: { latitude, longitude } },
            update: { address: loc.address, district: loc.district, station: loc.station, locationType: loc.locationType as any },
            create: {
                id: loc.id,
                address: loc.address,
                latitude,
                longitude,
                district: loc.district,
                station: loc.station,
                locationType: loc.locationType as any
            }
        });
        if (loc.address) locationMap.set(loc.address, created.id);
    }
    console.log(`✓ Locations ready (${locationMap.size} locations mapped)`);

    // ----------------------------------------------------
    // 6. PHONES
    // ----------------------------------------------------
    console.log("Seeding Phones...");
    const phoneMap = new Map<string, string>(); // number -> id

    for (const ph of mockPhones) {
        const created = await prisma.phone.upsert({
            where: { number: ph.number },
            update: {},
            create: { id: ph.id, number: ph.number }
        });
        phoneMap.set(ph.number, created.id);
    }

    const allPhoneObjs = getPhoneData();
    // Seed first 200 phones for performance while keeping all cluster phones
    for (const ph of allPhoneObjs.slice(0, 250)) {
        const created = await prisma.phone.upsert({
            where: { number: ph.number },
            update: {},
            create: { number: ph.number }
        });
        phoneMap.set(ph.number, created.id);
    }
    console.log(`✓ Phones ready (${phoneMap.size} total)`);

    // ----------------------------------------------------
    // 7. VEHICLES
    // ----------------------------------------------------
    console.log("Seeding Vehicles...");
    const vehicleMap = new Map<string, string>(); // registrationNo -> id

    for (const v of mockVehicles) {
        const regNo = v.registrationNo || `TEMP-${v.id}`;
        const created = await prisma.vehicle.upsert({
            where: { registrationNo: regNo },
            update: { make: v.make, model: v.model, color: v.color },
            create: { registrationNo: regNo, make: v.make, model: v.model, color: v.color }
        });
        vehicleMap.set(regNo, created.id);
        if (v.id) vehicleMap.set(v.id, created.id);
    }

    for (const v of extraVehicles) {
        const regNo = v.registrationNo;
        if (!regNo) continue;
        const created = await prisma.vehicle.upsert({
            where: { registrationNo: regNo },
            update: { make: v.make, model: v.model, color: v.color },
            create: { registrationNo: regNo, make: v.make, model: v.model, color: v.color }
        });
        vehicleMap.set(regNo, created.id);
        if (v.id) vehicleMap.set(v.id, created.id);
    }
    console.log(`✓ Vehicles ready (${vehicleMap.size} total)`);

    // ----------------------------------------------------
    // 8. PERSONS
    // ----------------------------------------------------
    console.log("Seeding Persons...");
    const personMap = new Map<string, string>(); // id or name -> db id

    for (const p of mockPersons) {
        const created = await prisma.person.upsert({
            where: { id: p.id },
            update: { name: p.name, age: p.age, gender: p.gender, riskScore: p.riskScore, aliases: p.aliases },
            create: {
                id: p.id,
                name: p.name,
                age: p.age,
                gender: p.gender,
                riskScore: p.riskScore,
                aliases: p.aliases,
                createdAt: new Date(p.createdAt)
            }
        });
        personMap.set(p.id, created.id);
        if (p.name) personMap.set(p.name, created.id);
    }

    for (const p of extraPersons) {
        const created = await prisma.person.upsert({
            where: { id: p.id },
            update: { name: p.name, age: p.age, gender: p.gender as any, riskScore: p.riskScore, aliases: p.aliases },
            create: {
                id: p.id,
                name: p.name,
                age: p.age,
                gender: (p.gender as any) || "UNKNOWN",
                riskScore: p.riskScore,
                aliases: p.aliases,
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
            }
        });
        personMap.set(p.id, created.id);
        if (p.name) personMap.set(p.name, created.id);
    }
    console.log(`✓ Persons ready (${extraPersons.length + mockPersons.length} total)`);

    // ----------------------------------------------------
    // 9. CASES
    // ----------------------------------------------------
    console.log("Seeding Cases...");
    const caseMap = new Map<string, string>(); // caseNumber or id -> db id

    for (const c of mockCases) {
        const created = await prisma.case.upsert({
            where: { caseNumber: c.caseNumber },
            update: {
                title: c.title,
                description: c.description,
                crimeType: c.crimeType,
                status: c.status,
                incidentDate: new Date(c.incidentDate),
                stationId: c.stationId,
                modusOperandiId: c.modusOperandiId
            },
            create: {
                id: c.id,
                caseNumber: c.caseNumber,
                title: c.title,
                description: c.description,
                crimeType: c.crimeType,
                status: c.status,
                incidentDate: new Date(c.incidentDate),
                createdAt: new Date(c.createdAt),
                updatedAt: new Date(c.updatedAt),
                stationId: c.stationId,
                modusOperandiId: c.modusOperandiId
            }
        });
        caseMap.set(c.id, created.id);
        caseMap.set(c.caseNumber, created.id);
    }

    for (const c of extraCases) {
        const stationId = (c.stationName && stationMap.get(c.stationName)) || mockStations[0].id;
        const moId = (c.modusOperandi && moMap.get(c.modusOperandi)) || null;

        const created = await prisma.case.upsert({
            where: { caseNumber: c.caseNumber },
            update: {
                title: c.title,
                description: c.description,
                crimeType: c.crimeType as any,
                status: c.status as any,
                incidentDate: new Date(c.incidentDate),
                stationId,
                modusOperandiId: moId
            },
            create: {
                caseNumber: c.caseNumber,
                title: c.title,
                description: c.description,
                crimeType: c.crimeType as any,
                status: c.status as any,
                incidentDate: new Date(c.incidentDate),
                stationId,
                modusOperandiId: moId
            }
        });
        caseMap.set(c.caseNumber, created.id);
    }
    console.log(`✓ Cases ready (${mockCases.length + extraCases.length} total)`);

    // ----------------------------------------------------
    // 10. EVIDENCES
    // ----------------------------------------------------
    console.log("Seeding Evidences...");
    for (const ev of mockEvidences) {
        await prisma.evidence.upsert({
            where: { id: ev.id },
            update: { description: ev.description, fileUrl: ev.fileUrl },
            create: {
                id: ev.id,
                caseId: caseMap.get(ev.caseId) || ev.caseId,
                type: ev.type as any,
                description: ev.description,
                fileUrl: ev.fileUrl,
                uploadedById: ev.uploadedById,
                extractedData: ev.extractedData as any,
                createdAt: new Date(ev.createdAt)
            }
        });
    }

    // Add generated evidences for extra cases
    const evidenceTypes = ["DOCUMENT", "IMAGE", "VIDEO", "AUDIO", "DIGITAL", "PHYSICAL"];
    for (let i = 0; i < extraCases.length; i++) {
        const c = extraCases[i];
        const dbCaseId = caseMap.get(c.caseNumber);
        if (!dbCaseId) continue;

        const evId = `ev-extra-${i + 1}`;
        const type = evidenceTypes[i % evidenceTypes.length] as any;
        const officerId = officerIds[i % officerIds.length];

        await prisma.evidence.upsert({
            where: { id: evId },
            update: {},
            create: {
                id: evId,
                caseId: dbCaseId,
                type,
                description: `Evidence artifact for case ${c.caseNumber}: ${c.title}`,
                fileUrl: `http://storage.police.gov.in/evidence/${c.caseNumber.toLowerCase()}_file.${type === "IMAGE" ? "jpg" : type === "VIDEO" ? "mp4" : "pdf"}`,
                uploadedById: officerId,
                extractedData: { caseNumber: c.caseNumber, verified: true, score: 0.95 }
            }
        });
    }
    console.log("✓ Evidences ready");

    // ----------------------------------------------------
    // 11. CASE JUNCTIONS (CasePerson, CaseVehicle, CasePhone, CaseLocation, CaseOrganization)
    // ----------------------------------------------------
    console.log("Seeding Case Junctions...");

    // Mock Case Persons
    for (const cp of mockCasePersons) {
        await prisma.casePerson.upsert({
            where: { caseId_personId: { caseId: caseMap.get(cp.caseId)!, personId: personMap.get(cp.personId)! } },
            update: { role: cp.role as any },
            create: { caseId: caseMap.get(cp.caseId)!, personId: personMap.get(cp.personId)!, role: cp.role as any }
        });
    }

    // Mock Case Vehicles
    for (const cv of mockCaseVehicles) {
        await prisma.caseVehicle.upsert({
            where: { caseId_vehicleId: { caseId: caseMap.get(cv.caseId)!, vehicleId: vehicleMap.get(cv.vehicleId) || cv.vehicleId } },
            update: {},
            create: { caseId: caseMap.get(cv.caseId)!, vehicleId: vehicleMap.get(cv.vehicleId) || cv.vehicleId }
        });
    }

    // Mock Case Phones
    for (const cp of mockCasePhones) {
        await prisma.casePhone.upsert({
            where: { caseId_phoneId: { caseId: caseMap.get(cp.caseId)!, phoneId: phoneMap.get(cp.phoneId) || cp.phoneId } },
            update: {},
            create: { caseId: caseMap.get(cp.caseId)!, phoneId: phoneMap.get(cp.phoneId) || cp.phoneId }
        });
    }

    // Mock Case Locations
    for (const cl of mockCaseLocations) {
        await prisma.caseLocation.upsert({
            where: { caseId_locationId: { caseId: caseMap.get(cl.caseId)!, locationId: locationMap.get(cl.locationId) || cl.locationId } },
            update: {},
            create: { caseId: caseMap.get(cl.caseId)!, locationId: locationMap.get(cl.locationId) || cl.locationId }
        });
    }

    // Mock Case Organizations
    for (const co of mockCaseOrganizations) {
        await prisma.caseOrganization.upsert({
            where: { caseId_organizationId: { caseId: caseMap.get(co.caseId)!, organizationId: orgMap.get(co.organizationId) || co.organizationId } },
            update: {},
            create: { caseId: caseMap.get(co.caseId)!, organizationId: orgMap.get(co.organizationId) || co.organizationId }
        });
    }

    // Rich Junctions for extraCases (60 cases)
    const personIdList = Array.from(new Set(Array.from(personMap.values())));
    const vehicleIdList = Array.from(new Set(Array.from(vehicleMap.values())));
    const phoneIdList = Array.from(new Set(Array.from(phoneMap.values())));
    const locationIdList = Array.from(new Set(Array.from(locationMap.values())));

    for (let i = 0; i < extraCases.length; i++) {
        const c = extraCases[i];
        const dbCaseId = caseMap.get(c.caseNumber);
        if (!dbCaseId) continue;

        // Connect Locations
        const matchedLoc = extraLocations.find(l => l.station === c.stationName) || extraLocations[i % extraLocations.length];
        const dbLocId = locationMap.get(matchedLoc.address);
        if (dbLocId) {
            await prisma.caseLocation.upsert({
                where: { caseId_locationId: { caseId: dbCaseId, locationId: dbLocId } },
                update: {},
                create: { caseId: dbCaseId, locationId: dbLocId }
            });
        }

        // Connect Persons based on case type
        if (c.caseNumber.includes("0051") || c.caseNumber.includes("0052") || c.caseNumber.includes("0053") || c.caseNumber.includes("0054") || c.caseNumber.includes("0055") || c.caseNumber.includes("0056") || c.caseNumber.includes("0058") || c.caseNumber.includes("0060")) {
            // Black Pulsar Snatching Cluster
            const p1 = personMap.get("PER-0001");
            const p2 = personMap.get("PER-0002");
            const p3 = personMap.get("PER-0012");

            if (p1) await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p1 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p1, role: "SUSPECT" } });
            if (p2) await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p2 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p2, role: "SUSPECT" } });
            if (p3) await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p3 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p3, role: "SUSPECT" } });

            // Connect Black Pulsar Vehicle (VEH-0001)
            const vPulsar = vehicleMap.get("DL8SAB1234");
            if (vPulsar) await prisma.caseVehicle.upsert({ where: { caseId_vehicleId: { caseId: dbCaseId, vehicleId: vPulsar } }, update: {}, create: { caseId: dbCaseId, vehicleId: vPulsar } });

            // Connect Rohini Snatching Gang
            const orgRohini = orgMap.get("Rohini Snatching Gang");
            if (orgRohini) await prisma.caseOrganization.upsert({ where: { caseId_organizationId: { caseId: dbCaseId, organizationId: orgRohini } }, update: {}, create: { caseId: dbCaseId, organizationId: orgRohini } });
        } else if (c.crimeType === "CYBERCRIME" || c.crimeType === "FRAUD") {
            const p1 = personMap.get("PER-0003") || personIdList[i % personIdList.length];
            const p2 = personMap.get("PER-0008") || personIdList[(i + 1) % personIdList.length];
            const p3 = personMap.get("PER-0004") || personIdList[(i + 2) % personIdList.length];

            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p1 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p1, role: "SUSPECT" } });
            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p2 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p2, role: "SUSPECT" } });
            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p3 } }, update: { role: "VICTIM" }, create: { caseId: dbCaseId, personId: p3, role: "VICTIM" } });

            const orgPhish = orgMap.get("PhishPro Gang");
            if (orgPhish) await prisma.caseOrganization.upsert({ where: { caseId_organizationId: { caseId: dbCaseId, organizationId: orgPhish } }, update: {}, create: { caseId: dbCaseId, organizationId: orgPhish } });
        } else if (c.crimeType === "DRUG_OFFENSE") {
            const p1 = personMap.get("PER-0009") || personIdList[i % personIdList.length];
            const p2 = personMap.get("PER-0010") || personIdList[(i + 1) % personIdList.length];

            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p1 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p1, role: "SUSPECT" } });
            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: p2 } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: p2, role: "SUSPECT" } });

            const orgDrug = orgMap.get("Seelampur Narcotics Syndicate");
            if (orgDrug) await prisma.caseOrganization.upsert({ where: { caseId_organizationId: { caseId: dbCaseId, organizationId: orgDrug } }, update: {}, create: { caseId: dbCaseId, organizationId: orgDrug } });
        } else {
            // Generic case mapping
            const suspectId = personIdList[i % personIdList.length];
            const victimId = personIdList[(i + 5) % personIdList.length];

            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: suspectId } }, update: { role: "SUSPECT" }, create: { caseId: dbCaseId, personId: suspectId, role: "SUSPECT" } });
            await prisma.casePerson.upsert({ where: { caseId_personId: { caseId: dbCaseId, personId: victimId } }, update: { role: "VICTIM" }, create: { caseId: dbCaseId, personId: victimId, role: "VICTIM" } });

            const vehId = vehicleIdList[i % vehicleIdList.length];
            await prisma.caseVehicle.upsert({ where: { caseId_vehicleId: { caseId: dbCaseId, vehicleId: vehId } }, update: {}, create: { caseId: dbCaseId, vehicleId: vehId } });

            const phId = phoneIdList[i % phoneIdList.length];
            await prisma.casePhone.upsert({ where: { caseId_phoneId: { caseId: dbCaseId, phoneId: phId } }, update: {}, create: { caseId: dbCaseId, phoneId: phId } });
        }
    }
    console.log("✓ Case Junctions ready");

    // ----------------------------------------------------
    // 12. PERSON RELATIONSHIPS & ORGANIZATION MEMBERS
    // ----------------------------------------------------
    console.log("Seeding Person Relationships & Organization Members...");

    // Mock Person Relationships
    for (const rel of mockPersonRelationships) {
        const srcId = personMap.get(rel.sourcePersonId);
        const tgtId = personMap.get(rel.targetPersonId);

        if (srcId && tgtId) {
            const existing = await prisma.personRelationship.findFirst({
                where: { sourcePersonId: srcId, targetPersonId: tgtId, relationType: rel.relationType as any }
            });
            if (!existing) {
                await prisma.personRelationship.create({
                    data: {
                        id: rel.id,
                        sourcePersonId: srcId,
                        targetPersonId: tgtId,
                        relationType: rel.relationType as any,
                        confidence: rel.confidence,
                        createdAt: new Date(rel.createdAt)
                    }
                });
            }
        }
    }

    // Extra Person Relationships from personData.ts
    for (const rel of extraPersonRelationships) {
        const srcId = personMap.get(rel.sourcePersonId);
        const tgtId = personMap.get(rel.targetPersonId);

        if (srcId && tgtId) {
            const existing = await prisma.personRelationship.findFirst({
                where: { sourcePersonId: srcId, targetPersonId: tgtId, relationType: rel.relationType as any }
            });
            if (!existing) {
                await prisma.personRelationship.create({
                    data: {
                        sourcePersonId: srcId,
                        targetPersonId: tgtId,
                        relationType: rel.relationType as any,
                        confidence: rel.confidence
                    }
                });
            }
        }
    }

    // Mock Organization Members
    for (const om of mockOrgMembers) {
        const pId = personMap.get(om.personId);
        const oId = orgMap.get(om.organizationId) || om.organizationId;
        if (pId && oId) {
            await prisma.organizationMember.upsert({
                where: { personId_organizationId: { personId: pId, organizationId: oId } },
                update: { role: om.role, confidence: om.confidence },
                create: { personId: pId, organizationId: oId, role: om.role, confidence: om.confidence }
            });
        }
    }

    // Custom Organization Members
    const gangMemberships = [
        { personId: "PER-0001", orgName: "Rohini Snatching Gang", role: "Leader", confidence: 0.95 },
        { personId: "PER-0002", orgName: "Rohini Snatching Gang", role: "Motorcycle Rider", confidence: 0.92 },
        { personId: "PER-0012", orgName: "Rohini Snatching Gang", role: "Snatcher / Accomplice", confidence: 0.88 },
        { personId: "PER-0028", orgName: "Rohini Snatching Gang", role: "Associate", confidence: 0.82 },

        { personId: "PER-0005", orgName: "Delhi Vehicle Theft Ring", role: "Syndicate Head", confidence: 0.96 },
        { personId: "PER-0011", orgName: "Delhi Vehicle Theft Ring", role: "Fence / Chop Shop Owner", confidence: 0.91 },
        { personId: "PER-0017", orgName: "Delhi Vehicle Theft Ring", role: "Car Lifter", confidence: 0.89 },
        { personId: "PER-0025", orgName: "Delhi Vehicle Theft Ring", role: "Coordinator", confidence: 0.85 },
        { personId: "PER-0027", orgName: "Delhi Vehicle Theft Ring", role: "Mechanic", confidence: 0.84 },

        { personId: "PER-0009", orgName: "Seelampur Narcotics Syndicate", role: "Regional Supplier", confidence: 0.94 },
        { personId: "PER-0010", orgName: "Seelampur Narcotics Syndicate", role: "Street Dealer", confidence: 0.90 },
        { personId: "PER-0019", orgName: "Seelampur Narcotics Syndicate", role: "Logistics", confidence: 0.88 },
        { personId: "PER-0026", orgName: "Seelampur Narcotics Syndicate", role: "Distributor", confidence: 0.86 },

        { personId: "PER-0008", orgName: "PhishPro Gang", role: "Call Center Supervisor", confidence: 0.93 },
        { personId: "PER-0003", orgName: "PhishPro Gang", role: "Account Financier", confidence: 0.91 },
        { personId: "PER-0013", orgName: "PhishPro Gang", role: "Tele-caller", confidence: 0.87 },
        { personId: "PER-0020", orgName: "PhishPro Gang", role: "Money Launderer", confidence: 0.89 }
    ];

    for (const gm of gangMemberships) {
        const pId = personMap.get(gm.personId);
        const oId = orgMap.get(gm.orgName);
        if (pId && oId) {
            await prisma.organizationMember.upsert({
                where: { personId_organizationId: { personId: pId, organizationId: oId } },
                update: { role: gm.role, confidence: gm.confidence },
                create: { personId: pId, organizationId: oId, role: gm.role, confidence: gm.confidence }
            });
        }
    }
    console.log("✓ Person Relationships & Organization Members ready");

    // ----------------------------------------------------
    // 13. PERSON CONNECTIONS (Phones, Vehicles, Addresses)
    // ----------------------------------------------------
    console.log("Seeding Person Connections (Phones, Vehicles, Addresses)...");

    for (const pv of mockPersonVehicles) {
        const pId = personMap.get(pv.personId);
        const vId = vehicleMap.get(pv.vehicleId) || pv.vehicleId;
        if (pId && vId) {
            await prisma.person.update({ where: { id: pId }, data: { vehicles: { connect: { id: vId } } } });
        }
    }

    for (const pp of mockPersonPhones) {
        const pId = personMap.get(pp.personId);
        const phId = phoneMap.get(pp.phoneId) || pp.phoneId;
        if (pId && phId) {
            await prisma.person.update({ where: { id: pId }, data: { phones: { connect: { id: phId } } } });
        }
    }

    for (const pa of mockPersonAddresses) {
        const pId = personMap.get(pa.personId);
        const lId = locationMap.get(pa.locationId) || pa.locationId;
        if (pId && lId) {
            await prisma.person.update({ where: { id: pId }, data: { addresses: { connect: { id: lId } } } });
        }
    }

    // Connect PER-0001 to PER-0030 to cluster phones, vehicles, addresses
    for (let i = 1; i <= 30; i++) {
        const perKey = `PER-${String(i).padStart(4, "0")}`;
        const pId = personMap.get(perKey);
        if (!pId) continue;

        const phNum = clusterPhones[(i - 1) % clusterPhones.length];
        const phId = phoneMap.get(phNum);
        if (phId) {
            await prisma.person.update({ where: { id: pId }, data: { phones: { connect: { id: phId } } } });
        }

        const vehReg = extraVehicles[(i - 1) % extraVehicles.length].registrationNo;
        const vId = vehicleMap.get(vehReg);
        if (vId) {
            await prisma.person.update({ where: { id: pId }, data: { vehicles: { connect: { id: vId } } } });
        }

        const locAddr = extraLocations[(i - 1) % extraLocations.length].address;
        const lId = locationMap.get(locAddr);
        if (lId) {
            await prisma.person.update({ where: { id: pId }, data: { addresses: { connect: { id: lId } } } });
        }
    }
    console.log("✓ Person Connections ready");

    console.log("\n==========================================");
    console.log("SUCCESS! Database seeding completed.");
    console.log("==========================================");
}

main()
    .catch((e) => {
        console.error("Seeding failed with error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
