const crypto = require("crypto");
const QRCode = require("qrcode");
const ExcelJS = require("exceljs");
const Event = require("../models/Event");
const Attendance = require("../models/Attendance");
const { awardCredit, notify } = require("../utils/ledger");
const { distanceMeters } = require("../utils/geo");

exports.createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const allowed = [
      "title",
      "description",
      "location",
      "startTime",
      "endTime",
      "hoursWorth",
      "pointsWorth",
      "venueLat",
      "venueLng",
      "checkinRadiusMeters",
    ];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const event = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.listEvents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const events = await Event.find(query)
      .sort({ startTime: -1 })
      .populate("createdBy", "name");

    // Students need to know, per event, whether THEY have already checked
    // in — otherwise the check-in button has no way to disable itself and
    // a student can keep re-opening the scan/enter-code flow after already
    // being marked present (the actual check-in call would still be
    // rejected by the unique index in checkIn(), but the UI shouldn't even
    // offer it). One query for all events on this page rather than N+1.
    let attendedEventIds = new Set();
    if (req.user.role === "student") {
      const myAttendance = await Attendance.find({
        student: req.user._id,
        event: { $in: events.map((e) => e._id) },
      }).select("event");
      attendedEventIds = new Set(myAttendance.map((a) => String(a.event)));
    }

    const eventsWithStatus = events.map((e) => ({
      ...e.toObject(),
      checkedIn: attendedEventIds.has(String(e._id)),
    }));

    res.json({ success: true, events: eventsWithStatus });
  } catch (err) {
    next(err);
  }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { registeredStudents: req.user._id } },
      { new: true },
    );
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.openAttendance = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isAttendanceOpen: true, status: "ongoing" },
      { new: true },
    );
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

exports.closeAttendance = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { isAttendanceOpen: false, status: "completed" },
      { new: true },
    );
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// Student scans the QR (or the frontend decodes it) and posts the code here.
exports.checkIn = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const { code, lat, lng } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    if (!event.isAttendanceOpen) {
      const now = new Date();
      let hint =
        "Ask your coordinator to open attendance from the Events page.";
      if (now < new Date(event.startTime)) {
        hint =
          "This event hasn't started yet — attendance opens once your coordinator starts it on-site.";
      } else if (now > new Date(event.endTime)) {
        hint = "This event has already ended and attendance is closed.";
      }
      return res
        .status(400)
        .json({
          success: false,
          message: `Attendance isn't open right now. ${hint}`,
        });
    }

    if (code !== String(event._id)) {
      return res.status(400).json({
        success: false,
        message:
          "That ID doesn't match this event. Double-check the ID or QR shown on your coordinator's screen.",
      });
    }

    // GPS gate: the attendance code/QR is still static and shareable, but
    // this stops a remote check-in — someone forwarded the code can't
    // check in from off-site because their device location won't be near
    // venueLat/venueLng. Events created before this feature has no venue
    // coordinates set, so we skip the check for those rather than lock
    // everyone out — but log it so admins know to add coordinates.
    let distance = null;
    if (event.venueLat != null && event.venueLng != null) {
      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({
          success: false,
          message:
            "Location access is required to check in to this event. Please allow location access and try again.",
        });
      }

      distance = distanceMeters(event.venueLat, event.venueLng, lat, lng);
      if (distance > event.checkinRadiusMeters) {
        return res.status(400).json({
          success: false,
          message: `You appear to be ${Math.round(distance)}m from the venue — check-in only works within ${event.checkinRadiusMeters}m. Move closer and try again.`,
        });
      }
    } else {
      console.warn(
        `Event ${event._id} ("${event.title}") has no venue coordinates set — check-in for it is not GPS-verified.`,
      );
    }

    const existing = await Attendance.findOne({
      event: event._id,
      student: req.user._id,
    });
    if (existing) {
      return res
        .status(409)
        .json({
          success: false,
          message: "You have already checked in for this event.",
        });
    }

    const attendance = await Attendance.create({
      event: event._id,
      student: req.user._id,
      method: "qr",
      distanceFromVenueMeters: distance != null ? Math.round(distance) : null,
    });

    await awardCredit({
      studentId: req.user._id,
      source: "event",
      refId: event._id,
      points: event.pointsWorth,
      hours: event.hoursWorth,
      note: `Attended: ${event.title}`,
      io,
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    next(err);
  }
};

