-- CreateEnum
CREATE TYPE "CrimeType" AS ENUM ('HOMICIDE', 'ROBBERY', 'ASSAULT', 'THEFT', 'BURGLARY', 'KIDNAPPING', 'FRAUD', 'CYBERCRIME', 'DRUG_OFFENSE', 'RAPE', 'MURDER', 'OTHER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED', 'COLD');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'DIGITAL', 'PHYSICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('SUSPECT', 'VICTIM', 'WITNESS', 'INFORMANT');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('ASSOCIATED_WITH', 'FAMILY', 'GANG_MEMBER', 'CONTACTED', 'ACCOMPLICE', 'FINANCIAL_LINK');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "crimeType" "CrimeType" NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stationId" TEXT NOT NULL,
    "modusOperandiId" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    "riskScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aliases" TEXT[],

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "registrationNo" TEXT,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phone" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,

    CONSTRAINT "Phone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "district" TEXT,
    "station" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModusOperandi" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetType" TEXT,
    "weaponType" TEXT,
    "timePattern" TEXT,
    "vehiclePattern" TEXT,

    CONSTRAINT "ModusOperandi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Officer" (
    "id" TEXT NOT NULL,
    "badgeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL,

    CONSTRAINT "Officer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliceStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,

    CONSTRAINT "PoliceStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasePerson" (
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,

    CONSTRAINT "CasePerson_pkey" PRIMARY KEY ("caseId","personId")
);

-- CreateTable
CREATE TABLE "CaseVehicle" (
    "caseId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "CaseVehicle_pkey" PRIMARY KEY ("caseId","vehicleId")
);

-- CreateTable
CREATE TABLE "CasePhone" (
    "caseId" TEXT NOT NULL,
    "phoneId" TEXT NOT NULL,

    CONSTRAINT "CasePhone_pkey" PRIMARY KEY ("caseId","phoneId")
);

-- CreateTable
CREATE TABLE "CaseLocation" (
    "caseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "CaseLocation_pkey" PRIMARY KEY ("caseId","locationId")
);

-- CreateTable
CREATE TABLE "CaseOrganization" (
    "caseId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "CaseOrganization_pkey" PRIMARY KEY ("caseId","organizationId")
);

-- CreateTable
CREATE TABLE "PersonRelationship" (
    "id" TEXT NOT NULL,
    "sourcePersonId" TEXT NOT NULL,
    "targetPersonId" TEXT NOT NULL,
    "relationType" "RelationshipType" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "personId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("personId","organizationId")
);

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "vectorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PersonToPhone" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonToPhone_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PersonToVehicle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonToVehicle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LocationToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LocationToPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNo_key" ON "Vehicle"("registrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "Phone_number_key" ON "Phone"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");

-- CreateIndex
CREATE INDEX "_PersonToPhone_B_index" ON "_PersonToPhone"("B");

-- CreateIndex
CREATE INDEX "_PersonToVehicle_B_index" ON "_PersonToVehicle"("B");

-- CreateIndex
CREATE INDEX "_LocationToPerson_B_index" ON "_LocationToPerson"("B");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "PoliceStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_modusOperandiId_fkey" FOREIGN KEY ("modusOperandiId") REFERENCES "ModusOperandi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePerson" ADD CONSTRAINT "CasePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseVehicle" ADD CONSTRAINT "CaseVehicle_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseVehicle" ADD CONSTRAINT "CaseVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePhone" ADD CONSTRAINT "CasePhone_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasePhone" ADD CONSTRAINT "CasePhone_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "Phone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLocation" ADD CONSTRAINT "CaseLocation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseLocation" ADD CONSTRAINT "CaseLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseOrganization" ADD CONSTRAINT "CaseOrganization_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseOrganization" ADD CONSTRAINT "CaseOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelationship" ADD CONSTRAINT "PersonRelationship_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelationship" ADD CONSTRAINT "PersonRelationship_targetPersonId_fkey" FOREIGN KEY ("targetPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToPhone" ADD CONSTRAINT "_PersonToPhone_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToPhone" ADD CONSTRAINT "_PersonToPhone_B_fkey" FOREIGN KEY ("B") REFERENCES "Phone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToVehicle" ADD CONSTRAINT "_PersonToVehicle_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToVehicle" ADD CONSTRAINT "_PersonToVehicle_B_fkey" FOREIGN KEY ("B") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToPerson" ADD CONSTRAINT "_LocationToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LocationToPerson" ADD CONSTRAINT "_LocationToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
