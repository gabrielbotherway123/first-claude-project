-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinations" TEXT NOT NULL,
    "departureDate" TEXT NOT NULL,
    "returnDate" TEXT NOT NULL,
    "numberOfNights" INTEGER NOT NULL,
    "totalBudget" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "numberOfTravellers" INTEGER NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "hotelStarRating" INTEGER NOT NULL,
    "locationPreference" TEXT NOT NULL,
    "amenities" TEXT NOT NULL,
    "tripPurpose" TEXT NOT NULL,
    "specialRequirements" TEXT,
    "loyaltyNumbers" TEXT,
    "pin" TEXT
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "planIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "flights" TEXT NOT NULL,
    "hotel" TEXT NOT NULL,
    "flightCost" REAL NOT NULL,
    "hotelCost" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    CONSTRAINT "Plan_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tripId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "reference" TEXT NOT NULL,
    CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tripId_key" ON "Booking"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_planId_key" ON "Booking"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");
