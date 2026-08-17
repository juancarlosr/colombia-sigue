-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'COMPANY_ADMIN', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('IMPORTED', 'INVITED', 'ACTIVATED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('AUTHORIZED', 'DEDUCTED', 'TRANSFERRED', 'RECEIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "adminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'IMPORTED',
    "invitedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationAuthorization" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "authorizationTextVersion" TEXT NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "DonationAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferAmount" INTEGER,
    "transferDate" TIMESTAMP(3),
    "transferBankReference" TEXT,
    "transferProofUrl" TEXT,
    "foundationReceivedAt" TIMESTAMP(3),

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollContribution" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "amountAuthorized" INTEGER NOT NULL,
    "amountDeducted" INTEGER,
    "status" "ContributionStatus" NOT NULL DEFAULT 'AUTHORIZED',
    "receivedByFoundationAt" TIMESTAMP(3),

    CONSTRAINT "PayrollContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Foundation" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,

    CONSTRAINT "Foundation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_nit_key" ON "Company"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_externalId_key" ON "Employee"("companyId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_companyId_email_key" ON "Employee"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "DonationAuthorization_supersededById_key" ON "DonationAuthorization"("supersededById");

-- CreateIndex
CREATE INDEX "DonationAuthorization_employeeId_status_idx" ON "DonationAuthorization"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_companyId_year_month_key" ON "PayrollPeriod"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollContribution_payrollPeriodId_employeeId_key" ON "PayrollContribution"("payrollPeriodId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Foundation_nit_key" ON "Foundation"("nit");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAuthorization" ADD CONSTRAINT "DonationAuthorization_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAuthorization" ADD CONSTRAINT "DonationAuthorization_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "DonationAuthorization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollContribution" ADD CONSTRAINT "PayrollContribution_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "DonationAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
