-- CreateTable
CREATE TABLE "HotelOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "duffelBookingId" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "totalAmount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "accommodationName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "checkInDate" TEXT NOT NULL,
    "checkOutDate" TEXT NOT NULL,
    "roomName" TEXT,
    "guests" TEXT NOT NULL,
    CONSTRAINT "HotelOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelOrder_duffelBookingId_key" ON "HotelOrder"("duffelBookingId");

-- CreateIndex
CREATE INDEX "HotelOrder_userId_idx" ON "HotelOrder"("userId");
