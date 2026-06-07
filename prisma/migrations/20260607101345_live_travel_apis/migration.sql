-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "planIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "flights" TEXT NOT NULL,
    "hotel" TEXT NOT NULL,
    "transfer" TEXT,
    "flightCost" REAL NOT NULL,
    "hotelCost" REAL NOT NULL,
    "transferCost" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL,
    "pricesFetchedAt" TEXT,
    "sources" TEXT,
    "dataNotes" TEXT,
    CONSTRAINT "Plan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("flightCost", "flights", "hotel", "hotelCost", "id", "justification", "label", "planIndex", "pricesFetchedAt", "sources", "totalCost", "tripId") SELECT "flightCost", "flights", "hotel", "hotelCost", "id", "justification", "label", "planIndex", "pricesFetchedAt", "sources", "totalCost", "tripId" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
