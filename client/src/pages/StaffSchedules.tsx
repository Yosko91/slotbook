import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, createSlot, getManagedSchedules, getScheduleSlots } from "../api";
import type { Schedule, Slot } from "../api";
import { START_TIMES, bangkokDate, bangkokToIso, fmtDate, fmtTime } from "../time";

export default function StaffSchedules() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [date, setDate] = useState(bangkokDate(1));
  const [time, setTime] = useState("10:00");
  const [length, setLength] = useState(30);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getManagedSchedules()
      .then((list) => {
        setSchedules(list);
        if (list[0]) setScheduleId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  function loadSlots(id: number) {
    setSlots(null);
    getScheduleSlots(id)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (scheduleId) loadSlots(scheduleId);
  }, [scheduleId]);

  async function addSlot(e: FormEvent) {
    e.preventDefault();
    if (!scheduleId) return;
    setError("");
    setMessage("");
    setFieldErrors({});
    setBusy(true);
    try {
      const slot = await createSlot(scheduleId, bangkokToIso(date, time), length);
      setMessage(`Slot added: ${fmtDate(slot.startsAt)} at ${fmtTime(slot.startsAt)}.`);
      loadSlots(scheduleId);
    } catch (err) {
      if (err instanceof ApiError && err.details) setFieldErrors(err.details);
      else setError(err instanceof Error ? err.message : "Could not add the slot");
    } finally {
      setBusy(false);
    }
  }

  if (!schedules) return error ? <div className="error">{error}</div> : <p className="loading">Loading...</p>;
  if (schedules.length === 0) return <p className="empty">You are not assigned to any schedule yet.</p>;

  return (
    <>
      <h2>My schedules</h2>
      <label>
        Schedule
        <select value={scheduleId ?? ""} onChange={(e) => setScheduleId(Number(e.target.value))}>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className="card">
        <h3>Add a slot</h3>
        <form className="row-form" onSubmit={addSlot}>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            {fieldErrors.startsAt && <span className="field-error">{fieldErrors.startsAt}</span>}
          </label>
          <label>
            Start time
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {START_TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Length
            <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
            {fieldErrors.durationMinutes && <span className="field-error">{fieldErrors.durationMinutes}</span>}
          </label>
          <label>
            &nbsp;
            <button type="submit" disabled={busy}>
              {busy ? "Adding..." : "Add slot"}
            </button>
          </label>
        </form>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <h3>Upcoming slots</h3>
      {!slots ? (
        <p className="loading">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="empty">No upcoming slot. Add one with the form.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Length</th>
              <th>Tutor</th>
              <th>Status</th>
              <th>Student</th>
              <th>Topic</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => (
              <tr key={s.id}>
                <td>{fmtDate(s.startsAt)}</td>
                <td>
                  {fmtTime(s.startsAt)} - {fmtTime(s.endsAt)}
                </td>
                <td>{s.durationMinutes} min</td>
                <td>{s.tutor.name}</td>
                <td>
                  <span className={`badge ${s.status.toLowerCase()}`}>{s.status === "OPEN" ? "Open" : "Booked"}</span>
                </td>
                <td>{s.booking?.student.name ?? "-"}</td>
                <td>{s.booking?.topic ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
