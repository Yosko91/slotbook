import { Fragment, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, bookSlot, getAvailableSlots, getScheduleTutors, getSchedules } from "../api";
import type { AvailableSlot, Schedule, SlotFilter } from "../api";
import { fmtDate, fmtTime } from "../time";

export default function FindSession() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [error, setError] = useState("");
  const [tutors, setTutors] = useState<{ id: number; name: string }[]>([]);
  const [filter, setFilter] = useState<SlotFilter>({});
  const hasFilter = Boolean(filter.from || filter.to || filter.tutorId);
  // only the answer of the last request is shown (filters can change fast)
  const lastRequest = useRef(0);

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

  function loadSlots(id: number, f: SlotFilter = filter) {
    const requestId = ++lastRequest.current;
    setSlots(null);
    getAvailableSlots(id, f)
      .then((list) => {
        if (requestId === lastRequest.current) setSlots(list);
      })
      .catch((e) => {
        if (requestId !== lastRequest.current) return;
        setSlots([]);
        setError(e.message);
      });
  }

  // a new subject: tutors of this subject, filters reset
  useEffect(() => {
    if (!scheduleId) return;
    setFilter({});
    setTutors([]);
    getScheduleTutors(scheduleId)
      .then(setTutors)
      .catch((e) => setError(e.message));
  }, [scheduleId]);

  useEffect(() => {
    if (!scheduleId) return;
    setError("");
    loadSlots(scheduleId, filter);
  }, [scheduleId, filter]);

  function changeFilter(change: SlotFilter) {
    setSelected(null);
    setFilter((f) => ({ ...f, ...change }));
  }

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

      <div className="row-form filters">
        <label>
          From
          <input type="date" value={filter.from ?? ""} onChange={(e) => changeFilter({ from: e.target.value || undefined })} />
        </label>
        <label>
          To
          <input type="date" value={filter.to ?? ""} onChange={(e) => changeFilter({ to: e.target.value || undefined })} />
        </label>
        <label>
          Tutor
          <select
            value={filter.tutorId ?? ""}
            onChange={(e) => changeFilter({ tutorId: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">All tutors</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div style={{ alignSelf: "center" }}>
          <button type="button" className="secondary" onClick={() => setFilter({})} disabled={!hasFilter}>
            Clear filters
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {!slots ? (
        <p className="loading">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="empty">{hasFilter ? "No available slot for these filters." : "No available slot for this schedule."}</p>
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
