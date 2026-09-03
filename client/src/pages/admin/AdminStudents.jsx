import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "../../context/PageTitleContext";
import api from "../../api/axios";
import { format } from "date-fns";
import {
  Award,
  FileSpreadsheet,
  Activity,
  X,
  MapPin,
  CheckCircle2,
  Pencil,
  Power,
  Save,
  AlertTriangle,
  UserPlus,
} from "lucide-react";

const emptyNewStudent = {
  name: "",
  email: "",
  password: "",
  rollNo: "",
  branch: "",
  year: "",
  section: "",
};

export default function AdminStudents() {
  usePageTitle("Students");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  // 'active' (default): verified + active only. 'all': everyone, with a
  // status badge on rows that are unverified or deactivated — the sanity-
  // check view for spotting stuck signups or accidentally-deactivated
  // accounts without permanently hiding them.
  const [showAll, setShowAll] = useState(false);

  // Combined admin panel — clicking a row opens this. Shows editable
  // profile fields, the student's full participation/activity history,
  // and a single deactivate/activate button (kept out of the table row
  // to avoid cluttering the strip).
  const [panelFor, setPanelFor] = useState(null); // student being viewed/edited
  const [activity, setActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // panel opens read-only; this flips on "Edit details"
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Manual "Add student" modal — admin-provisioned accounts skip OTP
  // verification entirely (see createUser on the backend, isVerified: true
  // is set there), so this immediately gives the student a working login.
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState(emptyNewStudent);
  const [creating, setCreating] = useState(false);

  const createStudent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/users", {
        ...newStudent,
        year: newStudent.year ? Number(newStudent.year) : undefined,
        role: "student",
      });
      toast.success(`${newStudent.name} added`);
      setShowAddModal(false);
      setNewStudent(emptyNewStudent);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add student");
    } finally {
      setCreating(false);
    }
  };

  const load = () =>
    api
      .get("/users", {
        params: showAll
          ? { role: "student", search }
          : { role: "student", search, isVerified: true, isActive: true },
      })
      .then((r) => setStudents(r.data.users));
  useEffect(() => {
    load();
  }, [search, showAll]);

  const issueCertificate = async (studentId) => {
    try {
      await api.post(`/certificates/issue/${studentId}`);
      toast.success("Certificate issued");
    } catch (err) {
      toast.error(err.response?.data?.message || "Not eligible yet");
    }
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/reports/nss-summary", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `nss-vac-report-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not generate report");
    } finally {
      setExporting(false);
    }
  };

  const openPanel = async (student) => {
    setPanelFor(student);
    setIsEditing(false);
    setEditForm({
      name: student.name || "",
      rollNo: student.rollNo || "",
      branch: student.branch || "",
      year: student.year || "",
      email: student.email || "",
      isVerified: Boolean(student.isVerified),
    });
    setLoadingActivity(true);
    try {
      const { data } = await api.get(`/users/${student._id}/activity`);
      setActivity(data);
    } catch {
      toast.error("Could not load activity");
    } finally {
      setLoadingActivity(false);
    }
  };

  const closePanel = () => {
    setPanelFor(null);
    setActivity(null);
    setEditForm(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/users/${panelFor._id}`, editForm);
      toast.success("Student updated");
      setStudents((prev) =>
        prev.map((s) => (s._id === panelFor._id ? { ...s, ...data.user } : s)),
      );
      setPanelFor((prev) => ({ ...prev, ...data.user }));
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    // Revert any unsaved changes back to the student's current values.
    setEditForm({
      name: panelFor.name || "",
      rollNo: panelFor.rollNo || "",
      branch: panelFor.branch || "",
      year: panelFor.year || "",
      email: panelFor.email || "",
      isVerified: Boolean(panelFor.isVerified),
    });
    setIsEditing(false);
  };

  const toggleStatus = async (student) => {
    const next = !student.isActive;
    const label = next ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${label} ${student.name}?`))
      return;
    setTogglingStatus(true);
    try {
      const { data } = await api.patch(`/users/${student._id}`, {
        isActive: next,
      });
      toast.success(`Student ${next ? "activated" : "deactivated"}`);
      setStudents((prev) =>
        prev.map((s) =>
          s._id === student._id ? { ...s, isActive: data.user.isActive } : s,
        ),
      );
      setPanelFor((prev) =>
        prev && prev._id === student._id
          ? { ...prev, isActive: data.user.isActive }
          : prev,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 justify-between mb-3">
        <input
          className="input sm:w-72"
          placeholder="Search by name, roll no, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={16} /> Add student
          </button>
          <button
            onClick={exportReport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2"
          >
            <FileSpreadsheet size={16} />{" "}
            {exporting ? "Generating…" : "Export NSS report"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setShowAll(false)}
          className={`text-xs px-3 py-1.5 rounded-lg border ${
            !showAll
              ? "bg-primary-600 text-white border-primary-600"
              : "text-ink/50 border-primary-100 hover:bg-primary-50"
          }`}
        >
          Active students
        </button>
        <button
          onClick={() => setShowAll(true)}
          className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
            showAll
              ? "bg-primary-600 text-white border-primary-600"
              : "text-ink/50 border-primary-100 hover:bg-primary-50"
          }`}
        >
          <AlertTriangle size={12} /> All (incl. unverified/inactive)
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-primary-100">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Roll No.</th>
              <th className="py-2 pr-4">Branch/Year</th>
              <th className="py-2 pr-4">Hours</th>
              <th className="py-2 pr-4">Points</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s._id}
                onClick={() => openPanel(s)}
                className="border-b border-primary-50 last:border-0 cursor-pointer hover:bg-primary-50/50 transition-colors"
              >
                <td className="py-2.5 pr-4 font-medium">
                  <div className="flex items-center gap-2">
                    {s.name}
                    {!s.isVerified && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        Unverified
                      </span>
                    )}
                    {!s.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-4 text-ink/60">{s.rollNo}</td>
                <td className="py-2.5 pr-4 text-ink/60">
                  {s.branch} · Y{s.year}
                </td>
                <td className="py-2.5 pr-4">{s.totalHours}</td>
                <td className="py-2.5 pr-4">{s.totalPoints}</td>
                <td
                  className="py-2.5 pr-4 flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openPanel(s)}
                    className="text-primary-600 hover:underline flex items-center gap-1 text-xs"
                  >
                    <Activity size={14} /> Attendance
                  </button>
                  <button
                    onClick={() => issueCertificate(s._id)}
                    className="text-primary-600 hover:underline flex items-center gap-1 text-xs"
                  >
                    <Award size={14} /> Certificate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <p className="text-ink/50 text-sm py-4 text-center">
            No students found.
          </p>
        )}
      </div>

      {/* Combined edit + participation panel */}
      {panelFor && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4"
          onClick={closePanel}
        >
          <div
            className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePanel}
              className="absolute right-4 top-4 text-ink/40 hover:text-ink"
            >
              <X size={20} />
            </button>

            <div className="flex items-start justify-between gap-3 mb-1 pr-8">
              <h3 className="font-display text-xl text-primary-900 min-w-0 break-words">
                {panelFor.name}
              </h3>
              <button
                onClick={() => toggleStatus(panelFor)}
                disabled={togglingStatus}
                className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                  panelFor.isActive
                    ? "text-red-600 border-red-200 hover:bg-red-50"
                    : "text-green-600 border-green-200 hover:bg-green-50"
                }`}
              >
                <Power size={14} />{" "}
                {panelFor.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
            <p className="text-xs text-ink/50 mb-4">
              {panelFor.rollNo} · {panelFor.branch} · Y{panelFor.year}
            </p>

            {/* Details block — read-only by default. "Edit details" reveals
                the editable form below; nothing is editable until the admin
                explicitly opts in. */}
            <div className="mb-6 border border-primary-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  {isEditing ? (
                    <>
                      <Pencil size={14} /> Edit profile
                    </>
                  ) : (
                    "Student details"
                  )}
                </p>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                  >
                    <Pencil size={12} /> Edit details
                  </button>
                )}
              </div>

              {!isEditing && editForm && (
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-ink/50">Name</span>
                  <span className="text-ink font-medium">
                    {editForm.name || "—"}
                  </span>
                  <span className="text-ink/50">Roll No.</span>
                  <span className="text-ink font-medium">
                    {editForm.rollNo || "—"}
                  </span>
                  <span className="text-ink/50">Branch</span>
                  <span className="text-ink font-medium">
                    {editForm.branch || "—"}
                  </span>
                  <span className="text-ink/50">Year</span>
                  <span className="text-ink font-medium">
                    {editForm.year || "—"}
                  </span>
                  <span className="text-ink/50">Email</span>
                  <span className="text-ink font-medium truncate">
                    {editForm.email || "—"}
                  </span>
                  <span className="text-ink/50">Verification</span>
                  <span className="text-ink font-medium">
                    {editForm.isVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
              )}

              {isEditing && editForm && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="input"
                      placeholder="Name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                    />
                    <input
                      className="input"
                      placeholder="Roll No."
                      value={editForm.rollNo}
                      onChange={(e) =>
                        setEditForm({ ...editForm, rollNo: e.target.value })
                      }
                    />
                    <input
                      className="input"
                      placeholder="Branch"
                      value={editForm.branch}
                      onChange={(e) =>
                        setEditForm({ ...editForm, branch: e.target.value })
                      }
                    />
                    <input
                      className="input"
                      placeholder="Year"
                      value={editForm.year}
                      onChange={(e) =>
                        setEditForm({ ...editForm, year: e.target.value })
                      }
                    />
                    <input
                      className="input col-span-2"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                    <label className="col-span-2 flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isVerified}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            isVerified: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-primary-600"
                      />
                      Mark student as verified
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2 text-xs"
                    >
                      <Save size={14} /> {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {loadingActivity && (
              <p className="text-sm text-ink/50">Loading activity…</p>
            )}

            {activity && (
              <>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">
                      {activity.student.totalHours}
                    </p>
                    <p className="text-xs text-ink/50">Hours</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">
                      {activity.student.totalPoints}
                    </p>
                    <p className="text-xs text-ink/50">Points</p>
                  </div>
                  <div className="bg-primary-50 rounded-xl p-3 text-center">
                    <p className="text-xl font-semibold text-primary-800">
                      {activity.attendance.length}
                    </p>
                    <p className="text-xs text-ink/50">Events attended</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
                  <Activity size={14} /> Event attendance
                </p>
                <ul className="space-y-2 mb-6">
                  {activity.attendance.map((a) => (
                    <li
                      key={a._id}
                      className="flex items-center justify-between text-sm border-b border-primary-50 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary-500" />
                        <span>{a.event?.title || "Deleted event"}</span>
                      </div>
                      <span className="text-xs text-ink/50">
                        {format(new Date(a.checkedInAt), "MMM d, p")} ·{" "}
                        {a.method}
                      </span>
                    </li>
                  ))}
                  {activity.attendance.length === 0 && (
                    <p className="text-xs text-ink/40">
                      No event check-ins yet.
                    </p>
                  )}
                </ul>

                <p className="text-sm font-semibold text-ink mb-2">
                  Approved tasks
                </p>
                <ul className="space-y-2">
                  {activity.submissions.map((s) => (
                    <li
                      key={s._id}
                      className="flex items-center justify-between text-sm border-b border-primary-50 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-600" />
                        <span>{s.task?.title || "Deleted task"}</span>
                      </div>
                      <span className="text-xs text-ink/50">
                        {format(new Date(s.reviewedAt), "MMM d, yyyy")}
                      </span>
                    </li>
                  ))}
                  {activity.submissions.length === 0 && (
                    <p className="text-xs text-ink/40">
                      No approved tasks yet.
                    </p>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={createStudent}
            className="card w-full max-w-md max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-ink/40 hover:text-ink"
            >
              <X size={20} />
            </button>
            <h3 className="font-display text-lg text-primary-900 mb-1 pr-8">
              Add student
            </h3>
            <p className="text-xs text-ink/50 mb-4">
              Creates a login directly — no email verification step, the student
              can sign in immediately with the email and password you set here.
            </p>

            <label className="text-sm font-medium text-ink/70">Name</label>
            <input
              required
              className="input mt-1 mb-3"
              value={newStudent.name}
              onChange={(e) =>
                setNewStudent({ ...newStudent, name: e.target.value })
              }
            />

            <label className="text-sm font-medium text-ink/70">Email</label>
            <input
              required
              type="email"
              className="input mt-1 mb-3"
              placeholder="student@dtu.ac.in"
              value={newStudent.email}
              onChange={(e) =>
                setNewStudent({ ...newStudent, email: e.target.value })
              }
            />

            <label className="text-sm font-medium text-ink/70">Password</label>
            <input
              required
              type="text"
              minLength={6}
              className="input mt-1 mb-3"
              placeholder="Set an initial password"
              value={newStudent.password}
              onChange={(e) =>
                setNewStudent({ ...newStudent, password: e.target.value })
              }
            />

            <label className="text-sm font-medium text-ink/70">
              Roll number
            </label>
            <input
              className="input mt-1 mb-3"
              placeholder="2K23/MC/01"
              value={newStudent.rollNo}
              onChange={(e) =>
                setNewStudent({ ...newStudent, rollNo: e.target.value })
              }
            />

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-sm font-medium text-ink/70">
                  Branch
                </label>
                <input
                  className="input mt-1"
                  value={newStudent.branch}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, branch: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">Year</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  className="input mt-1"
                  value={newStudent.year}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, year: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink/70">
                  Section
                </label>
                <input
                  className="input mt-1"
                  value={newStudent.section}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, section: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full"
            >
              {creating ? "Adding…" : "Add student"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
