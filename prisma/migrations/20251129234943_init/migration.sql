-- CreateTable
CREATE TABLE "Tournament" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "updatedAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournamentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT,
    "displayOrder" INTEGER,
    "updatedAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL,
    CONSTRAINT "Event_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Archer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "conditionCode" TEXT,
    "team" TEXT,
    "alias" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER,
    "cut" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL,
    CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventParticipant" (
    "eventId" INTEGER NOT NULL,
    "archerId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL,

    PRIMARY KEY ("eventId", "archerId"),
    CONSTRAINT "EventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_archerId_fkey" FOREIGN KEY ("archerId") REFERENCES "Archer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventParticipant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventScore" (
    "eventId" INTEGER NOT NULL,
    "archerId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "rawScore" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "tens" INTEGER NOT NULL,
    "xCount" INTEGER NOT NULL,
    "nines" INTEGER NOT NULL,
    "arrows" INTEGER NOT NULL,
    "scoringRule" INTEGER NOT NULL DEFAULT 1,
    "tieBreak" TEXT,
    "ranking" INTEGER,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL,

    PRIMARY KEY ("eventId", "archerId"),
    CONSTRAINT "EventScore_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventScore_archerId_fkey" FOREIGN KEY ("archerId") REFERENCES "Archer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventScore_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Event_tournamentId_idx" ON "Event"("tournamentId");

-- CreateIndex
CREATE INDEX "Archer_lastName_firstName_idx" ON "Archer"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "EventCategory_eventId_idx" ON "EventCategory"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_eventId_name_key" ON "EventCategory"("eventId", "name");

-- CreateIndex
CREATE INDEX "EventParticipant_categoryId_idx" ON "EventParticipant"("categoryId");

-- CreateIndex
CREATE INDEX "EventScore_eventId_idx" ON "EventScore"("eventId");

-- CreateIndex
CREATE INDEX "EventScore_categoryId_idx" ON "EventScore"("categoryId");
