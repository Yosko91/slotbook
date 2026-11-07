import type { Slot, User } from "@prisma/client";

export const slotInclude = { tutor: true } as const;

type SlotRow = Slot & { tutor: User };

// what the client gets for a slot (no private user fields)
export function slotShape(slot: SlotRow) {
  return {
    id: slot.id,
    scheduleId: slot.scheduleId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    durationMinutes: (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000,
    tutor: { id: slot.tutor.id, name: slot.tutor.name },
    status: "OPEN" as "OPEN" | "BOOKED",
    booking: null as null | { id: number; topic: string; student: { id: number; name: string; email: string } },
  };
}
