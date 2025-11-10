-- Remove exclusivity unique index to allow overlapping non-confirmed slots
DROP INDEX IF EXISTS "ServiceBooking_serviceId_date_startMinutes_key";

-- Add address and payment tracking fields to ServiceBooking
ALTER TABLE "ServiceBooking"
  ADD COLUMN IF NOT EXISTS "addressLine1" TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "amountPaid" INTEGER NOT NULL DEFAULT 0;
