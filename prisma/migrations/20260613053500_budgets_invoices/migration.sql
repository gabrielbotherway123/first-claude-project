-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "recipientCompany" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "travellerName" TEXT NOT NULL,
    "travellerEmail" TEXT NOT NULL,
    "travellerPhone" TEXT,
    "currency" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "lineItems" TEXT NOT NULL,
    CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinations" TEXT NOT NULL,
    "departureDate" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "totalBudget" REAL,
    "flightBudget" REAL,
    "hotelBudget" REAL,
    "currency" TEXT NOT NULL,
    "numberOfTravellers" INTEGER NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "preferredAirline" TEXT,
    "airlineRewards" TEXT,
    "airlineNote" TEXT,
    "hotelStarRating" INTEGER NOT NULL,
    "locationPreference" TEXT NOT NULL,
    "amenities" TEXT NOT NULL,
    "tripPurpose" TEXT NOT NULL,
    "specialRequirements" TEXT,
    "loyaltyNumbers" TEXT,
    CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("airlineNote", "airlineRewards", "amenities", "cabinClass", "createdAt", "currency", "departureDate", "destinations", "email", "fullName", "hotelStarRating", "id", "locationPreference", "loyaltyNumbers", "numberOfNights", "numberOfTravellers", "originCity", "phone", "preferredAirline", "returnDate", "specialRequirements", "totalBudget", "tripPurpose", "userId") SELECT "airlineNote", "airlineRewards", "amenities", "cabinClass", "createdAt", "currency", "departureDate", "destinations", "email", "fullName", "hotelStarRating", "id", "locationPreference", "loyaltyNumbers", "numberOfNights", "numberOfTravellers", "originCity", "phone", "preferredAirline", "returnDate", "specialRequirements", "totalBudget", "tripPurpose", "userId" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");
