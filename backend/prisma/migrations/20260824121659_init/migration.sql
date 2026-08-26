/*
  Warnings:

  - You are about to drop the column `crimeType` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `incidentDate` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `stationId` on the `Case` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Case` table. All the data in the column will be lost.
  - The primary key for the `CasePerson` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `district` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `station` on the `Location` table. All the data in the column will be lost.
  - You are about to alter the column `latitude` on the `Location` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,7)`.
  - You are about to alter the column `longitude` on the `Location` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(10,7)`.
  - The `role` column on the `OrganizationMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Officer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PoliceStation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_LocationToPerson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PersonToPhone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PersonToVehicle` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[crimeNo]` on the table `Case` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `caseCategoryId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `caseNo` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `caseStatusId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crimeMajorHeadId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crimeMinorHeadId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crimeNo` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `crimeRegisteredDate` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gravityOffenceId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `policeUnitId` to the `Case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Embedding` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `entityType` on the `Embedding` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Evidence` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `uploadedById` on the `Evidence` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `Person` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PersonRelationship` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ArrestSurrenderType" AS ENUM ('ARREST', 'SURRENDER');

-- CreateEnum
CREATE TYPE "CaseCategoryCode" AS ENUM ('FIR', 'UDR', 'PAR', 'ZERO_FIR', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargesheetType" AS ENUM ('CHARGESHEET', 'FALSE_CASE', 'UNDETECTED', 'FINAL_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('MEMBER', 'OWNER', 'DIRECTOR', 'EMPLOYEE', 'PARTNER', 'ASSOCIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CASE', 'PERSON', 'EVIDENCE', 'VEHICLE', 'PHONE', 'LOCATION', 'ORGANIZATION', 'MODUS_OPERANDI', 'COURT', 'POLICE_UNIT');

-- CreateEnum
CREATE TYPE "InvestigationEventType" AS ENUM ('ARREST', 'SURRENDER', 'SEARCH', 'SEIZURE', 'INTERROGATION', 'COURT_APPEARANCE', 'EVIDENCE_COLLECTION', 'STATEMENT', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LocationType" ADD VALUE 'ARREST_LOCATION';
ALTER TYPE "LocationType" ADD VALUE 'RESIDENCE';
ALTER TYPE "LocationType" ADD VALUE 'WORKPLACE';
ALTER TYPE "LocationType" ADD VALUE 'COURT';
ALTER TYPE "LocationType" ADD VALUE 'HOSPITAL';
ALTER TYPE "LocationType" ADD VALUE 'OTHER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PersonRole" ADD VALUE 'ACCUSED';
ALTER TYPE "PersonRole" ADD VALUE 'COMPLAINANT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RelationshipType" ADD VALUE 'BUSINESS_PARTNER';
ALTER TYPE "RelationshipType" ADD VALUE 'FRIEND';
ALTER TYPE "RelationshipType" ADD VALUE 'COLLEAGUE';
ALTER TYPE "RelationshipType" ADD VALUE 'RELATIVE';
ALTER TYPE "RelationshipType" ADD VALUE 'OTHER';

-- DropForeignKey
ALTER TABLE "Case" DROP CONSTRAINT "Case_stationId_fkey";

-- DropForeignKey
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "_LocationToPerson" DROP CONSTRAINT "_LocationToPerson_A_fkey";

-- DropForeignKey
ALTER TABLE "_LocationToPerson" DROP CONSTRAINT "_LocationToPerson_B_fkey";

-- DropForeignKey
ALTER TABLE "_PersonToPhone" DROP CONSTRAINT "_PersonToPhone_A_fkey";

-- DropForeignKey
ALTER TABLE "_PersonToPhone" DROP CONSTRAINT "_PersonToPhone_B_fkey";

-- DropForeignKey
ALTER TABLE "_PersonToVehicle" DROP CONSTRAINT "_PersonToVehicle_A_fkey";

-- DropForeignKey
ALTER TABLE "_PersonToVehicle" DROP CONSTRAINT "_PersonToVehicle_B_fkey";

-- DropIndex
DROP INDEX "Location_latitude_longitude_key";

-- AlterTable
ALTER TABLE "Case" DROP COLUMN "crimeType",
DROP COLUMN "incidentDate",
DROP COLUMN "stationId",
DROP COLUMN "status",
ADD COLUMN     "aiClassification" JSONB,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "caseCategoryId" INTEGER NOT NULL,
ADD COLUMN     "caseNo" TEXT NOT NULL,
ADD COLUMN     "caseStatusId" INTEGER NOT NULL,
ADD COLUMN     "courtId" INTEGER,
ADD COLUMN     "crimeMajorHeadId" INTEGER NOT NULL,
ADD COLUMN     "crimeMinorHeadId" INTEGER NOT NULL,
ADD COLUMN     "crimeNo" TEXT NOT NULL,
ADD COLUMN     "crimeRegisteredDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "gravityOffenceId" INTEGER NOT NULL,
ADD COLUMN     "incidentFromDate" TIMESTAMP(3),
ADD COLUMN     "incidentToDate" TIMESTAMP(3),
ADD COLUMN     "infoReceivedPSDate" TIMESTAMP(3),
ADD COLUMN     "policeUnitId" INTEGER NOT NULL,
ADD COLUMN     "priorityScore" DOUBLE PRECISION,
ADD COLUMN     "registeringOfficerId" INTEGER,
ADD COLUMN     "riskScore" DOUBLE PRECISION,
ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CaseLocation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "locationType" "LocationType",
ADD COLUMN     "occurredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CaseOrganization" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "context" TEXT;

-- AlterTable
ALTER TABLE "CasePerson" DROP CONSTRAINT "CasePerson_pkey",
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD CONSTRAINT "CasePerson_pkey" PRIMARY KEY ("caseId", "personId", "role");

-- AlterTable
ALTER TABLE "CasePhone" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "context" TEXT;

-- AlterTable
ALTER TABLE "CaseVehicle" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "context" TEXT;

-- AlterTable
ALTER TABLE "Embedding" ADD COLUMN     "caseId" TEXT,
ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "evidenceId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "modelName" TEXT,
ADD COLUMN     "modusOperandiId" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "phoneId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "vehicleId" TEXT,
DROP COLUMN "entityType",
ADD COLUMN     "entityType" "EntityType" NOT NULL,
ALTER COLUMN "vectorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "aiClassification" JSONB,
ADD COLUMN     "aiConfidence" DOUBLE PRECISION,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "district",
DROP COLUMN "station",
ADD COLUMN     "accuracyMeters" DOUBLE PRECISION,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "districtId" INTEGER,
ADD COLUMN     "districtName" TEXT,
ADD COLUMN     "policeUnitId" INTEGER,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "stateId" INTEGER,
ADD COLUMN     "stationName" TEXT,
ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(10,7),
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(10,7);

-- AlterTable
ALTER TABLE "ModusOperandi" ADD COLUMN     "communicationMethod" TEXT,
ADD COLUMN     "entryMethod" TEXT,
ADD COLUMN     "escapeMethod" TEXT,
ADD COLUMN     "riskLevel" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "organizationType" TEXT;

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "customRole" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "aiProfile" JSONB,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "influenceScore" DOUBLE PRECISION,
ADD COLUMN     "threatScore" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PersonRelationship" ADD COLUMN     "evidenceId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Phone" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "chassisNumber" TEXT,
ADD COLUMN     "engineNumber" TEXT,
ADD COLUMN     "vehicleType" TEXT;

-- DropTable
DROP TABLE "Officer";

-- DropTable
DROP TABLE "PoliceStation";

-- DropTable
DROP TABLE "_LocationToPerson";

-- DropTable
DROP TABLE "_PersonToPhone";

-- DropTable
DROP TABLE "_PersonToVehicle";

-- DropEnum
DROP TYPE "CaseStatus";

-- DropEnum
DROP TYPE "CrimeType";

-- CreateTable
CREATE TABLE "CaseCategory" (
    "id" SERIAL NOT NULL,
    "lookupValue" TEXT NOT NULL,
    "code" "CaseCategoryCode" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CaseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusMaster" (
    "id" SERIAL NOT NULL,
    "caseStatusName" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CaseStatusMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GravityOffence" (
    "id" SERIAL NOT NULL,
    "lookupValue" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GravityOffence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrimeHead" (
    "id" SERIAL NOT NULL,
    "crimeGroupName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CrimeHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrimeSubHead" (
    "id" SERIAL NOT NULL,
    "crimeHeadId" INTEGER NOT NULL,
    "crimeHeadName" TEXT NOT NULL,
    "seqId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CrimeSubHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Act" (
    "id" SERIAL NOT NULL,
    "actCode" TEXT NOT NULL,
    "actDescription" TEXT NOT NULL,
    "shortName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Act_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "actCode" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "sectionDescription" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("actCode","sectionCode")
);

-- CreateTable
CREATE TABLE "CaseActSection" (
    "caseId" TEXT NOT NULL,
    "actCode" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "actOrder" INTEGER,
    "sectionOrder" INTEGER,

    CONSTRAINT "CaseActSection_pkey" PRIMARY KEY ("caseId","actCode","sectionCode")
);

-- CreateTable
CREATE TABLE "CrimeHeadActSection" (
    "crimeHeadId" INTEGER NOT NULL,
    "actCode" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,

    CONSTRAINT "CrimeHeadActSection_pkey" PRIMARY KEY ("crimeHeadId","actCode","sectionCode")
);

-- CreateTable
CREATE TABLE "Complainant" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageYear" INTEGER,
    "occupationId" INTEGER,
    "religionId" INTEGER,
    "casteId" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "personId" TEXT,

    CONSTRAINT "Complainant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneOwner" (
    "personId" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,
    "ownershipType" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "PhoneOwner_pkey" PRIMARY KEY ("personId","phoneId")
);

-- CreateTable
CREATE TABLE "VehicleOwner" (
    "personId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "ownershipType" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "VehicleOwner_pkey" PRIMARY KEY ("personId","vehicleId")
);

-- CreateTable
CREATE TABLE "State" (
    "id" SERIAL NOT NULL,
    "stateName" TEXT NOT NULL,
    "nationalityId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "districtName" TEXT NOT NULL,
    "stateId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliceUnit" (
    "id" SERIAL NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitTypeId" INTEGER NOT NULL,
    "parentUnitId" INTEGER,
    "stateId" INTEGER NOT NULL,
    "districtId" INTEGER,
    "nationalityId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PoliceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" SERIAL NOT NULL,
    "unitTypeName" TEXT NOT NULL,
    "cityDistState" TEXT,
    "hierarchy" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rank" (
    "id" SERIAL NOT NULL,
    "rankName" TEXT NOT NULL,
    "hierarchy" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" SERIAL NOT NULL,
    "designationName" TEXT NOT NULL,
    "sortOrder" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "kgid" TEXT,
    "badgeNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "employeeDOB" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "bloodGroupId" INTEGER,
    "physicallyChallenged" BOOLEAN NOT NULL DEFAULT false,
    "appointmentDate" TIMESTAMP(3),
    "districtId" INTEGER,
    "unitId" INTEGER,
    "rankId" INTEGER,
    "designationId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" SERIAL NOT NULL,
    "courtName" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    "stateId" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrestSurrender" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "ArrestSurrenderType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "stateId" INTEGER,
    "districtId" INTEGER,
    "policeUnitId" INTEGER,
    "ioId" INTEGER,
    "courtId" INTEGER,
    "isAccused" BOOLEAN NOT NULL DEFAULT true,
    "isComplainantAccused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArrestSurrender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrestSurrenderAccused" (
    "id" TEXT NOT NULL,
    "arrestSurrenderId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "accusedSortId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArrestSurrenderAccused_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonLocation" (
    "personId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "relationship" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "PersonLocation_pkey" PRIMARY KEY ("personId","locationId")
);

-- CreateTable
CREATE TABLE "InvestigationEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" "InvestigationEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "officerId" INTEGER,
    "personId" TEXT,
    "evidenceId" TEXT,
    "arrestSurrenderId" TEXT,
    "locationId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chargesheet" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "csDate" TIMESTAMP(3) NOT NULL,
    "csType" "ChargesheetType" NOT NULL,
    "policePersonId" INTEGER,

    CONSTRAINT "Chargesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSimilarity" (
    "id" TEXT NOT NULL,
    "sourceCaseId" TEXT NOT NULL,
    "targetCaseId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "similarityType" TEXT,
    "matchedFeatures" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasteMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CasteMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReligionMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ReligionMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupationMaster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "OccupationMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseCategory_lookupValue_key" ON "CaseCategory"("lookupValue");

-- CreateIndex
CREATE UNIQUE INDEX "CaseCategory_code_key" ON "CaseCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStatusMaster_caseStatusName_key" ON "CaseStatusMaster"("caseStatusName");

-- CreateIndex
CREATE UNIQUE INDEX "GravityOffence_lookupValue_key" ON "GravityOffence"("lookupValue");

-- CreateIndex
CREATE UNIQUE INDEX "CrimeHead_crimeGroupName_key" ON "CrimeHead"("crimeGroupName");

-- CreateIndex
CREATE INDEX "CrimeSubHead_crimeHeadId_idx" ON "CrimeSubHead"("crimeHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "Act_actCode_key" ON "Act"("actCode");

-- CreateIndex
CREATE INDEX "Section_actCode_idx" ON "Section"("actCode");

-- CreateIndex
CREATE INDEX "CaseActSection_actCode_sectionCode_idx" ON "CaseActSection"("actCode", "sectionCode");

-- CreateIndex
CREATE INDEX "Complainant_caseId_idx" ON "Complainant"("caseId");

-- CreateIndex
CREATE INDEX "Complainant_personId_idx" ON "Complainant"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "State_stateName_key" ON "State"("stateName");

-- CreateIndex
CREATE INDEX "District_stateId_idx" ON "District"("stateId");

-- CreateIndex
CREATE UNIQUE INDEX "District_stateId_districtName_key" ON "District"("stateId", "districtName");

-- CreateIndex
CREATE INDEX "PoliceUnit_stateId_idx" ON "PoliceUnit"("stateId");

-- CreateIndex
CREATE INDEX "PoliceUnit_districtId_idx" ON "PoliceUnit"("districtId");

-- CreateIndex
CREATE INDEX "PoliceUnit_parentUnitId_idx" ON "PoliceUnit"("parentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_unitTypeName_key" ON "UnitType"("unitTypeName");

-- CreateIndex
CREATE UNIQUE INDEX "Rank_rankName_key" ON "Rank"("rankName");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_designationName_key" ON "Designation"("designationName");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_kgid_key" ON "Employee"("kgid");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_badgeNumber_key" ON "Employee"("badgeNumber");

-- CreateIndex
CREATE INDEX "Employee_districtId_idx" ON "Employee"("districtId");

-- CreateIndex
CREATE INDEX "Employee_unitId_idx" ON "Employee"("unitId");

-- CreateIndex
CREATE INDEX "Employee_rankId_idx" ON "Employee"("rankId");

-- CreateIndex
CREATE INDEX "Employee_designationId_idx" ON "Employee"("designationId");

-- CreateIndex
CREATE INDEX "Court_districtId_idx" ON "Court"("districtId");

-- CreateIndex
CREATE INDEX "Court_stateId_idx" ON "Court"("stateId");

-- CreateIndex
CREATE INDEX "ArrestSurrender_caseId_idx" ON "ArrestSurrender"("caseId");

-- CreateIndex
CREATE INDEX "ArrestSurrender_eventDate_idx" ON "ArrestSurrender"("eventDate");

-- CreateIndex
CREATE INDEX "ArrestSurrenderAccused_personId_idx" ON "ArrestSurrenderAccused"("personId");

-- CreateIndex
CREATE INDEX "ArrestSurrenderAccused_arrestSurrenderId_idx" ON "ArrestSurrenderAccused"("arrestSurrenderId");

-- CreateIndex
CREATE UNIQUE INDEX "ArrestSurrenderAccused_arrestSurrenderId_personId_key" ON "ArrestSurrenderAccused"("arrestSurrenderId", "personId");

-- CreateIndex
CREATE INDEX "InvestigationEvent_caseId_idx" ON "InvestigationEvent"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationEvent_personId_idx" ON "InvestigationEvent"("personId");

-- CreateIndex
CREATE INDEX "InvestigationEvent_eventDate_idx" ON "InvestigationEvent"("eventDate");

-- CreateIndex
CREATE INDEX "Chargesheet_caseId_idx" ON "Chargesheet"("caseId");

-- CreateIndex
CREATE INDEX "Chargesheet_csDate_idx" ON "Chargesheet"("csDate");

-- CreateIndex
CREATE INDEX "CaseSimilarity_similarityScore_idx" ON "CaseSimilarity"("similarityScore");

-- CreateIndex
CREATE UNIQUE INDEX "CaseSimilarity_sourceCaseId_targetCaseId_key" ON "CaseSimilarity"("sourceCaseId", "targetCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "CasteMaster_name_key" ON "CasteMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReligionMaster_name_key" ON "ReligionMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OccupationMaster_name_key" ON "OccupationMaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Case_crimeNo_key" ON "Case"("crimeNo");

-- CreateIndex
CREATE INDEX "Case_crimeRegisteredDate_idx" ON "Case"("crimeRegisteredDate");

-- CreateIndex
CREATE INDEX "Case_caseStatusId_idx" ON "Case"("caseStatusId");

-- CreateIndex
CREATE INDEX "Case_caseCategoryId_idx" ON "Case"("caseCategoryId");

-- CreateIndex
CREATE INDEX "Case_crimeMajorHeadId_idx" ON "Case"("crimeMajorHeadId");

-- CreateIndex
CREATE INDEX "Case_crimeMinorHeadId_idx" ON "Case"("crimeMinorHeadId");

-- CreateIndex
CREATE INDEX "Case_policeUnitId_idx" ON "Case"("policeUnitId");

-- CreateIndex
CREATE INDEX "Case_courtId_idx" ON "Case"("courtId");

-- CreateIndex
CREATE INDEX "CaseLocation_locationId_idx" ON "CaseLocation"("locationId");

-- CreateIndex
CREATE INDEX "CasePerson_personId_idx" ON "CasePerson"("personId");

-- CreateIndex
CREATE INDEX "CasePerson_role_idx" ON "CasePerson"("role");

-- CreateIndex
CREATE INDEX "Embedding_entityType_entityId_idx" ON "Embedding"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Embedding_caseId_idx" ON "Embedding"("caseId");

-- CreateIndex
CREATE INDEX "Embedding_personId_idx" ON "Embedding"("personId");

-- CreateIndex
CREATE INDEX "Embedding_evidenceId_idx" ON "Embedding"("evidenceId");

-- CreateIndex
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");

-- CreateIndex
CREATE INDEX "Evidence_type_idx" ON "Evidence"("type");

-- CreateIndex
CREATE INDEX "Evidence_fileHash_idx" ON "Evidence"("fileHash");

-- CreateIndex
CREATE INDEX "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Location_districtId_idx" ON "Location"("districtId");

-- CreateIndex
CREATE INDEX "Location_policeUnitId_idx" ON "Location"("policeUnitId");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE INDEX "PersonRelationship_sourcePersonId_idx" ON "PersonRelationship"("sourcePersonId");

-- CreateIndex
CREATE INDEX "PersonRelationship_targetPersonId_idx" ON "PersonRelationship"("targetPersonId");

-- CreateIndex
CREATE INDEX "PersonRelationship_relationType_idx" ON "PersonRelationship"("relationType");

-- CreateIndex
CREATE INDEX "Phone_number_idx" ON "Phone"("number");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_caseCategoryId_fkey" FOREIGN KEY ("caseCategoryId") REFERENCES "CaseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_gravityOffenceId_fkey" FOREIGN KEY ("gravityOffenceId") REFERENCES "GravityOffence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_crimeMajorHeadId_fkey" FOREIGN KEY ("crimeMajorHeadId") REFERENCES "CrimeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_crimeMinorHeadId_fkey" FOREIGN KEY ("crimeMinorHeadId") REFERENCES "CrimeSubHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_caseStatusId_fkey" FOREIGN KEY ("caseStatusId") REFERENCES "CaseStatusMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_registeringOfficerId_fkey" FOREIGN KEY ("registeringOfficerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_policeUnitId_fkey" FOREIGN KEY ("policeUnitId") REFERENCES "PoliceUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrimeSubHead" ADD CONSTRAINT "CrimeSubHead_crimeHeadId_fkey" FOREIGN KEY ("crimeHeadId") REFERENCES "CrimeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_actCode_fkey" FOREIGN KEY ("actCode") REFERENCES "Act"("actCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActSection" ADD CONSTRAINT "CaseActSection_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActSection" ADD CONSTRAINT "CaseActSection_actCode_fkey" FOREIGN KEY ("actCode") REFERENCES "Act"("actCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActSection" ADD CONSTRAINT "CaseActSection_actCode_sectionCode_fkey" FOREIGN KEY ("actCode", "sectionCode") REFERENCES "Section"("actCode", "sectionCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrimeHeadActSection" ADD CONSTRAINT "CrimeHeadActSection_crimeHeadId_fkey" FOREIGN KEY ("crimeHeadId") REFERENCES "CrimeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrimeHeadActSection" ADD CONSTRAINT "CrimeHeadActSection_actCode_fkey" FOREIGN KEY ("actCode") REFERENCES "Act"("actCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrimeHeadActSection" ADD CONSTRAINT "CrimeHeadActSection_actCode_sectionCode_fkey" FOREIGN KEY ("actCode", "sectionCode") REFERENCES "Section"("actCode", "sectionCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complainant" ADD CONSTRAINT "Complainant_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complainant" ADD CONSTRAINT "Complainant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complainant" ADD CONSTRAINT "Complainant_occupationId_fkey" FOREIGN KEY ("occupationId") REFERENCES "OccupationMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complainant" ADD CONSTRAINT "Complainant_religionId_fkey" FOREIGN KEY ("religionId") REFERENCES "ReligionMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complainant" ADD CONSTRAINT "Complainant_casteId_fkey" FOREIGN KEY ("casteId") REFERENCES "CasteMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneOwner" ADD CONSTRAINT "PhoneOwner_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneOwner" ADD CONSTRAINT "PhoneOwner_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwner" ADD CONSTRAINT "VehicleOwner_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOwner" ADD CONSTRAINT "VehicleOwner_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceUnit" ADD CONSTRAINT "PoliceUnit_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceUnit" ADD CONSTRAINT "PoliceUnit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "PoliceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceUnit" ADD CONSTRAINT "PoliceUnit_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoliceUnit" ADD CONSTRAINT "PoliceUnit_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "PoliceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_policeUnitId_fkey" FOREIGN KEY ("policeUnitId") REFERENCES "PoliceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_ioId_fkey" FOREIGN KEY ("ioId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrender" ADD CONSTRAINT "ArrestSurrender_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrenderAccused" ADD CONSTRAINT "ArrestSurrenderAccused_arrestSurrenderId_fkey" FOREIGN KEY ("arrestSurrenderId") REFERENCES "ArrestSurrender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrestSurrenderAccused" ADD CONSTRAINT "ArrestSurrenderAccused_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_policeUnitId_fkey" FOREIGN KEY ("policeUnitId") REFERENCES "PoliceUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonLocation" ADD CONSTRAINT "PersonLocation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonLocation" ADD CONSTRAINT "PersonLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelationship" ADD CONSTRAINT "PersonRelationship_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_arrestSurrenderId_fkey" FOREIGN KEY ("arrestSurrenderId") REFERENCES "ArrestSurrender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargesheet" ADD CONSTRAINT "Chargesheet_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chargesheet" ADD CONSTRAINT "Chargesheet_policePersonId_fkey" FOREIGN KEY ("policePersonId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_modusOperandiId_fkey" FOREIGN KEY ("modusOperandiId") REFERENCES "ModusOperandi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSimilarity" ADD CONSTRAINT "CaseSimilarity_sourceCaseId_fkey" FOREIGN KEY ("sourceCaseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSimilarity" ADD CONSTRAINT "CaseSimilarity_targetCaseId_fkey" FOREIGN KEY ("targetCaseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
