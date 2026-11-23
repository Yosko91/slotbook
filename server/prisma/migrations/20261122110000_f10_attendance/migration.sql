-- F-10: attendance of a booking (BR-17)
CREATE TYPE "Attendance" AS ENUM ('ATTENDED', 'NO_SHOW');

ALTER TABLE "Booking" ADD COLUMN "attendance" "Attendance",
ADD COLUMN "attendanceAt" TIMESTAMP(3);
