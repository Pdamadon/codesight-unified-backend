/*
  Warnings:

  - Made the column `modifiers` on table `interactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `context` on table `interactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `elementAnalysis` on table `interactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isVisible` on table `interactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "interactions_burst_id_idx";

-- DropIndex
DROP INDEX "interactions_screenshot_id_idx";

-- DropIndex
DROP INDEX "interactions_sequence_idx";

-- DropIndex
DROP INDEX "screenshots_burst_id_idx";

-- DropIndex
DROP INDEX "screenshots_trigger_idx";

-- AlterTable
ALTER TABLE "interactions" ALTER COLUMN "modifiers" SET NOT NULL,
ALTER COLUMN "context" SET NOT NULL,
ALTER COLUMN "elementAnalysis" SET NOT NULL,
ALTER COLUMN "isVisible" SET NOT NULL;

-- AlterTable
ALTER TABLE "screenshots" ALTER COLUMN "compressionRatio" SET DATA TYPE DOUBLE PRECISION;
