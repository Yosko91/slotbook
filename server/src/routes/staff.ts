import { Router } from "express";
import type { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireRole } from "../middleware/auth.js";
import { planWeeklySlots, validateSlot } from "../rules/slotRules.js";
import { bookingInclude, bookingShape, slotInclude, slotShape } from "./shapes.js";
import { RuleError, lockSlot, lockUser } from "../services/bookingTx.js";
import { canRecordAttendance, parseAttendance } from "../rules/attendanceRules.js";

export const staffRouter = Router();
staffRouter.use(requireRole("STAFF"));

// BR-04: returns the schedule only if this tutor manages it, else answers 404 or 403
async function managedSchedule(req: Request, res: Response) {
  const id = Number(req.params.id);
  const schedule = Number.isInteger(id)
    ? await getPrisma().schedule.findUnique({ where: { id }, include: { staff: true } })
    : null;
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return null;
  }
  if (!schedule.staff.some((s) => s.staffId === req.user!.id)) {
    res.status(403).json({ error: "You do not manage this schedule" });
    return null;
  }
  return schedule;
}

staffRouter.get("/schedules", async (req, res) => {
  const schedules = await getPrisma().schedule.findMany({
    where: { isActive: true, staff: { some: { staffId: req.user!.id } } },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  res.json(schedules);
});

staffRouter.get("/schedules/:id/slots", async (req, res) => {
  const schedule = await managedSchedule(req, res);
  if (!schedule) return;

  // F-10: ?period=past gives the slots that started in the last 30 days, newest first
  const period = req.query.period ?? "upcoming";
  if (period !== "upcoming" && period !== "past") {
    res.status(400).json({ error: "Validation failed", details: { period: "period must be upcoming or past" } });
    return;
  }
  const now = new Date();
  const slots = await getPrisma().slot.findMany({
    where:
      period === "past"
        ? { scheduleId: schedule.id, removedAt: null, startsAt: { lte: now, gte: new Date(now.getTime() - 30 * 24 * 3600 * 1000) } }
        : { scheduleId: schedule.id, removedAt: null, endsAt: { gt: now } },
    include: slotInclude,
    orderBy: { startsAt: period === "past" ? "desc" : "asc" },
  });
  res.json(slots.map(slotShape));
});

staffRouter.post("/schedules/:id/slots", async (req, res) => {
  const schedule = await managedSchedule(req, res);
  if (!schedule) return;

  const check = validateSlot({ startsAt: req.body?.startsAt, durationMinutes: req.body?.durationMinutes });
  if (!check.ok) {
    res.status(400).json({ error: "Validation failed", details: check.errors });
    return;
  }

  // BR-08: same tutor, any schedule
  const prisma = getPrisma();
  const clash = await prisma.slot.findFirst({
    where: { tutorId: req.user!.id, removedAt: null, startsAt: { lt: check.endsAt }, endsAt: { gt: check.startsAt } },
  });
  if (clash) {
    res.status(409).json({ error: "You already have a slot at this time", code: "SLOT_OVERLAP" });
    return;
  }

  const slot = await prisma.slot.create({
    data: { scheduleId: schedule.id, tutorId: req.user!.id, startsAt: check.startsAt, endsAt: check.endsAt },
    include: slotInclude,
  });
  res.status(201).json(slotShape(slot));
});

// F-09: the same slot every week for 2 to 8 weeks, all or nothing (AC-51 to AC-54)
staffRouter.post("/schedules/:id/slots/weekly", async (req, res) => {
  const schedule = await managedSchedule(req, res);
  if (!schedule) return;

  const plan = planWeeklySlots({ startsAt: req.body?.startsAt, durationMinutes: req.body?.durationMinutes, weeks: req.body?.weeks });
  if (!plan.ok) {
    if ("details" in plan) res.status(400).json({ error: "Validation failed", details: plan.details });
    else res.status(400).json({ error: "Some weeks are not valid", weeks: plan.weeks });
    return;
  }

  const prisma = getPrisma();
  const tutorId = req.user!.id;
  const planned = plan.slots;
  try {
    const ids = await prisma.$transaction(async (tx) => {
      // two series of the same tutor at the same time wait for each other here (BR-08)
      await lockUser(tx, tutorId);
      const clashes: { week: number; startsAt: string; error: string }[] = [];
      for (const [k, s] of planned.entries()) {
        const clash = await tx.slot.findFirst({
          where: { tutorId, removedAt: null, startsAt: { lt: s.endsAt }, endsAt: { gt: s.startsAt } },
        });
        if (clash) clashes.push({ week: k + 1, startsAt: s.startsAt.toISOString(), error: "You already have a slot at this time" });
      }
      if (clashes.length > 0) {
        throw new RuleError(409, { error: "Some weeks overlap your slots", code: "SLOT_OVERLAP", weeks: clashes });
      }
      const created: { id: number }[] = [];
      for (const s of planned) {
        created.push(await tx.slot.create({ data: { scheduleId: schedule.id, tutorId, startsAt: s.startsAt, endsAt: s.endsAt } }));
      }
      return created.map((c) => c.id);
    });
    const slots = await prisma.slot.findMany({ where: { id: { in: ids } }, include: slotInclude, orderBy: { startsAt: "asc" } });
    res.status(201).json(slots.map(slotShape));
  } catch (err) {
    if (err instanceof RuleError) {
      res.status(err.status).json(err.body);
      return;
    }
    throw err;
  }
});

// F-06: soft delete of an open slot that has not started (BR-16)
staffRouter.delete("/slots/:id", async (req, res) => {
  const id = Number(req.params.id);
  const prisma = getPrisma();
  const slot = Number.isInteger(id)
    ? await prisma.slot.findFirst({ where: { id, removedAt: null }, include: { schedule: { include: { staff: true } } } })
    : null;
  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }
  if (!slot.schedule.staff.some((s) => s.staffId === req.user!.id)) {
    res.status(403).json({ error: "You do not manage this schedule" });
    return;
  }
  if (slot.startsAt.getTime() <= Date.now()) {
    res.status(422).json({ error: "This slot has already started", code: "SLOT_STARTED" });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // same lock as POST /api/bookings, so nobody books between the check and the remove
      await lockSlot(tx, slot.id);
      const active = await tx.booking.count({ where: { slotId: slot.id, status: "ACTIVE" } });
      if (active > 0) {
        throw new RuleError(409, { error: "This slot has an active booking. Cancel the booking first.", code: "SLOT_HAS_BOOKING" });
      }
      const removed = await tx.slot.updateMany({ where: { id: slot.id, removedAt: null }, data: { removedAt: new Date() } });
      if (removed.count === 0) throw new RuleError(404, { error: "Slot not found" });
    });
  } catch (err) {
    if (err instanceof RuleError) {
      res.status(err.status).json(err.body);
      return;
    }
    throw err;
  }
  res.status(204).send();
});

