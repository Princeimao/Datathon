export type Confidence = number;

export interface CaseExtraction {
    caseNumber: string | null;
    title: string | null;
    crimeType: CrimeTypes;
    incidentDate: string | null;
    location: string | null;
    description: string | null;
    caseStatus: CaseStatus;
}

export type CrimeTypes = "HOMICIDE" | "ROBBERY" | "ASSAULT" | "THEFT" | "BURGLARY" | "KIDNAPPING" | "FRAUD" | "CYBERCRIME" | "DRUG_OFFENSE" | "RAPE" | "MURDER" | "OTHER";
export type CaseStatus = "OPEN" | "CLOSED" | "COLD";

export type PersonRole = "SUSPECT" | "VICTIM" | "WITNESS" | "UNKNOWN";

export interface PersonExtraction {
    name: string | null;
    role: PersonRole;
    age: number | null;
    gender: string | null;
    aliases: string[];
    confidence: Confidence;
}

export interface PhoneExtraction {
    number: string;
    confidence: Confidence;
}

export interface VehicleExtraction {
    registrationNumber: string | null;
    type: string | null;
    color: string | null;
    confidence: Confidence;
}

export interface LocationExtraction {
    name: string | null;
    address: string | null;
    district: string | null;
    station: string | null;
    locationType: LocationType;
    confidence: Confidence;
}

export type LocationType = "CRIME_SCENE" | "RELATED_PLACE" | "REPORTING_STATION" | "UNKNOWN";

export interface EvidenceExtraction {
    type: string | null;
    description: string | null;
    confidence: Confidence;
}

export interface OrganizationExtraction {
    name: string | null;
    confidence: Confidence;
}

export interface MOExtraction {
    name: string | null;
    description: string | null;
    weaponType: string | null;
    timePattern: string | null;
    vehiclePattern: string | null;
    confidence: Confidence;
}

export type RelationshipType = 
    | "FAMILY"
    | "ACCOMPLICE"
    | "GANG_MEMBER"
    | "ASSOCIATED_WITH"
    | "CONTACTED"
    | "FINANCIAL_LINK"
    | "OWNER"
    | "RESIDENT"
    | "MEMBER_OF";

export interface EntityRelationship {
    source: string; // Name, phone number, vehicle registration number, location name, or organization name
    target: string;
    type: RelationshipType;
    confidence: number;
}

export interface CrimeExtractionResult {
    case: CaseExtraction;
    persons: PersonExtraction[];
    phones: PhoneExtraction[];
    vehicles: VehicleExtraction[];
    locations: LocationExtraction[];
    evidence: EvidenceExtraction[];
    organizations: OrganizationExtraction[];
    modusOperandi: MOExtraction | null;
    relationships: EntityRelationship[];
}