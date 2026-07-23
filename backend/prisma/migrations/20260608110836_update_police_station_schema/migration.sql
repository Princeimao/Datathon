/*
  Warnings:

  - A unique constraint covering the columns `[latitude,longitude]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ModusOperandi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lat` to the `PoliceStation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `PoliceStation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `PoliceStation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CRIME_SCENE', 'RELATED_PLACE', 'REPORTING_STATION', 'UNKNOWN');

-- AlterEnum
ALTER TYPE "PersonRole" ADD VALUE 'UNKNOWN';

-- AlterTable
ALTER TABLE "Case" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "locationType" "LocationType";

-- AlterTable
ALTER TABLE "PoliceStation" ADD COLUMN     "lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "state" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_latitude_longitude_key" ON "Location"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ModusOperandi_name_key" ON "ModusOperandi"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");
