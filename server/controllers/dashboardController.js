const User = require("../models/User");
const Task = require("../models/Task");
const Submission = require("../models/Submission");
const Event = require("../models/Event");

exports.adminDashboard = async (req, res, next) => {
  try {
    const [
      totalStudents,
      activeTasks,
      pendingReviews,
      upcomingEvents,
      totalHoursAgg,
    ] = await Promise.all([
      User.countDocuments({ role: "student", isActive: true }),
      Task.countDocuments({ status: "published" }),
      Submission.countDocuments({ status: "pending" }),
      Event.countDocuments({ status: { $in: ["upcoming", "ongoing"] } }),
      User.aggregate([
        { $match: { role: "student" } },
        { $group: { _id: null, sum: { $sum: "$totalHours" } } },
      ]),
    ]);

    const categoryBreakdown = await Task.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalPoints: { $sum: "$points" },
        },
      },
    ]);

    const recentSubmissions = await Submission.find({ status: "pending" })
      .populate("student", "name rollNo")
      .populate("task", "title deadline")
      .sort({ submittedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalStudents,
        activeTasks,
        pendingReviews,
        upcomingEvents,
        totalCommunityHours: totalHoursAgg[0]?.sum || 0,
      },
      categoryBreakdown,
      recentSubmissions,
    });
  } catch (err) {
    next(err);
  }
};

exports.studentDashboard = async (req, res, next) => {
  try {
    const requiredHours = Number(process.env.REQUIRED_NSS_HOURS || 120);
    const [pendingCount, approvedCount, upcomingTasks] = await Promise.all([
      Submission.countDocuments({ student: req.user._id, status: "pending" }),
      Submission.countDocuments({ student: req.user._id, status: "approved" }),
      Task.find({ status: "published", deadline: { $gte: new Date() } })
        .sort({ deadline: 1 })
        .limit(5),
    ]);

    res.json({
      success: true,
      stats: {
        totalHours: req.user.totalHours,
        totalPoints: req.user.totalPoints,
        requiredHours,
        progressPercent: Math.min(
          100,
          Math.round((req.user.totalHours / requiredHours) * 100),
        ),
        pendingSubmissions: pendingCount,
        approvedSubmissions: approvedCount,
        certificateEligible: req.user.totalHours >= requiredHours,
      },
      upcomingTasks,
    });
  } catch (err) {
    next(err);
  }
};

exports.leaderboard = async (req, res, next) => {
  try {
    const { branch, year, page = 1, limit = 20 } = req.query;
    const query = { role: "student", isActive: true };
    if (branch) query.branch = branch;
    if (year) query.year = Number(year);

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      User.find(query)
        .select(
          "name rollNo branch year totalPoints totalHours badges avatarUrl",
        )
        .sort({ totalPoints: -1, _id: 1 }) // tiebreak on _id so ties get a stable, consistent order across pages
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    const ranked = students.map((s, i) => ({
      rank: skip + i + 1,
      ...s.toObject(),
    }));

    // The requesting student's own rank, independent of which page they're
    // viewing — computed as "how many students rank strictly above me" + 1,
    // so it's accurate even if they're ranked #400 and only ever load page 1.
    // Only meaningful for students; admins don't have a totalPoints-based rank.
    let myRank = null;
    if (req.user.role === "student") {
      const me = await User.findById(req.user._id).select(
        "totalPoints branch year isActive",
      );
      if (me && me.isActive) {
        const aheadQuery = { ...query, totalPoints: { $gt: me.totalPoints } };
        const ahead = await User.countDocuments(aheadQuery);
        myRank = { rank: ahead + 1, totalPoints: me.totalPoints };
      }
    }

    res.json({
      success: true,
      leaderboard: ranked,
      total,
      page: Number(page),
      limit: Number(limit),
      hasMore: skip + ranked.length < total,
      myRank,
    });
  } catch (err) {
    next(err);
  }
};
