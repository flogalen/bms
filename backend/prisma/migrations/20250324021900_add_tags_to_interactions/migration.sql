-- AlterTable
ALTER TABLE "InteractionLog" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
