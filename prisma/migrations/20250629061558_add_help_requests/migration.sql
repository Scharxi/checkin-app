-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "help_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "message" TEXT,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_requests_requesterId_idx" ON "help_requests"("requesterId");

-- CreateIndex
CREATE INDEX "help_requests_locationId_idx" ON "help_requests"("locationId");

-- CreateIndex
CREATE INDEX "help_requests_status_idx" ON "help_requests"("status");

-- CreateIndex
CREATE INDEX "help_requests_createdAt_idx" ON "help_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
