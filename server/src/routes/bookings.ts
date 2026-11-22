import { Router } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireRole } from "../middleware/auth.js";
import { canChangeBooking, checkStudentLimits, checkStudentOverlap, isBookingOpen, validateReason, validateTopic } from "../rules/bookingRules.js";
import { RuleError, activeRanges, lockSlot, lockStudent } from "../services/bookingTx.js";
import { bookingInclude, bookingShape } from "./shapes.js";

export const bookingsRouter = Router();

const SLOT_TAKEN = { error: "This slot is already booked", code: "SLOT_TAKEN" };
const SLOT_NOT_FOUND = { error: "Slot not found" };

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
  const studentId = req.user!.id;
  const slot = await prisma.slot.findFirst({
    where: { id: slotId, removedAt: null },
    include: { bookings: { where: { status: "ACTIVE" } } },
  });
  if (!slot) {
    res.status(404).json(SLOT_NOT_FOUND);
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
    const booking = await prisma.$transaction(async (tx) => {
      // F-07: BR-13 and BR-14, checked while the student row is locked
      await lockStudent(tx, studentId);
      const limits = checkStudentLimits(await activeRanges(tx, studentId), slot);
      if (!limits.ok) throw new RuleError(limits.status, { error: limits.error, code: limits.code });

      // F-06: the slot may have been removed or booked since the first read
      await lockSlot(tx, slot.id);
      const current = await tx.slot.findUnique({ where: { id: slot.id }, include: { bookings: { where: { status: "ACTIVE" } } } });
      if (!current || current.removedAt) throw new RuleError(404, SLOT_NOT_FOUND);
      if (current.bookings.length > 0) throw new RuleError(409, SLOT_TAKEN);

      return tx.booking.create({
        data: { slotId: slot.id, studentId, topic: topicCheck.ok ? topicCheck.topic : "" },
        include: bookingInclude,
      });
    });
    res.status(201).json(bookingShape(booking));
  } catch (err) {
    if (err instanceof RuleError) {
      res.status(err.status).json(err.body);
      return;
    }
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

const detailInclude = {
  ...bookingInclude,
  slot: { include: { tutor: true, schedule: { include: { staff: true } } } },
};

// BR-12: the student of the booking or a tutor of the schedule. Everybody else gets null, so 404 (D-06).
async function findVisibleBooking(rawId: unknown, user: { id: number; role: string }) {
  const id = Number(rawId);
  if (!Number.isInteger(id)) return null;
  const booking = await getPrisma().booking.findUnique({ where: { id }, include: detailInclude });
  if (!booking) return null;
  const isOwner = user.role === "STUDENT" && booking.studentId === user.id;
  const isTutor = user.role === "STAFF" && booking.slot.schedule.staff.some((s) => s.staffId === user.id);
  return isOwner || isTutor ? booking : null;
}

const NOT_FOUND = { error: "Booking not found" };
const NOT_ACTIVE = { error: "This booking is not active", code: "BOOKING_NOT_ACTIVE" };

bookingsRouter.get("/:id", async (req, res) => {
  const booking = await findVisibleBooking(req.params.id, req.user!);
  if (!booking) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  res.json(bookingShape(booking));
});

// F-04: the student (until 12 hours before, BR-15) or a tutor of the schedule (until the start, with a reason)
bookingsRouter.post("/:id/cancel", async (req, res) => {
  const user = req.user!;
  const booking = await findVisibleBooking(req.params.id, user);
  if (!booking) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  if (booking.status !== "ACTIVE") {
    res.status(409).json(NOT_ACTIVE);
    return;
  }

  const role = user.role === "STAFF" ? "STAFF" : "STUDENT";
  if (role === "STUDENT" && !canChangeBooking(booking.slot.startsAt)) {
    res.status(422).json({ error: "You can cancel only until 12 hours before the start", code: "CANCEL_CLOSED" });
    return;
  }
  if (role === "STAFF" && booking.slot.startsAt.getTime() <= Date.now()) {
    res.status(422).json({ error: "The session has already started", code: "SLOT_STARTED" });
    return;
  }
  const reason = validateReason(req.body?.reason, role);
  if (!reason.ok) {
    res.status(400).json({ error: "Validation failed", details: { reason: reason.error } });
    return;
  }

  // only an ACTIVE row is changed, so two cancels at the same time cannot both succeed
  const prisma = getPrisma();
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "ACTIVE" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason.reason, cancelledByRole: role },
  });
  if (updated.count === 0) {
    res.status(409).json(NOT_ACTIVE);
    return;
  }
  const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  res.json(bookingShape(fresh));
});

// F-05: cancel the old booking and create the new one in one transaction (all or nothing)
bookingsRouter.post("/:id/move", requireRole("STUDENT"), async (req, res) => {
  const user = req.user!;
  const slotId = req.body?.slotId;
  if (!Number.isInteger(slotId)) {
    res.status(400).json({ error: "Validation failed", details: { slotId: "slotId is required" } });
    return;
  }
  const booking = await findVisibleBooking(req.params.id, user);
  if (!booking) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  if (booking.status !== "ACTIVE") {
    res.status(409).json(NOT_ACTIVE);
    return;
  }
  if (!canChangeBooking(booking.slot.startsAt)) {
    res.status(422).json({ error: "You can move only until 12 hours before the start", code: "CHANGE_CLOSED" });
    return;
  }

  const prisma = getPrisma();
  const target = await prisma.slot.findFirst({ where: { id: slotId, removedAt: null } });
  if (!target) {
    res.status(404).json(SLOT_NOT_FOUND);
    return;
  }
  if (target.id === booking.slotId) {
    res.status(422).json({ error: "This is already the slot of your booking", code: "SAME_SLOT" });
    return;
  }
  if (target.scheduleId !== booking.slot.scheduleId) {
    res.status(422).json({ error: "You can move only to a slot of the same schedule", code: "DIFFERENT_SCHEDULE" });
    return;
  }
  if (!isBookingOpen(target.startsAt)) {
    res.status(422).json({ error: "Booking is closed for this slot (less than 1 hour before the start)", code: "BOOKING_CLOSED" });
    return;
  }

  try {
    const moved = await prisma.$transaction(async (tx) => {
      await lockStudent(tx, user.id);
      // BR-14 without the booking that is moved. BR-13 does not change (one cancelled, one created).
      const overlap = checkStudentOverlap(await activeRanges(tx, user.id, booking.id), target);
      if (!overlap.ok) throw new RuleError(overlap.status, { error: overlap.error, code: overlap.code });

      await lockSlot(tx, target.id);
      const current = await tx.slot.findUnique({ where: { id: target.id }, include: { bookings: { where: { status: "ACTIVE" } } } });
      if (!current || current.removedAt) throw new RuleError(404, SLOT_NOT_FOUND);
      if (current.bookings.length > 0) throw new RuleError(409, SLOT_TAKEN);

      const cancelled = await tx.booking.updateMany({
        where: { id: booking.id, status: "ACTIVE" },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Moved to another slot", cancelledByRole: "STUDENT" },
      });
      if (cancelled.count === 0) throw new RuleError(409, NOT_ACTIVE);

      return tx.booking.create({
        data: { slotId: target.id, studentId: user.id, topic: booking.topic },
        include: bookingInclude,
      });
    });
    res.status(201).json(bookingShape(moved));
  } catch (err) {
    if (err instanceof RuleError) {
      res.status(err.status).json(err.body);
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json(SLOT_TAKEN);
      return;
    }
    throw err;
  }
});
