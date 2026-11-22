import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { FormEvent } from "react";
import { ApiError, createSlot, getManagedSchedules, getScheduleSlots, recordAttendance, removeSlot } from "../api";
import type { Attendance, Schedule, Slot } from "../api";
import { START_TIMES, attendanceLabel, bangkokDate, bangkokToIso, fmtDate, fmtTime } from "../time";

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
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [marking, setMarking] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    getManagedSchedules()
      .then((list) => {
        setSchedules(list);
        if (list[0]) setScheduleId(list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  function loadSlots(id: number, which = view) {
    setSlots(null);
    getScheduleSlots(id, which)
      .then(setSlots)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (scheduleId) loadSlots(scheduleId, view);
  }, [scheduleId, view]);

  function showView(next: "upcoming" | "past") {
    setError("");
    setMessage("");
    setView(next);
  }

  // F-10: the API refuses before the start and a second record (409)
  async function mark(slot: Slot, status: Attendance) {
    if (!slot.booking || !scheduleId) return;
    setError("");
    setMessage("");
    setMarking(slot.booking.id);
    try {
      await recordAttendance(slot.booking.id, status);
      setMessage(`Attendance recorded for ${slot.booking.student.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the attendance");
    } finally {
      setMarking(null);
      loadSlots(scheduleId, "past");
    }
  }

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

  async function confirmRemove(slotId: number) {
    if (!scheduleId) return;
    setError("");
    setMessage("");
    setRemovingId(slotId);
    try {
      await removeSlot(slotId);
      setMessage("Slot removed.");
    } catch (err) {
      // 409: a student booked it meanwhile
      setError(err instanceof Error ? err.message : "Could not remove the slot");
    } finally {
      setRemovingId(null);
      setConfirmId(null);
      loadSlots(scheduleId);
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

      <div className="actions tabs">
        <button className={view === "upcoming" ? "" : "secondary"} onClick={() => showView("upcoming")}>
          Upcoming
        </button>
        <button className={view === "past" ? "" : "secondary"} onClick={() => showView("past")}>
          Past sessions
        </button>
      </div>

      {view === "upcoming" && (
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
          <div style={{ alignSelf: "center" }}>
            <button type="submit" disabled={busy}>
              {busy ? "Adding..." : "Add slot"}
            </button>
          </div>
        </form>
      </div>
      )}

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {view === "past" && (
        <>
          <h3>Past sessions (last 30 days)</h3>
          {!slots ? (
            <p className="loading">Loading...</p>
          ) : slots.length === 0 ? (
            <p className="empty">No past session in the last 30 days.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Tutor</th>
                  <th>Student</th>
                  <th>Topic</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.startsAt)}</td>
                    <td>
                      {fmtTime(s.startsAt)} - {fmtTime(s.endsAt)}
                    </td>
                    <td>{s.tutor.name}</td>
                    <td>{s.booking ? <Link to={`/bookings/${s.booking.id}`}>{s.booking.student.name}</Link> : "-"}</td>
                    <td>{s.booking?.topic ?? "-"}</td>
                    <td>
                      {!s.booking ? (
                        "-"
                      ) : s.booking.attendance ? (
                        attendanceLabel(s.booking.attendance, s.startsAt)
                      ) : (
                        <span className="confirm">
                          <button onClick={() => mark(s, "ATTENDED")} disabled={marking === s.booking.id}>
                            Attended
                          </button>{" "}
                          <button className="secondary" onClick={() => mark(s, "NO_SHOW")} disabled={marking === s.booking.id}>
                            No-show
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {view === "upcoming" && <h3>Upcoming slots</h3>}
      {view === "past" ? null : !slots ? (
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
              <th></th>
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
                <td>{s.booking ? <Link to={`/bookings/${s.booking.id}`}>{s.booking.student.name}</Link> : "-"}</td>
                <td>{s.booking?.topic ?? "-"}</td>
                <td>
                  {s.status === "OPEN" && new Date(s.startsAt).getTime() > Date.now() &&
                    (confirmId === s.id ? (
                      <span className="confirm">
                        Remove this slot?{" "}
                        <button onClick={() => confirmRemove(s.id)} disabled={removingId === s.id}>
                          {removingId === s.id ? "Removing..." : "Yes, remove"}
                        </button>{" "}
                        <button className="secondary" onClick={() => setConfirmId(null)}>
                          No
                        </button>
                      </span>
                    ) : (
                      <button className="secondary" onClick={() => setConfirmId(s.id)}>
                        Remove
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
