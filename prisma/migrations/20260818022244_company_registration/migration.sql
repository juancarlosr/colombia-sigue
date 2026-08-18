-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "agreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "agreementEvidence" JSONB,
ADD COLUMN     "agreementTextVersion" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactRole" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "employeeEstimate" INTEGER,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE';
