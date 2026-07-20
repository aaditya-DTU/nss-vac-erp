const Submission = require('../models/Submission');
const Task = require('../models/Task');
const { awardCredit, reverseCredit, notify } = require('../utils/ledger');
const { computeImageHash, hammingDistance, DUPLICATE_THRESHOLD } = require('../utils/imageHash');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

// Word-overlap (Jaccard) similarity — cheap enough to run against every
// other submission on the same task without needing an embeddings call.
// Flags copy-pasted "reflection" text, which is a very common way students
// game proof-of-work systems that only check for a file being present.
function textSimilarity(a = '', b = '') {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}
const TEXT_SIMILARITY_THRESHOLD = 0.75;

async function detectDuplicates({ task, student, remarks, imageHash }) {
  const flags = [];
  const others = await Submission.find({ task: task._id, student: { $ne: student } });

  for (const other of others) {
    if (imageHash && other.imageHash) {
      const dist = hammingDistance(imageHash, other.imageHash);
      if (dist <= DUPLICATE_THRESHOLD) {
        flags.push({ type: 'duplicate_image', matchedSubmission: other._id, detail: `Hamming distance ${dist}` });
      }
    }
    if (remarks && other.remarks) {
      const sim = textSimilarity(remarks, other.remarks);
      if (sim >= TEXT_SIMILARITY_THRESHOLD) {
        flags.push({ type: 'similar_text', matchedSubmission: other._id, detail: `${Math.round(sim * 100)}% word overlap` });
      }
    }
  }
  return flags;
}

exports.submitProof = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (task.status !== 'published') {
      return res.status(400).json({ success: false, message: 'This task is not currently accepting submissions.' });
    }

    const isLate = new Date() > new Date(task.deadline);

    let proofUrl;
    if (req.file) {
      const isImage = /^image\//.test(req.file.mimetype);
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        folder: `nss-vac-erp/submissions/${req.user._id}`,
        // Images go through Cloudinary's 'image' pipeline (thumbnails,
        // transforms). Everything else — crucially including PDFs — must
        // be forced to 'raw'. 'auto' actually classifies PDFs as an
        // 'image' resource (Cloudinary can rasterize PDF pages), and
        // image-pipeline delivery of PDFs is blocked by default on every
        // Cloudinary account as an anti-XSS measure, which is exactly why
        // PDF proofs were failing to render while photos worked fine.
        resourceType: isImage ? 'image' : 'raw',
      });
      proofUrl = uploaded.secure_url;
    }

    let submission = await Submission.findOne({ task: task._id, student: req.user._id });

    if (submission && ['approved'].includes(submission.status)) {
      return res.status(400).json({ success: false, message: 'This task has already been approved and cannot be resubmitted.' });
    }

    // Only image proofs get perceptual-hashed; other file types (PDF/doc)
    // skip straight to the text-similarity check below.
    let imageHash;
    if (req.file && /^image\//.test(req.file.mimetype)) {
      try {
        imageHash = await computeImageHash(req.file.buffer);
      } catch (e) {
        console.warn('Image hash failed:', e.message);
      }
    }

    const flags = await detectDuplicates({ task, student: req.user._id, remarks: req.body.remarks, imageHash });

    const payload = {
      remarks: req.body.remarks,
      proofUrl,
      proofLink: req.body.proofLink,
      proofFilename: req.file?.originalname,
      status: 'pending',
      isLate,
      submittedAt: new Date(),
      reviewNote: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      imageHash,
      flags,
    };

    if (submission) {
      Object.assign(submission, payload);
      await submission.save();
    } else {
      submission = await Submission.create({ task: task._id, student: req.user._id, ...payload });
      task.stats.submittedCount += 1;
      await task.save();
    }

    await notify({
      userId: task.createdBy,
      title: flags.length ? '⚠ Submission flagged for review' : 'New submission to review',
      message: flags.length
        ? `${req.user.name}'s submission for "${task.title}" was flagged as a possible duplicate.`
        : `${req.user.name} submitted proof for "${task.title}".`,
      type: 'submission_reviewed',
      link: `/admin/tasks/${task._id}`,
      io,
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
};

exports.reviewSubmission = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const { decision, reviewNote } = req.body; // decision: 'approved' | 'rejected' | 'resubmit_requested'

    if (!['approved', 'rejected', 'resubmit_requested'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision value.' });
    }

    const submission = await Submission.findById(req.params.id).populate('task');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
    if (submission.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Submission is already approved.' });
    }

    submission.status = decision;
    submission.reviewNote = reviewNote;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();

    if (decision === 'approved') {
      const task = submission.task;
      submission.pointsAwarded = task.points;
      submission.hoursAwarded = task.hoursWorth;

      await awardCredit({
        studentId: submission.student,
        source: 'task',
        refId: task._id,
        points: task.points,
        hours: task.hoursWorth,
        note: `Approved: ${task.title}`,
        awardedBy: req.user._id,
        io,
      });

      task.stats.approvedCount += 1;
      await task.save();
    }

    await submission.save();

    await notify({
      userId: submission.student,
      title: `Submission ${decision.replace('_', ' ')}`,
      message:
        decision === 'approved'
          ? `Your submission for "${submission.task.title}" was approved. Credit added to your NSS record.`
          : `Your submission for "${submission.task.title}" needs attention: ${reviewNote || 'see admin note'}`,
      type: 'submission_reviewed',
      link: `/tasks/${submission.task._id}`,
      io,
    });

    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
};

exports.myCompletedTasks = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ student: req.user._id, status: 'approved' })
      .populate('task', 'title category points hoursWorth')
      .sort({ reviewedAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    next(err);
  }
};

// "Pics upload section" — photos are already uploaded through the normal
// task-proof flow (submitProof above); this just surfaces the approved
// ones as a shared gallery instead of leaving them buried per-task. Only
// approved + image-type proofs are shown, so nothing pending review or
// non-photo (PDF/doc/link) proof shows up here.
exports.gallery = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 24 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const taskMatch = category ? { category } : {};
    const submissions = await Submission.find({ status: 'approved', proofUrl: { $exists: true, $ne: null } })
      .populate({ path: 'task', select: 'title category', match: taskMatch })
      .populate('student', 'name branch year')
      .sort({ reviewedAt: -1 })
      .skip(skip)
      .limit(Number(limit) * 2); // over-fetch since the task match/image filter below can drop some

    const photos = submissions
      .filter((s) => s.task && /\.(jpg|jpeg|png|webp)(\?|$)/i.test(s.proofUrl || ''))
      .slice(0, Number(limit))
      .map((s) => ({
        id: s._id,
        url: s.proofUrl,
        caption: s.remarks,
        taskTitle: s.task.title,
        category: s.task.category,
        studentName: s.student?.name,
        branch: s.student?.branch,
        year: s.student?.year,
        date: s.reviewedAt,
      }));

    res.json({ success: true, photos });
  } catch (err) {
    next(err);
  }
};