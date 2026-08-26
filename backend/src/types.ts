export type Confidence = number;

// ============================================================
// CASE
// ============================================================

export interface CaseExtraction {
  caseNumber: string | null;
  crimeNo?: string | null;
  caseNo?: string | null;

  title: string | null;
  crimeType: CrimeTypes;

  incidentDate: string | null;

  incidentFromDate?: string | null;
  incidentToDate?: string | null;
  infoReceivedPSDate?: string | null;

  location: string | null;
  description: string | null;

  caseStatus: CaseStatus;
}

export type CrimeTypes =
  | "HOMICIDE"
  | "ROBBERY"
  | "ASSAULT"
  | "THEFT"
  | "BURGLARY"
  | "KIDNAPPING"
  | "FRAUD"
  | "CYBERCRIME"
  | "DRUG_OFFENSE"
  | "RAPE"
  | "MURDER"
  | "OTHER";

export type CaseStatus = "OPEN" | "CLOSED" | "COLD";

// ============================================================
// PERSON
// ============================================================

export type PersonRole =
  | "SUSPECT"
  | "ACCUSED"
  | "VICTIM"
  | "COMPLAINANT"
  | "WITNESS"
  | "INFORMANT"
  | "UNKNOWN";

export interface PersonExtraction {
  name: string | null;

  role: PersonRole;

  age: number | null;

  dateOfBirth?: string | null;

  gender: string | null;

  aliases: string[];

  confidence: Confidence;

  notes?: string | null;

  isPrimary?: boolean;
}

// ============================================================
// PHONE
// ============================================================

export interface PhoneExtraction {
  number: string;

  countryCode?: string | null;

  confidence: Confidence;

  context?: string | null;
}

// ============================================================
// VEHICLE
// ============================================================

export interface VehicleExtraction {
  registrationNumber: string | null;

  make?: string | null;

  model?: string | null;

  type: string | null;

  color: string | null;

  vehicleType?: string | null;

  chassisNumber?: string | null;

  engineNumber?: string | null;

  confidence: Confidence;

  context?: string | null;
}

// ============================================================
// LOCATION
// ============================================================

export interface LocationExtraction {
  name: string | null;

  address: string | null;

  district: string | null;

  station: string | null;

  state?: string | null;

  latitude?: number | null;

  longitude?: number | null;

  locationType: LocationType;

  description?: string | null;

  occurredAt?: string | null;

  confidence: Confidence;
}

export type LocationType =
  | "CRIME_SCENE"
  | "RELATED_PLACE"
  | "REPORTING_STATION"
  | "ARREST_LOCATION"
  | "RESIDENCE"
  | "WORKPLACE"
  | "COURT"
  | "HOSPITAL"
  | "OTHER"
  | "UNKNOWN";

// ============================================================
// EVIDENCE
// ============================================================

export interface EvidenceExtraction {
  type: string | null;

  title?: string | null;

  description: string | null;

  confidence: Confidence;

  fileUrl?: string | null;

  mimeType?: string | null;

  fileName?: string | null;

  fileSize?: number | null;

  fileHash?: string | null;

  extractedData?: Record<string, unknown>;

  aiSummary?: string | null;

  aiClassification?: Record<string, unknown> | null;

  aiConfidence?: number | null;
}

// ============================================================
// ORGANIZATION
// ============================================================

export interface OrganizationExtraction {
  name: string | null;

  description?: string | null;

  organizationType?: string | null;

  confidence: Confidence;

  context?: string | null;
}

// ============================================================
// MODUS OPERANDI
// ============================================================

export interface MOExtraction {
  name: string | null;

  description: string | null;

  targetType?: string | null;

  weaponType: string | null;

  timePattern: string | null;

  vehiclePattern: string | null;

  entryMethod?: string | null;

  escapeMethod?: string | null;

  communicationMethod?: string | null;

  riskLevel?: number | null;

  confidence: Confidence;

  /**
   * MO intelligence signals used by the intelligence filters.
   */
  patterns?: string[];
}

// ============================================================
// EXTRACTED RELATIONSHIPS
// ============================================================

/**
 * Relationship types produced by the AI/extraction layer.
 *
 * OWNER:
 *   Person -> Phone
 *   Person -> Vehicle
 *
 * RESIDENT:
 *   Person -> Location
 *
 * MEMBER_OF:
 *   Person -> Organization
 *
 * All other values are Person -> Person relationships.
 */
export type RelationshipType =
  | "FAMILY"
  | "ACCOMPLICE"
  | "GANG_MEMBER"
  | "ASSOCIATED_WITH"
  | "CONTACTED"
  | "FINANCIAL_LINK"
  | "BUSINESS_PARTNER"
  | "FRIEND"
  | "COLLEAGUE"
  | "RELATIVE"
  | "OTHER"
  | "OWNER"
  | "RESIDENT"
  | "MEMBER_OF";

export interface EntityRelationship {
  source: string;

  target: string;

  type: RelationshipType;

  confidence: number;

  notes?: string | null;

  sourceText?: string | null;
}

// ============================================================
// COMPLETE EXTRACTION RESULT
// ============================================================

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
