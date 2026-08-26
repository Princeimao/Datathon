-- CreateIndex
CREATE INDEX "InvestigationEvent_locationId_idx" ON "InvestigationEvent"("locationId");

-- CreateIndex
CREATE INDEX "Location_stateId_idx" ON "Location"("stateId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationEvent" ADD CONSTRAINT "InvestigationEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
