-- AlterTable
ALTER TABLE "ModusOperandi" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "patterns" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "FaceRecord" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "caseId" TEXT,
    "evidenceId" TEXT,
    "luxandSubjectId" TEXT,
    "luxandFaceId" TEXT,
    "imageKey" TEXT,
    "imageUrl" TEXT,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceRecord_personId_idx" ON "FaceRecord"("personId");

-- CreateIndex
CREATE INDEX "FaceRecord_caseId_idx" ON "FaceRecord"("caseId");

-- CreateIndex
CREATE INDEX "FaceRecord_evidenceId_idx" ON "FaceRecord"("evidenceId");

-- CreateIndex
CREATE INDEX "FaceRecord_luxandSubjectId_idx" ON "FaceRecord"("luxandSubjectId");

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceRecord" ADD CONSTRAINT "FaceRecord_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
