import { Router } from "express";
import type { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireRole } from "../middleware/auth.js";
import { validateSlot } from "../rules/slotRules.js";
import { slotShape, slotInclude } from "./shapes.js";

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

  const slots = await getPrisma().slot.findMany({
    where: { scheduleId: schedule.id, endsAt: { gt: new Date() } },
    include: slotInclude,
    orderBy: { startsAt: "asc" },
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
    where: { tutorId: req.user!.id, startsAt: { lt: check.endsAt }, endsAt: { gt: check.startsAt } },
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
