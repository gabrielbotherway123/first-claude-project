-- CreateTable
CREATE TABLE "FlightOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "duffelOrderId" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "departureDate" TEXT NOT NULL,
    "returnDate" TEXT,
    "cabinClass" TEXT NOT NULL,
    "airlineName" TEXT NOT NULL,
    "airlineCode" TEXT NOT NULL,
    "passengers" TEXT NOT NULL,
    "flights" TEXT NOT NULL,
    CONSTRAINT "FlightOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FlightOrder_duffelOrderId_key" ON "FlightOrder"("duffelOrderId");

-- CreateIndex
CREATE INDEX "FlightOrder_userId_idx" ON "FlightOrder"("userId");
