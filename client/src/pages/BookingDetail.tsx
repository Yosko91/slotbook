import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, cancelBooking, getBooking } from "../api";
import type { Booking } from "../api";
import { useAuth } from "../auth";
import { fmtDate, fmtTime } from "../time";

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const state = location.state as { justBooked?: boolean; justMoved?: boolean } | null;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBooking(null);
    setError("");
    getBooking(Number(id))
      .then(setBooking)
      .catch((e) => setError(e.message));
  }, [id]);

  if (!booking) return error ? <div className="error">{error}</div> : <p className="loading">Loading...</p>;

  const isTutor = user?.role === "STAFF";
  const active = booking.status === "ACTIVE";
  const startsIn = new Date(booking.slot.startsAt).getTime() - Date.now();
  // the API checks the same rules (BR-15 for the student, start of the slot for the tutor), this is only a help
  const canCancel = active && (isTutor ? startsIn > 0 : startsIn >= TWELVE_HOURS);

  async function confirmCancel(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReasonError("");
    try {
      const updated = await cancelBooking(booking!.id, reason);
      setBooking(updated);
      setCancelOpen(false);
      setMessage("The booking is cancelled.");
    } catch (err) {
      if (err instanceof ApiError && err.details?.reason) setReasonError(err.details.reason);
      else setError(err instanceof Error ? err.message : "Could not cancel the booking");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Booking #{booking.id}</h2>
      {state?.justBooked && !message && <div className="success">Your session is booked.</div>}
      {state?.justMoved && !message && <div className="success">Your booking is moved.</div>}
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <div className="card">
        <dl>
          <dt>Subject</dt>
          <dd>{booking.slot.schedule.name}</dd>
          <dt>Tutor</dt>
          <dd>{booking.slot.tutor.name}</dd>
          {isTutor && (
            <>
              <dt>Student</dt>
              <dd>{booking.student.name}</dd>
            </>
          )}
          <dt>Date</dt>
          <dd>{fmtDate(booking.slot.startsAt)}</dd>
          <dt>Time</dt>
          <dd>
            {fmtTime(booking.slot.startsAt)} - {fmtTime(booking.slot.endsAt)} ({booking.slot.durationMinutes} min)
          </dd>
          <dt>Topic</dt>
          <dd>{booking.topic}</dd>
          <dt>Status</dt>
          <dd className="status">{active ? "Active" : "Cancelled"}</dd>
          <dt>Booked on</dt>
          <dd>
            {fmtDate(booking.createdAt)} {fmtTime(booking.createdAt)}
          </dd>
          {booking.cancelledAt && (
            <>
              <dt>Cancelled on</dt>
              <dd>
                {fmtDate(booking.cancelledAt)} {fmtTime(booking.cancelledAt)}
              </dd>
              <dt>Cancelled by</dt>
              <dd>{booking.cancelledBy === "STAFF" ? "Tutor" : "Student"}</dd>
              <dt>Reason</dt>
              <dd>{booking.cancelReason ?? "-"}</dd>
            </>
          )}
        </dl>
      </div>

      {active && !isTutor && !canCancel && (
        <p className="empty">You can cancel or move this booking until 12 hours before the start.</p>
      )}

      {canCancel && !cancelOpen && (
        <div className="actions">
          <button onClick={() => setCancelOpen(true)}>Cancel booking</button>
        </div>
      )}

      {cancelOpen && (
        <form className="card" onSubmit={confirmCancel}>
          <label>
            {isTutor ? "Reason for the student" : "Reason (optional)"}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={250} />
            {reasonError && <span className="field-error">{reasonError}</span>}
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Cancelling..." : "Confirm cancellation"}
          </button>{" "}
          <button type="button" className="secondary" onClick={() => setCancelOpen(false)}>
            Keep booking
          </button>
        </form>
      )}

      <Link to={isTutor ? "/staff" : "/bookings"}>{isTutor ? "Back to my schedules" : "Back to my bookings"}</Link>
    </>
  );
}
