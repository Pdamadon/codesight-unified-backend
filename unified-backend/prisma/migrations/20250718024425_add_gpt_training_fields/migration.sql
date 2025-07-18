-- AlterTable
ALTER TABLE "interactions" ADD COLUMN     "action" JSONB,
ADD COLUMN     "contextData" JSONB,
ADD COLUMN     "elementDetails" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "overlays" JSONB,
ADD COLUMN     "pageContext" JSONB;
