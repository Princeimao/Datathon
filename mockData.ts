// ============================================================
//  MOCK DATA — Police Case Management System
//  Drop this file into your project and import what you need.
//  All IDs use cuid-style strings for Prisma compatibility.
// ============================================================

// ─── ENUMS ────────────────────────────────────────────────

export type CrimeType =
  | "HOMICIDE" | "ROBBERY" | "ASSAULT" | "THEFT" | "BURGLARY"
  | "KIDNAPPING" | "FRAUD" | "CYBERCRIME" | "DRUG_OFFENSE"
  | "RAPE" | "MURDER" | "OTHER";

export type CaseStatus = "OPEN" | "CLOSED" | "COLD";
export type EvidenceType = "DOCUMENT" | "IMAGE" | "VIDEO" | "AUDIO" | "DIGITAL" | "PHYSICAL" | "OTHER";
export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type PersonRole = "SUSPECT" | "VICTIM" | "WITNESS" | "INFORMANT" | "UNKNOWN";
export type LocationType = "CRIME_SCENE" | "RELATED_PLACE" | "REPORTING_STATION" | "UNKNOWN";
export type RelationshipType =
  | "ASSOCIATED_WITH" | "FAMILY" | "GANG_MEMBER" | "CONTACTED" | "ACCOMPLICE" | "FINANCIAL_LINK";

// ─── POLICE STATIONS ──────────────────────────────────────

