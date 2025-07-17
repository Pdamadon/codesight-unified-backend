-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('HUMAN', 'AUTOMATED', 'HYBRID');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'PROCESSING', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'VALIDATING', 'ENHANCING', 'PSYCHOLOGY_ANALYSIS', 'TRAINING', 'ARCHIVING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CLICK', 'INPUT', 'SCROLL', 'NAVIGATION', 'HOVER', 'FOCUS', 'BLUR', 'FORM_SUBMIT', 'KEY_PRESS', 'DRAG', 'DROP', 'TOUCH');

-- CreateEnum
CREATE TYPE "ArchiveStatus" AS ENUM ('CREATING', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'GENERATING', 'UPLOADING', 'TRAINING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PersonalityType" AS ENUM ('ANALYTICAL', 'IMPULSIVE', 'CAUTIOUS', 'SOCIAL', 'PRACTICAL');

-- CreateEnum
CREATE TYPE "EmotionalState" AS ENUM ('EXCITED', 'FRUSTRATED', 'CONFIDENT', 'UNCERTAIN', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "DecisionMakingStyle" AS ENUM ('QUICK', 'DELIBERATE', 'COMPARISON_HEAVY', 'RESEARCH_DRIVEN');

-- CreateTable
CREATE TABLE "unified_sessions" (
    "id" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'HUMAN',
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "archiveUrl" TEXT,
    "trainingFileId" TEXT,
    "modelId" TEXT,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completeness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reliability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trainingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processingSteps" JSONB NOT NULL DEFAULT '[]',
    "processingErrors" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "workerId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "trainingMetrics" JSONB,
    "modelPerformance" JSONB,
    "dominantPersonality" "PersonalityType",
    "emotionalState" "EmotionalState",
    "decisionMakingStyle" "DecisionMakingStyle",
    "trustLevel" DOUBLE PRECISION,
    "urgencyLevel" DOUBLE PRECISION,
    "priceSensitivity" DOUBLE PRECISION,
    "socialInfluence" DOUBLE PRECISION,
    "psychologyConfidence" DOUBLE PRECISION,
    "pageType" TEXT,
    "userIntent" TEXT,
    "shoppingStage" TEXT,
    "behaviorType" TEXT,
    "purchaseReadiness" DOUBLE PRECISION,
    "navigationEfficiency" DOUBLE PRECISION,
    "contextualInsights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unified_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "sessionTime" INTEGER NOT NULL,
    "primarySelector" TEXT NOT NULL,
    "selectorAlternatives" JSONB NOT NULL DEFAULT '[]',
    "xpath" TEXT,
    "cssPath" TEXT,
    "elementTag" TEXT NOT NULL,
    "elementText" TEXT,
    "elementValue" TEXT,
    "elementAttributes" JSONB NOT NULL DEFAULT '{}',
    "clientX" INTEGER,
    "clientY" INTEGER,
    "pageX" INTEGER,
    "pageY" INTEGER,
    "boundingBox" JSONB NOT NULL,
    "viewport" JSONB NOT NULL,
    "isInViewport" BOOLEAN NOT NULL DEFAULT false,
    "percentVisible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL,
    "pageStructure" JSONB NOT NULL DEFAULT '{}',
    "parentElements" JSONB NOT NULL DEFAULT '[]',
    "siblingElements" JSONB NOT NULL DEFAULT '[]',
    "nearbyElements" JSONB NOT NULL DEFAULT '[]',
    "stateBefore" JSONB NOT NULL DEFAULT '{}',
    "stateAfter" JSONB,
    "stateChanges" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectorReliability" JSONB NOT NULL DEFAULT '{}',
    "userIntent" TEXT,
    "userReasoning" TEXT,
    "visualCues" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenshots" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "interactionId" TEXT,
    "timestamp" BIGINT NOT NULL,
    "eventType" TEXT NOT NULL,
    "s3Key" TEXT,
    "dataUrl" TEXT,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "format" TEXT NOT NULL DEFAULT 'png',
    "fileSize" INTEGER,
    "viewport" JSONB NOT NULL,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "visionAnalysis" JSONB,
    "userPsychology" JSONB,

    CONSTRAINT "screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_archives" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "format" TEXT NOT NULL DEFAULT 'zip',
    "s3Bucket" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "compressionRatio" DOUBLE PRECISION,
    "status" "ArchiveStatus" NOT NULL DEFAULT 'CREATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_data" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "openaiFileId" TEXT,
    "jsonlData" TEXT,
    "fileSize" INTEGER,
    "trainingJobId" TEXT,
    "modelId" TEXT,
    "hyperparameters" JSONB NOT NULL DEFAULT '{}',
    "trainingConfig" JSONB NOT NULL DEFAULT '{}',
    "trainingMetrics" JSONB,
    "validationResults" JSONB,
    "trainingQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedPerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "training_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_reports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "completenessScore" DOUBLE PRECISION NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "validationResults" JSONB NOT NULL DEFAULT '{}',
    "issues" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL DEFAULT '1.0',

    CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychology_profiles" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dominantPersonality" "PersonalityType" NOT NULL,
    "emotionalState" "EmotionalState" NOT NULL,
    "decisionMakingStyle" "DecisionMakingStyle" NOT NULL,
    "trustLevel" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "urgencyLevel" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "priceSensitivity" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "socialInfluence" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "insights" JSONB NOT NULL DEFAULT '[]',
    "behaviorPredictions" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psychology_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_enhancements" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "pageStructure" JSONB NOT NULL DEFAULT '{}',
    "userIntent" JSONB NOT NULL DEFAULT '{}',
    "navigationPattern" JSONB NOT NULL DEFAULT '{}',
    "shoppingBehavior" JSONB NOT NULL DEFAULT '{}',
    "contextualInsights" JSONB NOT NULL DEFAULT '[]',
    "trainingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_enhancements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_analysis_cache" (
    "id" TEXT NOT NULL,
    "screenshotId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "analysisResult" JSONB NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vision_analysis_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unified_sessions_type_status_idx" ON "unified_sessions"("type", "status");

-- CreateIndex
CREATE INDEX "unified_sessions_createdAt_idx" ON "unified_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "unified_sessions_qualityScore_idx" ON "unified_sessions"("qualityScore");

-- CreateIndex
CREATE INDEX "unified_sessions_workerId_idx" ON "unified_sessions"("workerId");

-- CreateIndex
CREATE INDEX "interactions_sessionId_timestamp_idx" ON "interactions"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "interactions_type_idx" ON "interactions"("type");

-- CreateIndex
CREATE INDEX "interactions_url_idx" ON "interactions"("url");

-- CreateIndex
CREATE INDEX "screenshots_sessionId_timestamp_idx" ON "screenshots"("sessionId", "timestamp");

-- CreateIndex
CREATE INDEX "screenshots_eventType_idx" ON "screenshots"("eventType");

-- CreateIndex
CREATE INDEX "session_archives_sessionId_idx" ON "session_archives"("sessionId");

-- CreateIndex
CREATE INDEX "session_archives_status_idx" ON "session_archives"("status");

-- CreateIndex
CREATE INDEX "training_data_sessionId_idx" ON "training_data"("sessionId");

-- CreateIndex
CREATE INDEX "training_data_status_idx" ON "training_data"("status");

-- CreateIndex
CREATE INDEX "training_data_modelId_idx" ON "training_data"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "system_config_category_idx" ON "system_config"("category");

-- CreateIndex
CREATE INDEX "quality_reports_sessionId_idx" ON "quality_reports"("sessionId");

-- CreateIndex
CREATE INDEX "quality_reports_overallScore_idx" ON "quality_reports"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "psychology_profiles_sessionId_key" ON "psychology_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "psychology_profiles_sessionId_idx" ON "psychology_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "psychology_profiles_dominantPersonality_idx" ON "psychology_profiles"("dominantPersonality");

-- CreateIndex
CREATE INDEX "psychology_profiles_emotionalState_idx" ON "psychology_profiles"("emotionalState");

-- CreateIndex
CREATE INDEX "psychology_profiles_confidence_idx" ON "psychology_profiles"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "context_enhancements_sessionId_key" ON "context_enhancements"("sessionId");

-- CreateIndex
CREATE INDEX "context_enhancements_sessionId_idx" ON "context_enhancements"("sessionId");

-- CreateIndex
CREATE INDEX "context_enhancements_trainingValue_idx" ON "context_enhancements"("trainingValue");

-- CreateIndex
CREATE INDEX "vision_analysis_cache_expiresAt_idx" ON "vision_analysis_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "vision_analysis_cache_screenshotId_analysisType_key" ON "vision_analysis_cache"("screenshotId", "analysisType");

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "unified_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "unified_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_archives" ADD CONSTRAINT "session_archives_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "unified_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
