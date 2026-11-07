import { Router } from "express";
import { getPrisma } from "../prisma.js";

export const schedulesRouter = Router();

schedulesRouter.get("/", async (_req, res) => {
  const schedules = await getPrisma().schedule.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  res.json(schedules);
});

// FR-06: open slots that can still be booked (BR-09, BR-10)
schedulesRouter.get("/:id/available-slots", async (req, res) => {
  const id = Number(req.params.id);
  const prisma = getPrisma();
  const schedule = Number.isInteger(id) ? await prisma.schedule.findUnique({ where: { id } }) : null;
  if (!schedule || !schedule.isActive) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }

  const slots = await prisma.slot.findMany({
    where: {
      scheduleId: id,
      startsAt: { gte: new Date(Date.now() + 60 * 60 * 1000) },
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
