-- Migration: Add enhanced interaction storage fields to UnifiedSession
-- Date: 2025-07-21
-- Purpose: Support 6-group enhanced interaction data storage with concurrent update safety

-- Add enhanced interaction storage fields
ALTER TABLE "unified_sessions" ADD COLUMN "enhancedInteractions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "unified_sessions" ADD COLUMN "lastInteractionTime" TIMESTAMP(3);
ALTER TABLE "unified_sessions" ADD COLUMN "interactionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "unified_sessions" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add index for version column (optimistic locking)
CREATE INDEX "unified_sessions_version_idx" ON "unified_sessions"("version");

-- Add index for lastInteractionTime (for querying recent activity)
CREATE INDEX "unified_sessions_lastInteractionTime_idx" ON "unified_sessions"("lastInteractionTime");

-- Add index for interactionCount (for quick filtering)
CREATE INDEX "unified_sessions_interactionCount_idx" ON "unified_sessions"("interactionCount");