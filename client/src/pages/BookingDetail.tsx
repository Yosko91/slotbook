import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, cancelBooking, getAvailableSlots, getBooking, moveBooking } from "../api";
import type { AvailableSlot, Booking } from "../api";
import { useAuth } from "../auth";
import { attendanceLabel, fmtDate, fmtTime } from "../time";

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { justBooked?: boolean; justMoved?: boolean } | null;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);

  const [moveSlots, setMoveSlots] = useState<AvailableSlot[] | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    setBooking(null);
    setError("");
    setMessage("");
    setMoveOpen(false);
    setCancelOpen(false);
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

  function loadMoveSlots() {
    setMoveSlots(null);
    getAvailableSlots(booking!.slot.schedule.id)
      .then((list) => setMoveSlots(list.filter((s) => s.id !== booking!.slot.id)))
      .catch((e) => setError(e.message));
  }

  function openMove() {
    setMoveOpen(true);
    setCancelOpen(false);
    setError("");
    loadMoveSlots();
  }

  async function moveTo(slotId: number) {
    setBusy(true);
    setError("");
    try {
      const moved = await moveBooking(booking!.id, slotId);
      navigate(`/bookings/${moved.id}`, { state: { justMoved: true } });
    } catch (err) {
      // 409 or 422: show the message and reload the list
      setError(err instanceof Error ? err.message : "Could not move the booking");
      loadMoveSlots();
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
          {active && (
            <>
              <dt>Attendance</dt>
              <dd className="attendance">{attendanceLabel(booking.attendance, booking.slot.startsAt)}</dd>
            </>
          )}
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

      {canCancel && !cancelOpen && !moveOpen && (
        <div className="actions">
          <button onClick={() => setCancelOpen(true)}>Cancel booking</button>
          {!isTutor && (
            <button className="secondary" onClick={openMove}>
              Move to another slot
            </button>
          )}
        </div>
      )}

      {moveOpen && (
        <div className="card">
          <h3>Move to another slot of {booking.slot.schedule.name}</h3>
          {!moveSlots ? (
            <p className="loading">Loading...</p>
          ) : moveSlots.length === 0 ? (
            <p className="empty">No other available slot for this schedule.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Length</th>
                  <th>Tutor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {moveSlots.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.startsAt)}</td>
                    <td>
                      {fmtTime(s.startsAt)} - {fmtTime(s.endsAt)}
                    </td>
                    <td>{s.durationMinutes} min</td>
                    <td>{s.tutor.name}</td>
                    <td>
                      <button onClick={() => moveTo(s.id)} disabled={busy}>
                        Move here
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            <button type="button" className="secondary" onClick={() => setMoveOpen(false)}>
              Keep this slot
            </button>
          </p>
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
