import type { Booking, Schedule, Slot, User } from "@prisma/client";

// the slot with its tutor and its active booking (max one, BR-09)
export const slotInclude = {
  tutor: true,
  bookings: { where: { status: "ACTIVE" as const }, include: { student: true } },
};

type SlotRow = Slot & { tutor: User; bookings?: (Booking & { student: User })[] };

const minutes = (slot: Slot) => (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60000;

// what the tutor gets for a slot (no private user fields)
export function slotShape(slot: SlotRow) {
  const booking = slot.bookings?.[0];
  return {
    id: slot.id,
    scheduleId: slot.scheduleId,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    durationMinutes: minutes(slot),
    tutor: { id: slot.tutor.id, name: slot.tutor.name },
    status: booking ? "BOOKED" : "OPEN",
    booking: booking
      ? { id: booking.id, topic: booking.topic, student: { id: booking.student.id, name: booking.student.name, email: booking.student.email } }
      : null,
  };
}

export const bookingInclude = { student: true, slot: { include: { tutor: true, schedule: true } } };

type BookingRow = Booking & { student: User; slot: Slot & { tutor: User; schedule: Schedule } };

export function bookingShape(b: BookingRow) {
  return {
    id: b.id,
    status: b.status,
    topic: b.topic,
    createdAt: b.createdAt,
    student: { id: b.student.id, name: b.student.name },
    slot: {
      id: b.slot.id,
      startsAt: b.slot.startsAt,
      endsAt: b.slot.endsAt,
      durationMinutes: minutes(b.slot),
      schedule: { id: b.slot.schedule.id, name: b.slot.schedule.name },
      tutor: { id: b.slot.tutor.id, name: b.slot.tutor.name },
    },
  };
}
