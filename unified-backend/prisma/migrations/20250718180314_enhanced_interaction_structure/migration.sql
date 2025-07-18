/*
  Warnings:

  - You are about to drop the column `action` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `boundingBox` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `burstId` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `burstIndex` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `clientX` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `clientY` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `contextData` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `cssPath` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementAnalysis` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementAttributes` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementDetails` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementTag` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementText` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `elementValue` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `isInViewport` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `isVisible` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `modifiers` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `nearbyElements` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `offsetX` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `offsetY` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `overlays` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `pageContext` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `pageStructure` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `pageTitle` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `pageX` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `pageY` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `parentElements` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `percentVisible` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `primarySelector` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `screenshotId` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `selectorAlternatives` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `selectorReliability` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `siblingElements` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `stateAfter` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `stateBefore` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `stateChanges` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `userIntent` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `userReasoning` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `viewport` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `visualCues` on the `interactions` table. All the data in the column will be lost.
  - You are about to drop the column `xpath` on the `interactions` table. All the data in the column will be lost.
  - Added the required column `element` to the `interactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `interaction` to the `interactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `selectors` to the `interactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `interactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visual` to the `interactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "interactions_url_idx";

-- AlterTable
ALTER TABLE "interactions" DROP COLUMN "action",
DROP COLUMN "boundingBox",
DROP COLUMN "burstId",
DROP COLUMN "burstIndex",
DROP COLUMN "clientX",
DROP COLUMN "clientY",
DROP COLUMN "contextData",
DROP COLUMN "cssPath",
DROP COLUMN "elementAnalysis",
DROP COLUMN "elementAttributes",
DROP COLUMN "elementDetails",
DROP COLUMN "elementTag",
DROP COLUMN "elementText",
DROP COLUMN "elementValue",
DROP COLUMN "isInViewport",
DROP COLUMN "isVisible",
DROP COLUMN "metadata",
DROP COLUMN "modifiers",
DROP COLUMN "nearbyElements",
DROP COLUMN "offsetX",
DROP COLUMN "offsetY",
DROP COLUMN "overlays",
DROP COLUMN "pageContext",
DROP COLUMN "pageStructure",
DROP COLUMN "pageTitle",
DROP COLUMN "pageX",
DROP COLUMN "pageY",
DROP COLUMN "parentElements",
DROP COLUMN "percentVisible",
DROP COLUMN "primarySelector",
DROP COLUMN "screenshotId",
DROP COLUMN "selectorAlternatives",
DROP COLUMN "selectorReliability",
DROP COLUMN "siblingElements",
DROP COLUMN "stateAfter",
DROP COLUMN "stateBefore",
DROP COLUMN "stateChanges",
DROP COLUMN "url",
DROP COLUMN "userIntent",
DROP COLUMN "userReasoning",
DROP COLUMN "viewport",
DROP COLUMN "visualCues",
DROP COLUMN "xpath",
ADD COLUMN     "element" JSONB NOT NULL,
ADD COLUMN     "interaction" JSONB NOT NULL,
ADD COLUMN     "legacyData" JSONB,
ADD COLUMN     "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "selectors" JSONB NOT NULL,
ADD COLUMN     "state" JSONB NOT NULL,
ADD COLUMN     "visual" JSONB NOT NULL,
ALTER COLUMN "context" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "interactions_qualityScore_idx" ON "interactions"("qualityScore");
