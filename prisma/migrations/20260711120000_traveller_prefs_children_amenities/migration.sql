-- Add per-user default preferred amenities (JSON array)
ALTER TABLE "User" ADD COLUMN "defaultAmenities" TEXT;

-- Add child-traveller count to a trip (adults tracked in numberOfTravellers)
ALTER TABLE "Trip" ADD COLUMN "numberOfChildren" INTEGER NOT NULL DEFAULT 0;