export const policeStations = [
  { id: "st_001", name: "Connaught Place Police Station", state: "Delhi", district: "Central Delhi", lat: 28.6328, lng: 77.2197 },
  { id: "st_002", name: "Andheri Police Station",          state: "Maharashtra", district: "Mumbai Suburban", lat: 19.1136, lng: 72.8697 },
  { id: "st_003", name: "Lalbazar Police HQ",              state: "West Bengal", district: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { id: "st_004", name: "Egmore Police Station",           state: "Tamil Nadu", district: "Chennai", lat: 13.0732, lng: 80.2609 },
  { id: "st_005", name: "Banjara Hills Police Station",    state: "Telangana", district: "Hyderabad", lat: 17.4126, lng: 78.4479 },
];


export const officers = [
  { id: "off_001", badgeNumber: "DL-4421", name: "Vikram Singh",    rank: "Inspector",       stationId: "st_001" },
  { id: "off_002", badgeNumber: "MH-8832", name: "Priya Nair",      rank: "Sub-Inspector",   stationId: "st_002" },
  { id: "off_003", badgeNumber: "WB-1103", name: "Arjun Chatterjee",rank: "Deputy SP",       stationId: "st_003" },
  { id: "off_004", badgeNumber: "TN-5567", name: "Meena Rajan",     rank: "Inspector",       stationId: "st_004" },
  { id: "off_005", badgeNumber: "TS-9921", name: "Ravi Kumar",      rank: "Constable",       stationId: "st_005" },
];

export const persons = [
  { id: "per_001", name: "Rajesh Pandey",   age: 34, gender: "MALE"    as Gender, riskScore: 8.2, aliases: ["Raju", "RJ"], createdAt: "2024-01-10T08:00:00Z" },
  { id: "per_002", name: "Sunita Verma",    age: 28, gender: "FEMALE"  as Gender, riskScore: 2.1, aliases: [],            createdAt: "2024-01-12T09:00:00Z" },
  { id: "per_003", name: "Aamir Shaikh",    age: 41, gender: "MALE"    as Gender, riskScore: 9.5, aliases: ["Tiger"],     createdAt: "2024-02-01T11:00:00Z" },
  { id: "per_004", name: "Kavya Reddy",     age: 22, gender: "FEMALE"  as Gender, riskScore: 1.0, aliases: [],            createdAt: "2024-02-14T10:30:00Z" },
  { id: "per_005", name: "Deepak Mishra",   age: 37, gender: "MALE"    as Gender, riskScore: 6.7, aliases: ["Deeps"],     createdAt: "2024-03-05T14:00:00Z" },
  { id: "per_006", name: "Farhan Qureshi",  age: 29, gender: "MALE"    as Gender, riskScore: 7.3, aliases: ["Farhan D"],  createdAt: "2024-03-10T16:00:00Z" },
  { id: "per_007", name: "Lakshmi Iyer",    age: 55, gender: "FEMALE"  as Gender, riskScore: 0.5, aliases: [],            createdAt: "2024-04-01T08:00:00Z" },
  { id: "per_008", name: "Unknown Male",    age: null, gender: "UNKNOWN" as Gender, riskScore: 5.0, aliases: ["Man in red car"], createdAt: "2024-04-15T12:00:00Z" },
];

export const vehicles = [
  { id: "veh_001", registrationNo: "DL-01-CA-4521", make: "Maruti",  model: "Swift Dzire", color: "White"  },
  { id: "veh_002", registrationNo: "MH-02-BK-7734", make: "Honda",   model: "City",        color: "Black"  },
  { id: "veh_003", registrationNo: "WB-06-AC-1190", make: "Tata",    model: "Nexon",       color: "Grey"   },
  { id: "veh_004", registrationNo: null,             make: "Yamaha",  model: "FZ",          color: "Red"    },
  { id: "veh_005", registrationNo: "TN-09-DD-5500", make: "Toyota",  model: "Innova",      color: "Silver" },
];

export const phones = [
  { id: "phn_001", number: "+91-9810044221" },
  { id: "phn_002", number: "+91-9967812345" },
  { id: "phn_003", number: "+91-8334501122" },
  { id: "phn_004", number: "+91-7700990011" },
  { id: "phn_005", number: "+91-9344211876" },
];

export const locations = [
  { id: "loc_001", address: "23, Hauz Khas Village, New Delhi",        latitude: 28.5492, longitude: 77.2004, district: "South Delhi",       station: "Hauz Khas PS",  locationType: "CRIME_SCENE"       as LocationType },
  { id: "loc_002", address: "Linking Road, Bandra West, Mumbai",       latitude: 19.0607, longitude: 72.8359, district: "Mumbai Suburban",   station: "Bandra PS",     locationType: "CRIME_SCENE"       as LocationType },
  { id: "loc_003", address: "Park Street, Kolkata",                    latitude: 22.5519, longitude: 88.3524, district: "Kolkata",           station: "Park Street PS",locationType: "RELATED_PLACE"     as LocationType },
  { id: "loc_004", address: "T. Nagar, Chennai",                       latitude: 13.0418, longitude: 80.2341, district: "Chennai Central",   station: "T.Nagar PS",    locationType: "CRIME_SCENE"       as LocationType },
  { id: "loc_005", address: "Jubilee Hills, Hyderabad",                latitude: 17.4250, longitude: 78.4098, district: "Hyderabad",         station: "Jubilee Hills PS",locationType: "RELATED_PLACE"   as LocationType },
  { id: "loc_006", address: "Connaught Place, New Delhi",              latitude: 28.6315, longitude: 77.2167, district: "Central Delhi",     station: "CP PS",         locationType: "REPORTING_STATION" as LocationType },
];

export const organizations = [
  { id: "org_001", name: "D-Company Network", description: "Organized crime syndicate with cross-border operations" },
  { id: "org_002", name: "PhishPro Gang",     description: "Cybercrime group specializing in banking phishing attacks" },
  { id: "org_003", name: "Northern Cartel",   description: "Drug trafficking network operating in NCR region" },
];


export const modusOperandis = [
  {
    id: "mo_001",
    name: "Late-night ATM Robbery",
    description: "Targets isolated ATM users post midnight using a motorcycle getaway",
    targetType: "Individual",
    weaponType: "Knife",
    timePattern: "00:00–04:00",
    vehiclePattern: "Motorcycle without plate",
  },
  {
    id: "mo_002",
    name: "OTP Phishing Scam",
    description: "Impersonates bank executives to extract OTP and drain accounts",
    targetType: "Elderly / Less tech-savvy individuals",
    weaponType: null,
    timePattern: "10:00–14:00 weekdays",
    vehiclePattern: null,
  },
  {
    id: "mo_003",
    name: "Residential Burglary",
    description: "Breaks into houses during festive season when residents are away",
    targetType: "Residential property",
    weaponType: "Crowbar",
    timePattern: "Evening / festival days",
    vehiclePattern: "SUV",
  },
];

// ─── CASES ────────────────────────────────────────────────

export const cases = [
  {
    id: "case_001",
    caseNumber: "DL/CP/2024/001",
    title: "ATM Robbery at Hauz Khas",
    description: "Armed suspect on motorcycle robbed a victim at an ATM at knifepoint at 2 AM. Suspect fled towards South Ex.",
    crimeType: "ROBBERY" as CrimeType,
    status: "OPEN" as CaseStatus,
    incidentDate: "2024-04-20T02:15:00Z",
    createdAt: "2024-04-20T07:30:00Z",
    updatedAt: "2024-05-01T10:00:00Z",
    stationId: "st_001",
    modusOperandiId: "mo_001",
  },
  {
    id: "case_002",
    caseNumber: "MH/AN/2024/047",
    title: "Bank Phishing Fraud – Bandra",
    description: "Victim received a call from someone posing as HDFC Bank. Lost ₹3.2 lakh via OTP sharing.",
    crimeType: "FRAUD" as CrimeType,
    status: "OPEN" as CaseStatus,
    incidentDate: "2024-05-10T11:45:00Z",
    createdAt: "2024-05-10T14:00:00Z",
    updatedAt: "2024-06-01T09:00:00Z",
    stationId: "st_002",
    modusOperandiId: "mo_002",
  },
  {
    id: "case_003",
    caseNumber: "WB/LB/2023/199",
    title: "Drug Trafficking – Park Street",
    description: "Informant tip led to recovery of 4 kg heroin. Two suspects arrested; kingpin absconding.",
    crimeType: "DRUG_OFFENSE" as CrimeType,
    status: "CLOSED" as CaseStatus,
    incidentDate: "2023-11-15T20:00:00Z",
    createdAt: "2023-11-16T06:00:00Z",
    updatedAt: "2024-01-20T11:00:00Z",
    stationId: "st_003",
    modusOperandiId: null,
  },
  {
    id: "case_004",
    caseNumber: "TN/EG/2024/088",
    title: "Residential Burglary – T. Nagar",
    description: "House broken into during Diwali night. Jewelry worth ₹8 lakh stolen. No CCTV coverage.",
    crimeType: "BURGLARY" as CrimeType,
    status: "COLD" as CaseStatus,
    incidentDate: "2023-11-12T21:30:00Z",
    createdAt: "2023-11-13T08:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
    stationId: "st_004",
    modusOperandiId: "mo_003",
  },
  {
    id: "case_005",
    caseNumber: "TS/BH/2024/031",
    title: "Kidnapping for Ransom – Jubilee Hills",
    description: "Businessman's son kidnapped. Ransom of ₹50 lakh demanded. Victim recovered in 48 hours.",
    crimeType: "KIDNAPPING" as CrimeType,
    status: "CLOSED" as CaseStatus,
    incidentDate: "2024-03-05T18:00:00Z",
    createdAt: "2024-03-05T20:30:00Z",
    updatedAt: "2024-03-08T15:00:00Z",
    stationId: "st_005",
    modusOperandiId: null,
  },
  {
    id: "case_006",
    caseNumber: "DL/CP/2024/072",
    title: "Cybercrime – Ransomware Attack on SME",
    description: "Small business in CP had its servers encrypted. Attacker demanded Bitcoin payment.",
    crimeType: "CYBERCRIME" as CrimeType,
    status: "OPEN" as CaseStatus,
    incidentDate: "2024-06-01T09:00:00Z",
    createdAt: "2024-06-01T12:00:00Z",
    updatedAt: "2024-06-05T10:00:00Z",
    stationId: "st_001",
    modusOperandiId: null,
  },
];

// ─── EVIDENCES ────────────────────────────────────────────

export const evidences = [
  { id: "ev_001", caseId: "case_001", type: "IMAGE"    as EvidenceType, description: "CCTV screenshot of suspect motorcycle", fileUrl: "/uploads/evidence/case001_cctv.jpg", uploadedById: "off_001", extractedData: { platePartial: "DL-01", confidence: 0.72 }, createdAt: "2024-04-20T08:00:00Z" },
  { id: "ev_002", caseId: "case_001", type: "DOCUMENT" as EvidenceType, description: "ATM transaction log PDF",               fileUrl: "/uploads/evidence/case001_atm_log.pdf", uploadedById: "off_001", extractedData: { amount: 15000, time: "02:14" }, createdAt: "2024-04-21T09:30:00Z" },
  { id: "ev_003", caseId: "case_002", type: "AUDIO"    as EvidenceType, description: "Recorded scam call from victim's phone", fileUrl: "/uploads/evidence/case002_call.mp3", uploadedById: "off_002", extractedData: { duration: "4m32s", callerNumber: "+91-7700990011" }, createdAt: "2024-05-11T10:00:00Z" },
  { id: "ev_004", caseId: "case_003", type: "PHYSICAL" as EvidenceType, description: "4 kg heroin seized, lab report attached",fileUrl: "/uploads/evidence/case003_lab_report.pdf", uploadedById: "off_003", extractedData: { substanceType: "Heroin", purity: "74%" }, createdAt: "2023-11-16T14:00:00Z" },
  { id: "ev_005", caseId: "case_005", type: "VIDEO"    as EvidenceType, description: "Ransom drop location surveillance",      fileUrl: "/uploads/evidence/case005_surveillance.mp4", uploadedById: "off_005", extractedData: { vehicleSpotted: "MH-02-BK-7734" }, createdAt: "2024-03-06T08:00:00Z" },
  { id: "ev_006", caseId: "case_006", type: "DIGITAL"  as EvidenceType, description: "Ransom note & encrypted file sample",    fileUrl: "/uploads/evidence/case006_ransom_note.txt", uploadedById: "off_001", extractedData: { btcWallet: "1A2b3C4d...", demandUSD: 5000 }, createdAt: "2024-06-01T13:00:00Z" },
];

// ─── CASE ↔ PERSONS ───────────────────────────────────────

export const casePersons = [
  { caseId: "case_001", personId: "per_001", role: "SUSPECT" as PersonRole },
  { caseId: "case_001", personId: "per_002", role: "VICTIM"  as PersonRole },
  { caseId: "case_002", personId: "per_006", role: "SUSPECT" as PersonRole },
  { caseId: "case_002", personId: "per_007", role: "VICTIM"  as PersonRole },
  { caseId: "case_003", personId: "per_003", role: "SUSPECT" as PersonRole },
  { caseId: "case_003", personId: "per_005", role: "INFORMANT" as PersonRole },
  { caseId: "case_004", personId: "per_008", role: "SUSPECT" as PersonRole },
  { caseId: "case_005", personId: "per_003", role: "SUSPECT" as PersonRole },
  { caseId: "case_005", personId: "per_004", role: "VICTIM"  as PersonRole },
  { caseId: "case_006", personId: "per_006", role: "SUSPECT" as PersonRole },
];

// ─── CASE ↔ VEHICLES ──────────────────────────────────────

export const caseVehicles = [
  { caseId: "case_001", vehicleId: "veh_004" },
  { caseId: "case_003", vehicleId: "veh_003" },
  { caseId: "case_005", vehicleId: "veh_002" },
  { caseId: "case_005", vehicleId: "veh_005" },
];

// ─── CASE ↔ PHONES ────────────────────────────────────────

export const casePhones = [
  { caseId: "case_001", phoneId: "phn_001" },
  { caseId: "case_002", phoneId: "phn_004" },
  { caseId: "case_003", phoneId: "phn_002" },
  { caseId: "case_005", phoneId: "phn_003" },
  { caseId: "case_006", phoneId: "phn_005" },
];

// ─── CASE ↔ LOCATIONS ─────────────────────────────────────

export const caseLocations = [
  { caseId: "case_001", locationId: "loc_001" },
  { caseId: "case_001", locationId: "loc_006" },
  { caseId: "case_002", locationId: "loc_002" },
  { caseId: "case_003", locationId: "loc_003" },
  { caseId: "case_004", locationId: "loc_004" },
  { caseId: "case_005", locationId: "loc_005" },
  { caseId: "case_006", locationId: "loc_006" },
];

// ─── CASE ↔ ORGANIZATIONS ─────────────────────────────────

export const caseOrganizations = [
  { caseId: "case_003", organizationId: "org_001" },
  { caseId: "case_002", organizationId: "org_002" },
  { caseId: "case_006", organizationId: "org_002" },
  { caseId: "case_005", organizationId: "org_001" },
];

// ─── PERSON RELATIONSHIPS ─────────────────────────────────

export const personRelationships = [
  { id: "rel_001", sourcePersonId: "per_001", targetPersonId: "per_006", relationType: "ASSOCIATED_WITH" as RelationshipType, confidence: 0.85, createdAt: "2024-04-25T00:00:00Z" },
  { id: "rel_002", sourcePersonId: "per_003", targetPersonId: "per_005", relationType: "GANG_MEMBER"    as RelationshipType, confidence: 0.92, createdAt: "2023-12-01T00:00:00Z" },
  { id: "rel_003", sourcePersonId: "per_003", targetPersonId: "per_001", relationType: "ACCOMPLICE"     as RelationshipType, confidence: 0.70, createdAt: "2024-01-15T00:00:00Z" },
  { id: "rel_004", sourcePersonId: "per_006", targetPersonId: "per_003", relationType: "FINANCIAL_LINK" as RelationshipType, confidence: 0.65, createdAt: "2024-05-20T00:00:00Z" },
  { id: "rel_005", sourcePersonId: "per_004", targetPersonId: "per_007", relationType: "FAMILY"         as RelationshipType, confidence: 1.00, createdAt: "2024-03-05T00:00:00Z" },
];

// ─── ORGANIZATION MEMBERS ─────────────────────────────────

export const organizationMembers = [
  { personId: "per_003", organizationId: "org_001", role: "Leader",     confidence: 0.95 },
  { personId: "per_001", organizationId: "org_001", role: "Operative",  confidence: 0.78 },
  { personId: "per_006", organizationId: "org_002", role: "Technician", confidence: 0.88 },
  { personId: "per_005", organizationId: "org_003", role: "Courier",    confidence: 0.80 },
];

// ─── PERSON ↔ VEHICLES / PHONES / ADDRESSES ───────────────

export const personVehicles   = [
  { personId: "per_001", vehicleId: "veh_001" },
  { personId: "per_003", vehicleId: "veh_002" },
  { personId: "per_003", vehicleId: "veh_005" },
  { personId: "per_005", vehicleId: "veh_003" },
];

export const personPhones = [
  { personId: "per_001", phoneId: "phn_001" },
  { personId: "per_006", phoneId: "phn_004" },
  { personId: "per_003", phoneId: "phn_002" },
  { personId: "per_005", phoneId: "phn_003" },
];

export const personAddresses = [
  { personId: "per_001", locationId: "loc_001" },
  { personId: "per_007", locationId: "loc_004" },
  { personId: "per_004", locationId: "loc_005" },
];

// ─── HELPER: fully hydrated case lookup ───────────────────

export function getCaseById(id: string) {
  const c = cases.find(x => x.id === id);
  if (!c) return null;
  return {
    ...c,
    station:       policeStations.find(s => s.id === c.stationId),
    modusOperandi: modusOperandis.find(m => m.id === c.modusOperandiId) ?? null,
    evidences:     evidences.filter(e => e.caseId === id).map(e => ({
                     ...e, uploadedBy: officers.find(o => o.id === e.uploadedById),
                   })),
    persons:       casePersons.filter(cp => cp.caseId === id).map(cp => ({
                     role: cp.role, person: persons.find(p => p.id === cp.personId),
                   })),
    vehicles:      caseVehicles.filter(cv => cv.caseId === id).map(cv => ({
                     vehicle: vehicles.find(v => v.id === cv.vehicleId),
                   })),
    phones:        casePhones.filter(cp => cp.caseId === id).map(cp => ({
                     phone: phones.find(p => p.id === cp.phoneId),
                   })),
    locations:     caseLocations.filter(cl => cl.caseId === id).map(cl => ({
                     location: locations.find(l => l.id === cl.locationId),
                   })),
    organizations: caseOrganizations.filter(co => co.caseId === id).map(co => ({
                     organization: organizations.find(o => o.id === co.organizationId),
                   })),
  };
}

/** Returns all hydrated cases */
export function getAllCases() {
  return cases.map(c => getCaseById(c.id)!);
}

/** Filter cases by status */
export function getCasesByStatus(status: CaseStatus) {
  return cases.filter(c => c.status === status).map(c => getCaseById(c.id)!);
}

/** Filter cases by crime type */
export function getCasesByCrimeType(type: CrimeType) {
  return cases.filter(c => c.crimeType === type).map(c => getCaseById(c.id)!);
}

/** Get all relationships for a person */
export function getPersonNetwork(personId: string) {
  const outgoing = personRelationships.filter(r => r.sourcePersonId === personId);
  const incoming = personRelationships.filter(r => r.targetPersonId === personId);
  return {
    person: persons.find(p => p.id === personId),
    outgoing: outgoing.map(r => ({ ...r, target: persons.find(p => p.id === r.targetPersonId) })),
    incoming: incoming.map(r => ({ ...r, source: persons.find(p => p.id === r.sourcePersonId) })),
  };
}

/** Dashboard summary stats */
export const dashboardStats = {
  totalCases:   cases.length,
  openCases:    cases.filter(c => c.status === "OPEN").length,
  closedCases:  cases.filter(c => c.status === "CLOSED").length,
  coldCases:    cases.filter(c => c.status === "COLD").length,
  totalPersons: persons.length,
  highRiskPersons: persons.filter(p => (p.riskScore ?? 0) >= 7).length,
  evidenceCount: evidences.length,
  crimeTypeBreakdown: Object.entries(
    cases.reduce((acc, c) => {
      acc[c.crimeType] = (acc[c.crimeType] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({ type, count })),
};
