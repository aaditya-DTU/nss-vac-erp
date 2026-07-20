const cron = require('node-cron');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { notify } = require('../utils/ledger');

// Runs every morning at 8am: for tasks due within the next 24h, nudge every
// assigned student who has not yet submitted. This is the "smart" part that
// keeps a VAC subject with 100+ students from relying on manual follow-up.
function scheduleDeadlineReminders(io) {
  cron.schedule('0 8 * * *', async () => {
    try {
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const tasks = await Task.find({ status: 'published', deadline: { $gte: new Date(), $lte: in24h } });

      for (const task of tasks) {
        const submitted = await Submission.find({ task: task._id }).distinct('student');
        const submittedSet = new Set(submitted.map(String));

        let audience = [];
        if (task.assignedTo.scope === 'all') {
          audience = await User.find({ role: 'student', isActive: true }).select('_id');
        } else if (task.assignedTo.scope === 'specific') {
          audience = task.assignedTo.studentIds.map((id) => ({ _id: id }));
        } else {
          const f = task.assignedTo.filter || {};
          const q = { role: 'student', isActive: true };
          if (f.year) q.year = f.year;
          if (f.branch) q.branch = f.branch;
          if (f.section) q.section = f.section;
          audience = await User.find(q).select('_id');
        }

        const pending = audience.filter((u) => !submittedSet.has(String(u._id)));
        await Promise.all(
          pending.map((u) =>
            notify({
              userId: u._id,
              title: 'Deadline approaching',
              message: `"${task.title}" is due within 24 hours. Submit your proof before it closes.`,
              type: 'deadline_reminder',
              link: `/tasks/${task._id}`,
              io,
            })
          )
        );
      }
      console.log(`[cron] Deadline reminders sent for ${tasks.length} task(s).`);
    } catch (err) {
      console.error('[cron] deadlineReminders failed:', err.message);
    }
  });
}

module.exports = scheduleDeadlineReminders;
