import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "../context/PageTitleContext";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Plus, X, Copy, QrCode, CircleDot, CircleOff, Pencil } from "lucide-react";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  startTime: "",
  endTime: "",
  hoursWorth: 4,
  pointsWorth: 20,
};

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in LOCAL time — using
// toISOString() here would shift the displayed time by the timezone
// offset, showing the admin the wrong time even though the stored value
// is technically correct.
const toDatetimeLocal = (dateStr) => {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Events() {
  usePageTitle("Events");
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [checkinCode, setCheckinCode] = useState("");
  const [activeEvent, setActiveEvent] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = creating a new event, an id = editing that event
  // The ONE QR/ID per event — shown right after creation, or on demand via
  // "Show join QR". This is the single identifier used for both joining
  // an event and checking in to it; there is no separate rotating code.
  const [createdEvent, setCreatedEvent] = useState(null);

  const load = () => api.get("/events").then((r) => setEvents(r.data.events));
  useEffect(() => {
    load();
  }, []);

  const register = async (id) => {
    await api.post(`/events/${id}/register`);
    toast.success("Registered for event");
    load();
  };

  // Just flips the manual attendance gate — no QR/code involved here
  // anymore, since the event's own permanent ID (shown via "Show join QR")
  // is what students already use to check in.
  const toggleAttendance = async (event) => {
    const endpoint = event.isAttendanceOpen ? "close" : "open";
    await api.post(`/events/${event._id}/attendance/${endpoint}`);
    toast.success(
      event.isAttendanceOpen ? "Attendance closed" : "Attendance opened",
    );
    load();
  };

  const checkIn = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/events/${activeEvent._id}/attendance/checkin`, {
        code: checkinCode.trim(),
      });
      toast.success("Checked in! Hours credited.");
      setActiveEvent(null);
      setCheckinCode("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Check-in failed");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowCreateForm(true);
  };

  const openEdit = (ev) => {
    setEditingId(ev._id);
    setForm({
      title: ev.title,
      description: ev.description || "",
      location: ev.location || "",
      startTime: toDatetimeLocal(ev.startTime),
      endTime: toDatetimeLocal(ev.endTime),
      hoursWorth: ev.hoursWorth,
      pointsWorth: ev.pointsWorth,
    });
    setShowCreateForm(true);
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
  };

  // Handles both creating a brand-new event and saving edits to an
  // existing one, based on whether editingId is set.
  const saveEvent = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      hoursWorth: Number(form.hoursWorth),
      pointsWorth: Number(form.pointsWorth),
    };
    try {
      if (editingId) {
        await api.patch(`/events/${editingId}`, payload);
        toast.success("Event updated");
      } else {
        const { data } = await api.post("/events", payload);
        toast.success("Event created");
        setCreatedEvent(data.event); // pop the ID + QR modal — only for brand-new events
      }
      closeForm();
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save event");
    }
  };

  const joinUrl = (eventId) =>
    `${window.location.origin}/events/${eventId}/join`;

  const copyJoinLink = (eventId) => {
    navigator.clipboard.writeText(joinUrl(eventId));
    toast.success("Join link copied");
  };

  return (
    <>
      {user.role === "admin" && (
        <div className="flex justify-end mb-4">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={openCreate}
          >
            <Plus size={18} /> New event
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {events.map((ev) => (
          <div key={ev._id} className="card">
            <p className="text-xs text-ink/50 mb-1">
              {format(new Date(ev.startTime), "MMM d, yyyy · p")}
            </p>
            <h3 className="font-semibold text-ink mb-1">{ev.title}</h3>
            <p className="text-sm text-ink/60 mb-3">{ev.location}</p>
            <p className="text-xs text-ink/50 mb-1">
              {ev.hoursWorth} hrs · {ev.pointsWorth} pts
            </p>

            {/* ID is admin-only — students should only ever see it by
                actually reading the projected join QR at the venue, not by
                browsing their own event list, since it doubles as the
                check-in credential. */}
            {user.role === "admin" && (
              <p className="text-[10px] text-ink/30 mb-2 font-mono">
                ID: {ev._id}
              </p>
            )}

            {user.role === "admin" && (
              <p
                className={`text-xs mb-3 flex items-center gap-1 ${ev.isAttendanceOpen ? "text-green-600" : "text-ink/40"}`}
              >
                {ev.isAttendanceOpen ? (
                  <CircleDot size={12} />
                ) : (
                  <CircleOff size={12} />
                )}
                Attendance {ev.isAttendanceOpen ? "open" : "closed"}
              </p>
            )}

            {user.role === "admin" ? (
              <div className="space-y-2">
                <button
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-1"
                  onClick={() => openEdit(ev)}
                >
                  <Pencil size={14} /> Edit event
                </button>
                <button
                  className={`btn-secondary w-full text-sm ${ev.isAttendanceOpen ? "text-red-500" : ""}`}
                  onClick={() => toggleAttendance(ev)}
                >
                  {ev.isAttendanceOpen ? "Close attendance" : "Open attendance"}
                </button>
                <button
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-1"
                  onClick={() => setCreatedEvent(ev)}
                >
                  <QrCode size={14} /> Show join QR
                </button>
              </div>
            ) : (
              <button
                className="btn-secondary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={ev.registeredStudents?.includes(user._id)}
                onClick={() => register(ev._id)}
              >
                {ev.registeredStudents?.includes(user._id)
                  ? "Registered ✓"
                  : "Register"}
              </button>
            )}
            {user.role === "student" && (
              <button
                className="btn-primary w-full text-sm mt-2"
                onClick={() => setActiveEvent(ev)}
              >
                Enter attendance code
              </button>
            )}
          </div>
        ))}
        {events.length === 0 && <p className="text-ink/50">No events yet.</p>}
      </div>

      {/* Create/Edit event modal (admin) — same form serves both, based on
          whether editingId is set. */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4">
          <form
            onSubmit={saveEvent}
            className="card w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
          >
            <button
              type="button"
              onClick={closeForm}
              className="absolute right-4 top-4 text-ink/40 hover:text-ink"
            >
              <X size={20} />
            </button>
            <h3 className="font-display text-xl text-primary-900 mb-4">
              {editingId ? "Edit event" : "Create event"}
            </h3>

            <label className="text-sm font-medium text-ink/70">Title</label>
            <input
              required
              className="input mt-1 mb-3"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <label className="text-sm font-medium text-ink/70">
              Description
            </label>
            <textarea
              rows={3}
              className="input mt-1 mb-3"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />

            <label className="text-sm font-medium text-ink/70">Location</label>
            <input
              className="input mt-1 mb-3"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm font-medium text-ink/70">
                  Start time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input mt-1"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">
                  End time
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input mt-1"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">
                  Hours worth
                </label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.hoursWorth}
                  onChange={(e) =>
                    setForm({ ...form, hoursWorth: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">
                  Points worth
                </label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.pointsWorth}
                  onChange={(e) =>
                    setForm({ ...form, pointsWorth: e.target.value })
                  }
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full mt-2">
              {editingId ? "Save changes" : "Create event"}
            </button>
          </form>
        </div>
      )}

      {/* Event ID + "scan to join" QR — the ONE QR for this event. Used
          both to join and, once attendance is opened, to check in: the
          student reads the ID here and types it into the attendance-code
          field below. */}
      {createdEvent && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4"
          onClick={() => setCreatedEvent(null)}
        >
          <div
            className="card w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg text-primary-900 mb-1">
              {createdEvent.title}
            </h3>
            <p className="text-xs text-ink/50 mb-4 font-mono break-all">
              ID: {createdEvent._id}
            </p>

            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={joinUrl(createdEvent._id)}
                size={200}
                bgColor="#ffffff"
                fgColor="#0D47A1"
              />
            </div>
            <p className="text-xs text-ink/50 mb-4">
              This is the only QR/ID for this event — students scan it to join,
              and use the same ID to check in once you've opened attendance.
              Display it on a projector or print it for the venue.
            </p>

            <button
              className="btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => copyJoinLink(createdEvent._id)}
            >
              <Copy size={14} /> Copy join link
            </button>
          </div>
        </div>
      )}

      {activeEvent && user.role === "student" && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-30"
          onClick={() => setActiveEvent(null)}
        >
          <form
            onSubmit={checkIn}
            className="card w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium mb-1">
              Enter the Event ID shown on the coordinator's screen or QR
            </p>
            <p className="text-xs text-ink/50 mb-3">
              {activeEvent.title} ·{" "}
              {format(new Date(activeEvent.startTime), "MMM d, p")} –{" "}
              {format(new Date(activeEvent.endTime), "p")}. Attendance only
              works once your coordinator has opened it on-site, even during
              this window.
            </p>
            <input
              className="input mb-3 font-mono text-sm"
              value={checkinCode}
              onChange={(e) => setCheckinCode(e.target.value)}
              placeholder="Event ID"
            />
            <button className="btn-primary w-full">Check in</button>
          </form>
        </div>
      )}
    </>
  );
}