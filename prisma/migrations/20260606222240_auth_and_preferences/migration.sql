/*
  Warnings:

  - You are about to drop the column `pin` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "passwordHash" TEXT,
    "phone" TEXT,
    "defaultAirports" TEXT,
    "preferredAirlines" TEXT,
    "defaultCabinClass" TEXT,
    "defaultHotelStars" INTEGER,
    "defaultLocationPreference" TEXT,
    "standingRequirements" TEXT
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
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
    "totalBudget" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "numberOfTravellers" INTEGER NOT NULL,
    "cabinClass" TEXT NOT NULL,
    "preferredAirline" TEXT,
    "airlineRewards" TEXT,
    "hotelStarRating" INTEGER NOT NULL,
    "locationPreference" TEXT NOT NULL,
    "amenities" TEXT NOT NULL,
    "tripPurpose" TEXT NOT NULL,
    "specialRequirements" TEXT,
    "loyaltyNumbers" TEXT,
    CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("amenities", "cabinClass", "createdAt", "currency", "departureDate", "destinations", "email", "fullName", "hotelStarRating", "id", "locationPreference", "loyaltyNumbers", "numberOfNights", "numberOfTravellers", "originCity", "phone", "returnDate", "specialRequirements", "totalBudget", "tripPurpose") SELECT "amenities", "cabinClass", "createdAt", "currency", "departureDate", "destinations", "email", "fullName", "hotelStarRating", "id", "locationPreference", "loyaltyNumbers", "numberOfNights", "numberOfTravellers", "originCity", "phone", "returnDate", "specialRequirements", "totalBudget", "tripPurpose" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");
