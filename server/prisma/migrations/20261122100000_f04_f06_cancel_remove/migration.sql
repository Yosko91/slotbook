-- F-06: soft delete of a slot
ALTER TABLE "Slot" ADD COLUMN "removedAt" TIMESTAMP(3);

-- F-04: cancellation history of a booking
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelReason" TEXT,
ADD COLUMN "cancelledByRole" "Role";
