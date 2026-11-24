import { Router } from "express";
import { getPrisma } from "../prisma.js";
import { parseAvailabilityFilter } from "../rules/filterRules.js";
import { bookingOpenFrom } from "../rules/bookingRules.js";

export const schedulesRouter = Router();

schedulesRouter.get("/", async (_req, res) => {
  const schedules = await getPrisma().schedule.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  res.json(schedules);
});

async function activeSchedule(rawId: string) {
  const id = Number(rawId);
  const schedule = Number.isInteger(id) ? await getPrisma().schedule.findUnique({ where: { id } }) : null;
  return schedule && schedule.isActive ? schedule : null;
}

// F-08: tutors of the schedule, for the Tutor filter
schedulesRouter.get("/:id/tutors", async (req, res) => {
  const schedule = await activeSchedule(req.params.id);
  if (!schedule) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  const links = await getPrisma().scheduleStaff.findMany({
    where: { scheduleId: schedule.id },
    select: { staff: { select: { id: true, name: true } } },
    orderBy: { staff: { name: "asc" } },
  });
  res.json(links.map((l) => l.staff));
});

// FR-06: open slots that can still be booked (BR-09, BR-10), FR-12: optional filters
schedulesRouter.get("/:id/available-slots", async (req, res) => {
  const id = Number(req.params.id);
  const prisma = getPrisma();
  const schedule = Number.isInteger(id) ? await prisma.schedule.findUnique({ where: { id } }) : null;
  if (!schedule || !schedule.isActive) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const parsed = parseAvailabilityFilter(req.query as Record<string, unknown>);
  if (!parsed.ok) {
    res.status(400).json({ error: "Validation failed", details: parsed.details });
    return;
  }
  const { startsFrom, startsBefore, tutorId } = parsed.filter;
  const openFrom = bookingOpenFrom(); // BR-10, same rule as POST /api/bookings

  const slots = await prisma.slot.findMany({
    where: {
      scheduleId: id,
      removedAt: null,
      ...(tutorId ? { tutorId } : {}),
      startsAt: {
        gte: startsFrom && startsFrom > openFrom ? startsFrom : openFrom,
        ...(startsBefore ? { lt: startsBefore } : {}),
      },
      bookings: { none: { status: "ACTIVE" } },
    },
    include: { tutor: true },
    orderBy: { startsAt: "asc" },
  });

  res.json(
    slots.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      durationMinutes: (s.endsAt.getTime() - s.startsAt.getTime()) / 60000,
      tutor: { id: s.tutor.id, name: s.tutor.name },
    }))
  );
});