// Admin fallback for when a student can't complete the normal QR + GPS
// check-in (broken location permissions, no signal at the venue, the
// coordinator forgot to open the attendance window, etc). Deliberately
// skips BOTH checks that gate the student-facing checkIn flow above:
//   - no isAttendanceOpen requirement — works even if the window was
//     never opened or was already closed
//   - no geofence/distance check at all — an admin marking attendance is
//     not required to be at (or near) the venue themselves
// This is intentional, not an oversight: admin-marked attendance is a
// trusted override, not a re-verified check-in.
exports.manualCheckIn = async (req, res, next) => {
  try {
    const io = req.app.get("io");
    const event = await Event.findById(req.params.id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    const existing = await Attendance.findOne({
      event: event._id,
      student: req.body.studentId,
    });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Attendance already marked." });

    let attendance = await Attendance.create({
      event: event._id,
      student: req.body.studentId,
      method: "manual",
      markedBy: req.user._id,
    });
    attendance = await attendance.populate(
      "student",
      "name rollNo branch year",
    );

    await awardCredit({
      studentId: req.body.studentId,
      source: "event",
      refId: event._id,
      points: event.pointsWorth,
      hours: event.hoursWorth,
      note: `Attended (manual): ${event.title}`,
      awardedBy: req.user._id,
      io,
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    next(err);
  }
};

exports.eventAttendanceList = async (req, res, next) => {
  try {
    const list = await Attendance.find({ event: req.params.id }).populate(
      "student",
      "name rollNo branch year",
    );
    res.json({ success: true, attendance: list });
  } catch (err) {
    next(err);
  }
};

// Admin-facing report for a single past event: who attended, when, how
// (QR vs manual), and — on a second sheet — who registered but never
// checked in, so a coordinator can see the full picture in one file
// instead of cross-referencing the registration list against attendance.
exports.exportEventAttendanceReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "registeredStudents",
      "name rollNo branch year email",
    );
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });

    const attendance = await Attendance.find({ event: event._id })
      .populate("student", "name rollNo branch year email")
      .populate("markedBy", "name")
      .sort({ checkedInAt: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NSS VAC ERP";
    workbook.created = new Date();

    const headerFill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD6E9FF" },
    };

    const attSheet = workbook.addWorksheet("Attendance");
    attSheet.columns = [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Name", key: "name", width: 26 },
      { header: "Roll No.", key: "rollNo", width: 16 },
      { header: "Branch", key: "branch", width: 10 },
      { header: "Year", key: "year", width: 8 },
      { header: "Email", key: "email", width: 28 },
      { header: "Checked In At", key: "checkedInAt", width: 22 },
      { header: "Method", key: "method", width: 10 },
      { header: "Distance from venue (m)", key: "distance", width: 20 },
      { header: "Marked By (if manual)", key: "markedBy", width: 20 },
    ];
    attSheet.getRow(1).font = { bold: true };
    attSheet.getRow(1).fill = headerFill;

    attendance.forEach((a, i) => {
      attSheet.addRow({
        sno: i + 1,
        name: a.student?.name || "Deleted user",
        rollNo: a.student?.rollNo || "",
        branch: a.student?.branch || "",
        year: a.student?.year || "",
        email: a.student?.email || "",
        checkedInAt: a.checkedInAt
          ? new Date(a.checkedInAt).toLocaleString("en-IN")
          : "",
        method: a.method,
        distance: a.distanceFromVenueMeters ?? "",
        markedBy: a.markedBy?.name || "",
      });
    });

    const attendedIds = new Set(attendance.map((a) => String(a.student?._id)));
    const noShows = (event.registeredStudents || []).filter(
      (s) => !attendedIds.has(String(s._id)),
    );

    const noShowSheet = workbook.addWorksheet("Registered - Not Attended");
    noShowSheet.columns = [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Name", key: "name", width: 26 },
      { header: "Roll No.", key: "rollNo", width: 16 },
      { header: "Branch", key: "branch", width: 10 },
      { header: "Year", key: "year", width: 8 },
      { header: "Email", key: "email", width: 28 },
    ];
    noShowSheet.getRow(1).font = { bold: true };
    noShowSheet.getRow(1).fill = headerFill;

    noShows.forEach((s, i) => {
      noShowSheet.addRow({
        sno: i + 1,
        name: s.name,
        rollNo: s.rollNo,
        branch: s.branch,
        year: s.year,
        email: s.email,
      });
    });

    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Field", key: "field", width: 24 },
      { header: "Value", key: "value", width: 40 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = headerFill;
    summarySheet.addRows([
      { field: "Event", value: event.title },
      { field: "Location", value: event.location || "" },
      {
        field: "Start",
        value: new Date(event.startTime).toLocaleString("en-IN"),
      },
      { field: "End", value: new Date(event.endTime).toLocaleString("en-IN") },
      { field: "Hours worth", value: event.hoursWorth },
      { field: "Points worth", value: event.pointsWorth },
      { field: "Registered", value: event.registeredStudents?.length || 0 },
      { field: "Attended", value: attendance.length },
      { field: "No-shows", value: noShows.length },
    ]);

    const safeTitle = event.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle}-attendance-report.xlsx"`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "createdBy",
      "name",
    );
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
};
