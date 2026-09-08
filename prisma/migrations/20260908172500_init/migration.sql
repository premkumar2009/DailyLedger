-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recordDate" TEXT NOT NULL,
    "openingBalance" DECIMAL NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionNumber" INTEGER NOT NULL,
    "transactionTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_dailyRecordId_fkey" FOREIGN KEY ("dailyRecordId") REFERENCES "DailyRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "DailyRecord_userId_recordDate_idx" ON "DailyRecord"("userId", "recordDate");
CREATE UNIQUE INDEX "DailyRecord_userId_recordDate_key" ON "DailyRecord"("userId", "recordDate");
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE UNIQUE INDEX "Transaction_dailyRecordId_transactionNumber_key" ON "Transaction"("dailyRecordId", "transactionNumber");
