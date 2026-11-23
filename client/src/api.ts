const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Role = "STUDENT" | "STAFF";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface WeekError {
  week: number;
  startsAt: string;
  error: string;
}

interface ErrorBody {
  error?: string;
  code?: string;
  details?: Record<string, string>;
  weeks?: WeekError[];
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string>;
  weeks?: WeekError[];
  constructor(status: number, body: ErrorBody) {
    super(body.error ?? "Something went wrong");
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.weeks = body.weeks;
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export interface Schedule {
  id: number;
  name: string;
  description: string;
}

export interface Slot {
  id: number;
  scheduleId: number;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  tutor: { id: number; name: string };
  status: "OPEN" | "BOOKED";
  booking: null | { id: number; topic: string; attendance: Attendance | null; student: { id: number; name: string; email: string } };
}

export interface AvailableSlot {
  id: number;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  tutor: { id: number; name: string };
}

export type Attendance = "ATTENDED" | "NO_SHOW";

export interface Booking {
  id: number;
  status: "ACTIVE" | "CANCELLED";
  topic: string;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: Role | null;
  attendance: Attendance | null;
  attendanceAt: string | null;
  student: { id: number; name: string };
  slot: {
    id: number;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    schedule: { id: number; name: string };
    tutor: { id: number; name: string };
  };
}

export const getSchedules = () => api<Schedule[]>("/api/schedules");
export interface SlotFilter {
  from?: string;
  to?: string;
  tutorId?: number;
}

export function getAvailableSlots(id: number, filter: SlotFilter = {}) {
  const params = new URLSearchParams();
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.tutorId) params.set("tutorId", String(filter.tutorId));
  const query = params.toString();
  return api<AvailableSlot[]>(`/api/schedules/${id}/available-slots${query ? `?${query}` : ""}`);
}
export const getScheduleTutors = (id: number) => api<{ id: number; name: string }[]>(`/api/schedules/${id}/tutors`);
export const bookSlot = (slotId: number, topic: string) =>
  api<Booking>("/api/bookings", { method: "POST", body: { slotId, topic } });
export const getMyBookings = () => api<Booking[]>("/api/bookings/mine");
export const getBooking = (id: number) => api<Booking>(`/api/bookings/${id}`);
export const moveBooking = (id: number, slotId: number) =>
  api<Booking>(`/api/bookings/${id}/move`, { method: "POST", body: { slotId } });
export const cancelBooking = (id: number, reason: string) =>
  api<Booking>(`/api/bookings/${id}/cancel`, { method: "POST", body: { reason } });

export const getManagedSchedules = () => api<Schedule[]>("/api/staff/schedules");
export const getScheduleSlots = (id: number, period: "upcoming" | "past" = "upcoming") =>
  api<Slot[]>(`/api/staff/schedules/${id}/slots${period === "past" ? "?period=past" : ""}`);
export const recordAttendance = (bookingId: number, status: Attendance) =>
  api<Booking>(`/api/staff/bookings/${bookingId}/attendance`, { method: "POST", body: { status } });
export const removeSlot = (slotId: number) => api<void>(`/api/staff/slots/${slotId}`, { method: "DELETE" });
export const createSlot = (id: number, startsAt: string, durationMinutes: number) =>
  api<Slot>(`/api/staff/schedules/${id}/slots`, { method: "POST", body: { startsAt, durationMinutes } });
export interface Summary {
  from: string;
  to: string;
  open: number;
  booked: number;
  cancelled: number;
  attended: number;
  noShow: number;
}
export const getSummary = (id: number, from: string, to: string) =>
  api<Summary>(`/api/staff/schedules/${id}/summary?from=${from}&to=${to}`);
export const createWeeklySlots = (id: number, startsAt: string, durationMinutes: number, weeks: number) =>
  api<Slot[]>(`/api/staff/schedules/${id}/slots/weekly`, { method: "POST", body: { startsAt, durationMinutes, weeks } });

export const login = (email: string, password: string) =>
  api<User>("/api/auth/login", { method: "POST", body: { email, password } });
export const logout = () => api<void>("/api/auth/logout", { method: "POST" });
export const getMe = () => api<User>("/api/auth/me");
