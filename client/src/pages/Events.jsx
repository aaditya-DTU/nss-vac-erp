import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "../context/PageTitleContext";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Plus, X, Copy, QrCode, CircleDot, CircleOff, Pencil, Crosshair, MapPin, UserCheck, Search, Check } from "lucide-react";
import Ledger from "../components/ledger/Ledger";
import LedgerSummaryModal from "../components/ledger/LedgerSummaryModal";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  startTime: "",
  endTime: "",
  hoursWorth: 4,
  pointsWorth: 20,
  venueLat: "",
  venueLng: "",
  checkinRadiusMeters: 75,
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

  // Past-events ledger: once an event's endTime has passed it moves out of
  // the live grid and down into the ledger; clicking an entry there pops
  // an overall summary (attendance list for admins, personal status for
  // students).
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Admin fallback for marking attendance when a student can't check in
  // themselves (broken GPS, attendance window closed, etc). No geofence
  // or window check applies here — see manualCheckIn on the server.
  const [manualEvent, setManualEvent] = useState(null); // event currently targeted
  const [manualAttendance, setManualAttendance] = useState([]); // who's already marked present
  const [manualLoading, setManualLoading] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [markingStudentId, setMarkingStudentId] = useState(null);

  const load = () => api.get("/events").then((r) => setEvents(r.data.events));
  useEffect(() => {
    load();
  }, []);

  const openEventLedgerSummary = async (item) => {
    const ev = events.find((e) => e._id === item.id);
    if (!ev) return;
    setLedgerOpen(true);
    setLedgerLoading(true);
    setLedgerData({ event: ev });
    try {
      if (user.role === "admin") {
        const { data } = await api.get(`/events/${ev._id}/attendance`);
        setLedgerData({ event: ev, attendance: data.attendance });
      } else {
        // Students don't have access to the full attendance roster — show
        // them their own registration status instead.
        setLedgerData({ event: ev, attendance: null });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load summary");
    } finally {
      setLedgerLoading(false);
    }
  };

  // Admin-only: pulls the full attendance workbook (who attended, when,
  // method, plus registered-but-no-show) for the event currently open in
  // the past-events summary modal.
  const downloadEventReport = async () => {
    const ev = ledgerData?.event;
    if (!ev) return;
    setDownloadingReport(true);
    try {
      const res = await api.get(`/events/${ev._id}/attendance/report`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ev.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}-attendance-report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not generate report");
    } finally {
      setDownloadingReport(false);
    }
  };

  const register = async (id) => {
    await api.post(`/events/${id}/register`);
    toast.success("Registered for event");
    load();
  };

  const openManualAttendance = async (event) => {
    setManualEvent(event);
    setStudentQuery("");
    setStudentResults([]);
    setManualLoading(true);
    try {
      const { data } = await api.get(`/events/${event._id}/attendance`);
      setManualAttendance(data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load attendance");
    } finally {
      setManualLoading(false);
    }
  };

  const closeManualAttendance = () => {
    setManualEvent(null);
    setManualAttendance([]);
    setStudentQuery("");
    setStudentResults([]);
  };

  useEffect(() => {
    if (!manualEvent) return;
    const q = studentQuery.trim();
    setSearchingStudents(true);
    const timer = setTimeout(() => {
      api
        .get("/users", { params: { role: "student", search: q } })
        .then((r) => setStudentResults(r.data.users))
        .catch(() => toast.error("Could not search students"))
        .finally(() => setSearchingStudents(false));
    }, 250); // small debounce so we're not hitting the API on every keystroke
    return () => clearTimeout(timer);
  }, [studentQuery, manualEvent]);

  const alreadyMarked = (studentId) => manualAttendance.some((a) => a.student?._id === studentId);

  // Deliberately sends no location — this endpoint doesn't check it. An
  // admin can mark a student present from anywhere, not just the venue.
  const markPresent = async (student) => {
    setMarkingStudentId(student._id);
    try {
      const { data } = await api.post(`/events/${manualEvent._id}/attendance/manual`, {
        studentId: student._id,
      });
      setManualAttendance((prev) => [...prev, data.attendance]);
      toast.success(`Marked ${student.name} present`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not mark attendance");
    } finally {
      setMarkingStudentId(null);
    }
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

  const [locatingCheckin, setLocatingCheckin] = useState(false);

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Your browser doesn't support location access, which this event requires for check-in."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === 1) {
            reject(new Error("Location access was denied. Please allow location access in your browser settings and try again."));
          } else {
            reject(new Error("Could not get your location. Make sure GPS/location services are on and try again."));
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const checkIn = async (e) => {
    e.preventDefault();
    setLocatingCheckin(true);
    let coords;
    try {
      coords = await getLocation();
    } catch (err) {
      setLocatingCheckin(false);
      toast.error(err.message);
      return;
    }
    setLocatingCheckin(false);

    try {
      await api.post(`/events/${activeEvent._id}/attendance/checkin`, {
        code: checkinCode.trim(),
        lat: coords.lat,
        lng: coords.lng,
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
      venueLat: ev.venueLat ?? "",
      venueLng: ev.venueLng ?? "",
      checkinRadiusMeters: ev.checkinRadiusMeters ?? 75,
    });
    setShowCreateForm(true);
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
  };

  const [locating, setLocating] = useState(false);

  // Admin taps this while standing at (or near) the venue to fill in
  // venueLat/venueLng automatically instead of hunting down coordinates
  // manually. They can still edit the fields by hand afterwards.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          venueLat: pos.coords.latitude.toFixed(6),
          venueLng: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        toast.success("Venue location set to your current position");
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === 1 ? "Location permission denied." : "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handles both creating a brand-new event and saving edits to an
  // existing one, based on whether editingId is set.
  const saveEvent = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      hoursWorth: Number(form.hoursWorth),
      pointsWorth: Number(form.pointsWorth),
      venueLat: form.venueLat === "" ? null : Number(form.venueLat),
      venueLng: form.venueLng === "" ? null : Number(form.venueLng),
      checkinRadiusMeters: Number(form.checkinRadiusMeters) || 75,
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

  const now = new Date();
  const liveEvents = events.filter((ev) => new Date(ev.endTime) >= now);
  const pastEvents = events.filter((ev) => new Date(ev.endTime) < now);

  const ledgerItems = pastEvents
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    .map((ev) => ({
      id: ev._id,
      title: ev.title,
      meta: `${format(new Date(ev.startTime), "MMM d, yyyy")} · ${ev.location || "No location"}`,
      badge:
        user.role === "student"
          ? ev.registeredStudents?.includes(user._id)
            ? "Registered"
            : undefined
          : `${ev.registeredStudents?.length || 0} registered`,
      badgeClass:
        user.role === "student" ? "bg-green-50 text-green-700" : "bg-primary-50 text-primary-700",
    }));

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
        {liveEvents.map((ev) => (
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

            {user.role === "admin" && (ev.venueLat == null || ev.venueLng == null) && (
              <p className="text-xs mb-3 text-amber-600 flex items-center gap-1">
                <MapPin size={12} /> No venue location set — check-in won't be GPS-verified
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
                <button
                  className="btn-secondary w-full text-sm flex items-center justify-center gap-1"
                  onClick={() => openManualAttendance(ev)}
                >
                  <UserCheck size={14} /> Mark attendance manually
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
        {liveEvents.length === 0 && <p className="text-ink/50">No upcoming events.</p>}
      </div>

      <Ledger title="Past events" items={ledgerItems} onItemClick={openEventLedgerSummary} />

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

            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-ink/70">
                Venue GPS coordinates
              </label>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="text-xs text-primary-600 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <Crosshair size={12} /> {locating ? "Locating…" : "Use my current location"}
              </button>
            </div>
            <p className="text-xs text-ink/40 mb-2">
              Required for check-in to verify students are actually at the venue. Stand at (or near) the venue and
              tap "Use my current location", or enter coordinates manually.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                className="input"
                value={form.venueLat}
                onChange={(e) => setForm({ ...form, venueLat: e.target.value })}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                className="input"
                value={form.venueLng}
                onChange={(e) => setForm({ ...form, venueLng: e.target.value })}
              />
              <input
                type="number"
                placeholder="Radius (m)"
                className="input"
                value={form.checkinRadiusMeters}
                onChange={(e) => setForm({ ...form, checkinRadiusMeters: e.target.value })}
              />
            </div>

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
            <p className="text-xs text-ink/50 mb-3 flex items-center gap-1">
              <MapPin size={12} className="text-primary-500 shrink-0" />
              You'll be asked for location access — check-in only works if you're physically at the venue.
            </p>
            <input
              className="input mb-3 font-mono text-sm"
              value={checkinCode}
              onChange={(e) => setCheckinCode(e.target.value)}
              placeholder="Event ID"
            />
            <button className="btn-primary w-full" disabled={locatingCheckin}>
              {locatingCheckin ? "Getting your location…" : "Check in"}
            </button>
          </form>
        </div>
      )}

      <LedgerSummaryModal
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setLedgerData(null);
        }}
        title={ledgerData?.event ? `${ledgerData.event.title} — summary` : ""}
        subtitle={
          ledgerData?.event
            ? `${format(new Date(ledgerData.event.startTime), "MMM d, yyyy · p")} – ${format(new Date(ledgerData.event.endTime), "p")} · ${ledgerData.event.location || "No location"}`
            : ""
        }
        loading={ledgerLoading}
        onDownload={user.role === "admin" ? downloadEventReport : undefined}
        downloading={downloadingReport}
        extraActions={
          user.role === "admin" && ledgerData?.event ? (
            <button
              onClick={() => openManualAttendance(ledgerData.event)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <UserCheck size={14} /> Mark attendance manually
            </button>
          ) : undefined
        }
        stats={
          ledgerData?.event
            ? user.role === "admin"
              ? [
                  { label: "Registered", value: ledgerData.event.registeredStudents?.length || 0 },
                  { label: "Attended", value: ledgerData.attendance?.length || 0 },
                ]
              : [
                  { label: "Hours", value: ledgerData.event.hoursWorth },
                  { label: "Points", value: ledgerData.event.pointsWorth },
                ]
            : []
        }
        rows={
          user.role === "admin"
            ? (ledgerData?.attendance || []).map((a) => ({
                id: a._id,
                primary: `${a.student?.name || "Unknown"} · ${a.student?.rollNo || "—"}`,
                secondary: `${a.student?.branch || ""} ${a.student?.year ? `· Year ${a.student.year}` : ""}`.trim(),
                badge: a.method,
                badgeClass: a.method === "manual" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700",
                note: `Checked in ${format(new Date(a.checkedInAt), "MMM d, p")}`,
              }))
            : ledgerData?.event
              ? [
                  {
                    id: "me",
                    primary: user.name,
                    secondary: ledgerData.event.registeredStudents?.includes(user._id)
                      ? "You registered for this event"
                      : "You did not register for this event",
                    badge: ledgerData.event.registeredStudents?.includes(user._id) ? "Registered" : "Not registered",
                    badgeClass: ledgerData.event.registeredStudents?.includes(user._id)
                      ? "bg-green-100 text-green-700"
                      : "bg-ink/5 text-ink/50",
                  },
                ]
              : []
        }
        emptyText="No one checked in for this event."
      />

      {/* Admin fallback: mark a student present without any QR/GPS
          check — for events where the normal check-in flow failed for
          someone. Works for both live and past events, and from
          anywhere (no geofence applies to admin-marked attendance). */}
      {manualEvent && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4"
          onClick={closeManualAttendance}
        >
          <div
            className="card w-full max-w-md max-h-[85vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeManualAttendance}
              className="absolute right-4 top-4 text-ink/40 hover:text-ink"
            >
              <X size={20} />
            </button>
            <h3 className="font-display text-lg text-primary-900 mb-1 pr-8">
              Mark attendance manually
            </h3>
            <p className="text-xs text-ink/50 mb-4">
              {manualEvent.title} · No location check — you can mark a student present from
              anywhere. Use this when a student can't complete the normal check-in themselves.
            </p>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                autoFocus
                className="input pl-8"
                placeholder="Search by name, roll no, email…"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
            </div>

            {manualLoading ? (
              <p className="text-sm text-ink/50">Loading…</p>
            ) : (
              <ul className="space-y-2">
                {studentResults.map((s) => {
                  const marked = alreadyMarked(s._id);
                  return (
                    <li
                      key={s._id}
                      className="border border-primary-100 rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-ink text-sm truncate">{s.name}</p>
                        <p className="text-xs text-ink/50 truncate">
                          {s.rollNo} · {s.branch} · Y{s.year}
                        </p>
                      </div>
                      <button
                        disabled={marked || markingStudentId === s._id}
                        onClick={() => markPresent(s)}
                        className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                          marked
                            ? "text-green-600 border-green-200 bg-green-50"
                            : "text-primary-600 border-primary-200 hover:bg-primary-50 disabled:opacity-50"
                        }`}
                      >
                        {marked ? (
                          <>
                            <Check size={12} /> Present
                          </>
                        ) : markingStudentId === s._id ? (
                          "Marking…"
                        ) : (
                          "Mark present"
                        )}
                      </button>
                    </li>
                  );
                })}
                {!searchingStudents && studentResults.length === 0 && (
                  <p className="text-xs text-ink/40 text-center py-2">
                    {studentQuery.trim() ? "No students found." : "Type to search students."}
                  </p>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}