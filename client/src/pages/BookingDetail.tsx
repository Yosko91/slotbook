import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getBooking } from "../api";
import type { Booking } from "../api";
import { fmtDate, fmtTime } from "../time";

export default function BookingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const justBooked = (location.state as { justBooked?: boolean } | null)?.justBooked;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBooking(Number(id))
      .then(setBooking)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!booking) return <p className="loading">Loading...</p>;

  return (
    <>
      <h2>Booking #{booking.id}</h2>
      {justBooked && <div className="success">Your session is booked.</div>}
      <div className="card">
        <dl>
          <dt>Subject</dt>
          <dd>{booking.slot.schedule.name}</dd>
          <dt>Tutor</dt>
          <dd>{booking.slot.tutor.name}</dd>
          <dt>Date</dt>
          <dd>{fmtDate(booking.slot.startsAt)}</dd>
          <dt>Time</dt>
          <dd>
            {fmtTime(booking.slot.startsAt)} - {fmtTime(booking.slot.endsAt)} ({booking.slot.durationMinutes} min)
          </dd>
          <dt>Topic</dt>
          <dd>{booking.topic}</dd>
          <dt>Status</dt>
          <dd>{booking.status === "ACTIVE" ? "Active" : "Cancelled"}</dd>
          <dt>Booked on</dt>
          <dd>
            {fmtDate(booking.createdAt)} {fmtTime(booking.createdAt)}
          </dd>
        </dl>
      </div>
      <Link to="/bookings">Back to my bookings</Link>
    </>
  );
}
