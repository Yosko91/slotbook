import { Router } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireRole } from "../middleware/auth.js";
import { isBookingOpen, validateTopic } from "../rules/bookingRules.js";
import { bookingInclude, bookingShape } from "./shapes.js";

export const bookingsRouter = Router();

const SLOT_TAKEN = { error: "This slot is already booked", code: "SLOT_TAKEN" };

bookingsRouter.post("/", requireRole("STUDENT"), async (req, res) => {
  const { slotId, topic } = req.body ?? {};
  const details: Record<string, string> = {};
  if (!Number.isInteger(slotId)) details.slotId = "slotId is required";
  const topicCheck = validateTopic(topic);
  if (!topicCheck.ok) details.topic = topicCheck.error;
  if (Object.keys(details).length > 0) {
    res.status(400).json({ error: "Validation failed", details });
    return;
  }

  const prisma = getPrisma();
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { bookings: { where: { status: "ACTIVE" } } },
  });
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  if (!isBookingOpen(slot.startsAt)) {
    res.status(422).json({ error: "Booking is closed for this slot (less than 1 hour before the start)", code: "BOOKING_CLOSED" });
    return;
  }
  if (slot.bookings.length > 0) {
    res.status(409).json(SLOT_TAKEN);
    return;
  }

  try {
    const booking = await prisma.booking.create({
      data: { slotId: slot.id, studentId: req.user!.id, topic: topicCheck.ok ? topicCheck.topic : "" },
      include: bookingInclude,
    });
    res.status(201).json(bookingShape(booking));
  } catch (err) {
    // two requests passed the check at the same time: the unique index stops the second one (BR-09)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json(SLOT_TAKEN);
      return;
    }
    throw err;
  }
});

bookingsRouter.get("/mine", requireRole("STUDENT"), async (req, res) => {
  const bookings = await getPrisma().booking.findMany({
    where: { studentId: req.user!.id },
    include: bookingInclude,
    orderBy: { slot: { startsAt: "asc" } },
  });
  res.json(bookings.map(bookingShape));
});

// BR-12: the student of the booking or a tutor of the schedule. Everybody else gets 404 (D-06).
bookingsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = Number.isInteger(id)
    ? await getPrisma().booking.findUnique({
        where: { id },
        include: { ...bookingInclude, slot: { include: { tutor: true, schedule: { include: { staff: true } } } } },
      })
    : null;

  const user = req.user!;
  const allowed =
    booking &&
    ((user.role === "STUDENT" && booking.studentId === user.id) ||
      (user.role === "STAFF" && booking.slot.schedule.staff.some((s) => s.staffId === user.id)));

  if (!allowed) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(bookingShape(booking));
});
