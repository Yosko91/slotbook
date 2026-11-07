import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBookings } from "../api";
import type { Booking } from "../api";
import { fmtDate, fmtTime } from "../time";

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!bookings) return <p className="loading">Loading...</p>;

  return (
    <>
      <h2>My bookings</h2>
      {bookings.length === 0 ? (
        <p className="empty">You have no booking yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Subject</th>
              <th>Tutor</th>
              <th>Topic</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{fmtDate(b.slot.startsAt)}</td>
                <td>{fmtTime(b.slot.startsAt)}</td>
                <td>{b.slot.schedule.name}</td>
                <td>{b.slot.tutor.name}</td>
                <td>{b.topic}</td>
                <td>{b.status === "ACTIVE" ? "Active" : "Cancelled"}</td>
                <td>
                  <Link to={`/bookings/${b.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