// F-10: the tutor of the schedule records ATTENDED or NO_SHOW once, after the start (BR-17)
staffRouter.post("/bookings/:id/attendance", async (req, res) => {
  const id = Number(req.params.id);
  const prisma = getPrisma();
  const booking = Number.isInteger(id)
    ? await prisma.booking.findUnique({ where: { id }, include: { slot: { include: { schedule: { include: { staff: true } } } } } })
    : null;
  // D-06: a booking of another schedule is "not found"
  if (!booking || !booking.slot.schedule.staff.some((s) => s.staffId === req.user!.id)) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.status !== "ACTIVE") {
    res.status(409).json({ error: "This booking is not active", code: "BOOKING_NOT_ACTIVE" });
    return;
  }
  if (!canRecordAttendance(booking.slot.startsAt)) {
    res.status(422).json({ error: "Attendance can be recorded only after the start", code: "ATTENDANCE_TOO_EARLY" });
    return;
  }
  const value = parseAttendance(req.body?.status);
  if (!value.ok) {
    res.status(400).json({ error: "Validation failed", details: { status: value.error } });
    return;
  }

  // only a row without attendance is changed, so two clicks at the same time give one 200 and one 409
  const updated = await prisma.booking.updateMany({
    where: { id: booking.id, status: "ACTIVE", attendance: null },
    data: { attendance: value.value, attendanceAt: new Date() },
  });
  if (updated.count === 0) {
    res.status(409).json({ error: "Attendance is already recorded", code: "ATTENDANCE_RECORDED" });
    return;
  }
  const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id }, include: bookingInclude });
  res.json(bookingShape(fresh));
});
