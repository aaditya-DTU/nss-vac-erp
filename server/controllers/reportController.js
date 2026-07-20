const ExcelJS = require('exceljs');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Task = require('../models/Task');

// Generates the workbook shape a coordinator actually has to hand up the
// chain to the university / state NSS cell: a per-student summary sheet and
// a category-wise activity summary, both derived live from the ledger-backed
// totals rather than re-tallied by hand at report time.
exports.exportNssReport = async (req, res, next) => {
  try {
    const requiredHours = Number(process.env.REQUIRED_NSS_HOURS || 120);
    const students = await User.find({ role: 'student', isActive: true }).sort({ rollNo: 1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NSS VAC ERP';
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet('Student Summary');
    summarySheet.columns = [
      { header: 'S.No', key: 'sno', width: 6 },
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Roll No.', key: 'rollNo', width: 16 },
      { header: 'Branch', key: 'branch', width: 10 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Total Hours', key: 'hours', width: 12 },
      { header: 'Total Points', key: 'points', width: 12 },
      { header: `Required (${requiredHours}h)`, key: 'required', width: 16 },
      { header: 'Certificate Eligible', key: 'eligible', width: 18 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E9FF' } };

    students.forEach((s, i) => {
      summarySheet.addRow({
        sno: i + 1,
        name: s.name,
        rollNo: s.rollNo,
        branch: s.branch,
        year: s.year,
        hours: s.totalHours,
        points: s.totalPoints,
        required: requiredHours,
        eligible: s.totalHours >= requiredHours ? 'Yes' : 'No',
      });
    });

    const categoryAgg = await Task.aggregate([
      {
        $lookup: {
          from: 'submissions',
          localField: '_id',
          foreignField: 'task',
          as: 'submissions',
        },
      },
      { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: false } },
      { $match: { 'submissions.status': 'approved' } },
      {
        $group: {
          _id: '$category',
          totalStudents: { $addToSet: '$submissions.student' },
          totalHours: { $sum: '$submissions.hoursAwarded' },
          totalActivities: { $sum: 1 },
        },
      },
    ]);

    const categorySheet = workbook.addWorksheet('Category-wise Summary');
    categorySheet.columns = [
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Activities Completed', key: 'activities', width: 20 },
      { header: 'Unique Volunteers', key: 'volunteers', width: 18 },
      { header: 'Total Man-Hours', key: 'hours', width: 18 },
    ];
    categorySheet.getRow(1).font = { bold: true };
    categorySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E9FF' } };

    categoryAgg.forEach((c) => {
      categorySheet.addRow({
        category: c._id.replace('_', ' '),
        activities: c.totalActivities,
        volunteers: c.totalStudents.length,
        hours: c.totalHours,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="nss-vac-report-${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
