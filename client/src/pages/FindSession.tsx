import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, bookSlot, getAvailableSlots, getSchedules } from "../api";
import type { AvailableSlot, Schedule } from "../api";
import { fmtDate, fmtTime } from "../time";

export default function FindSession() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [topicError, setTopicError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSchedules()
      .then((list) => {
        setSchedules(list);
        if (list[0]) setScheduleId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  function loadSlots(id: number) {
    setSlots(null);
    getAvailableSlots(id)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (scheduleId) loadSlots(scheduleId);
  }, [scheduleId]);

  function openForm(slotId: number) {
    setSelected(slotId);
    setTopic("");
    setTopicError("");
    setError("");
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setTopicError("");
    try {
      const booking = await bookSlot(selected, topic);
      navigate(`/bookings/${booking.id}`, { state: { justBooked: true } });
    } catch (err) {
      if (err instanceof ApiError && err.details?.topic) {
        setTopicError(err.details.topic);
      } else {
        // 409 or 422: show the message and reload, the slot is not free anymore
        setError(err instanceof Error ? err.message : "Booking failed");
        setSelected(null);
        if (scheduleId) loadSlots(scheduleId);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!schedules) return error ? <div className="error">{error}</div> : <p className="loading">Loading...</p>;

  return (
    <>
      <h2>Find a session</h2>
      <label>
        Subject
        <select value={scheduleId ?? ""} onChange={(e) => setScheduleId(Number(e.target.value))}>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {error && <div className="error">{error}</div>}

      {!slots ? (
        <p className="loading">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="empty">No available slot for this schedule.</p>
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
            {slots.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td>{fmtDate(s.startsAt)}</td>
                  <td>
                    {fmtTime(s.startsAt)} - {fmtTime(s.endsAt)}
                  </td>
                  <td>{s.durationMinutes} min</td>
                  <td>{s.tutor.name}</td>
                  <td>
                    <button onClick={() => openForm(s.id)} disabled={selected === s.id}>
                      Book
                    </button>
                  </td>
                </tr>
                {selected === s.id && (
                  <tr>
                    <td colSpan={5}>
                      <form onSubmit={confirm}>
                        <label>
                          What do you need help with? ({topic.trim().length}/200)
                          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} maxLength={250} />
                          {topicError && <span className="field-error">{topicError}</span>}
                        </label>
                        <button type="submit" disabled={busy}>
                          {busy ? "Booking..." : "Confirm booking"}
                        </button>{" "}
                        <button type="button" className="secondary" onClick={() => setSelected(null)}>
                          Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
