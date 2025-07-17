-- Add missing fields for browser extension data compatibility

-- Add missing fields to interactions table for extension data
ALTER TABLE "interactions" ADD COLUMN "sequence" INTEGER;
ALTER TABLE "interactions" ADD COLUMN "modifiers" JSONB DEFAULT '{}';
ALTER TABLE "interactions" ADD COLUMN "offsetX" INTEGER;
ALTER TABLE "interactions" ADD COLUMN "offsetY" INTEGER;
ALTER TABLE "interactions" ADD COLUMN "screenshotId" TEXT;
ALTER TABLE "interactions" ADD COLUMN "context" JSONB DEFAULT '{}';
ALTER TABLE "interactions" ADD COLUMN "elementAnalysis" JSONB DEFAULT '{}';
ALTER TABLE "interactions" ADD COLUMN "isVisible" BOOLEAN DEFAULT false;
ALTER TABLE "interactions" ADD COLUMN "burstId" TEXT;
ALTER TABLE "interactions" ADD COLUMN "burstIndex" INTEGER;

-- Add missing fields to screenshots table for burst capture
ALTER TABLE "screenshots" ADD COLUMN "burstId" TEXT;
ALTER TABLE "screenshots" ADD COLUMN "burstIndex" INTEGER;
ALTER TABLE "screenshots" ADD COLUMN "burstTotal" INTEGER;
ALTER TABLE "screenshots" ADD COLUMN "trigger" TEXT;
ALTER TABLE "screenshots" ADD COLUMN "compressionRatio" REAL;

-- Add indexes for performance
CREATE INDEX "interactions_sequence_idx" ON "interactions"("sequence");
CREATE INDEX "interactions_screenshot_id_idx" ON "interactions"("screenshotId");
CREATE INDEX "interactions_burst_id_idx" ON "interactions"("burstId");
CREATE INDEX "screenshots_burst_id_idx" ON "screenshots"("burstId");
CREATE INDEX "screenshots_trigger_idx" ON "screenshots"("trigger");