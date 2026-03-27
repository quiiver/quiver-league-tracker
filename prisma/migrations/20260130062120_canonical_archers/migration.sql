-- CreateTable
CREATE TABLE "CanonicalArcher" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "normalizedKey" TEXT NOT NULL,
    "primaryFirstName" TEXT,
    "primaryLastName" TEXT,
    "primaryTeam" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Archer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "canonicalArcherId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "conditionCode" TEXT,
    "team" TEXT,
    "alias" TEXT,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedRecord" DATETIME NOT NULL,
    CONSTRAINT "Archer_canonicalArcherId_fkey" FOREIGN KEY ("canonicalArcherId") REFERENCES "CanonicalArcher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Archer" ("alias", "conditionCode", "createdAt", "firstName", "id", "lastName", "meta", "team", "updatedRecord") SELECT "alias", "conditionCode", "createdAt", "firstName", "id", "lastName", "meta", "team", "updatedRecord" FROM "Archer";
DROP TABLE "Archer";
ALTER TABLE "new_Archer" RENAME TO "Archer";
CREATE INDEX "Archer_lastName_firstName_idx" ON "Archer"("lastName", "firstName");
CREATE INDEX "Archer_canonicalArcherId_idx" ON "Archer"("canonicalArcherId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalArcher_normalizedKey_key" ON "CanonicalArcher"("normalizedKey");
