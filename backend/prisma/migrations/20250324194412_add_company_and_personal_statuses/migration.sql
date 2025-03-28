-- AlterTable
ALTER TABLE "Person" ADD COLUMN "company" TEXT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 12 and above, it is possible to alter an enum in a single migration.
-- With older versions, it is necessary to create a new enum, update all references and drop the old enum.
ALTER TYPE "PersonStatus" ADD VALUE 'FRIEND';
ALTER TYPE "PersonStatus" ADD VALUE 'FAMILY';
ALTER TYPE "PersonStatus" ADD VALUE 'ACQUAINTANCE';
