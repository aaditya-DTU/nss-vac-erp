function defaultFaqs() {
  const required = process.env.REQUIRED_NSS_HOURS || 120;
  return [
    // --- Requirements & eligibility ---
    {
      question: 'How many NSS hours do I need to complete the VAC?',
      answer: `You need a total of ${required} hours of community service to be eligible for the completion certificate. Check your live progress on your dashboard.`,
      category: 'requirements',
      keywords: ['hours', 'requirement', 'minimum', 'total'],
    },
    {
      question: 'What happens if I don\'t complete the required hours by the end of the semester?',
      answer: 'You won\'t be certificate-eligible until you cross the required hours. Talk to your NSS coordinator about deadline extensions or catch-up tasks — the system will keep tracking your progress regardless of the semester boundary.',
      category: 'requirements',
      keywords: ['deadline', 'semester', 'extension', 'incomplete'],
    },
    {
      question: 'Do all activities count equally toward my hours?',
      answer: 'No — each task and event has its own hour value set by the coordinator, based on the effort involved. A blood donation camp might be worth more hours than a short awareness activity, for example.',
      category: 'requirements',
      keywords: ['hour value', 'equal', 'weight', 'worth'],
    },

    // --- Activities & categories ---
    {
      question: 'What counts as an NSS activity?',
      answer: 'Approved categories include plantation drives, blood donation camps, cleanliness drives, awareness camps, teaching/tutoring underprivileged students, surveys, and event duty at NSS-organized camps. Each task specifies its category and hour value.',
      category: 'activities',
      keywords: ['category', 'activity', 'types', 'plantation', 'blood donation'],
    },
    {
      question: 'Can I suggest my own NSS activity instead of picking from the task list?',
      answer: 'Task creation is handled by your NSS coordinator to keep activities verifiable and fairly weighted. If you have an idea for an activity, raise it with your coordinator directly and they can add it as a task for everyone.',
      category: 'activities',
      keywords: ['suggest', 'propose', 'own activity', 'custom'],
    },
    {
      question: 'Are online/remote activities counted for NSS hours?',
      answer: 'It depends on what your coordinator publishes as a task — some awareness campaigns or surveys can be done remotely, while things like plantation drives or blood donation naturally require physical presence. Check each task\'s description for details.',
      category: 'activities',
      keywords: ['online', 'remote', 'virtual'],
    },

    // --- Submitting proof ---
    {
      question: 'How do I submit proof for a task?',
      answer: 'Open the task from "My Tasks", then upload a photo/document or paste a proof link along with a short remark, and submit. Your coordinator will review and approve it, after which hours and points are credited automatically.',
      category: 'submissions',
      keywords: ['submit', 'proof', 'upload', 'task'],
    },
    {
      question: 'What file types can I upload as proof?',
      answer: 'Images (JPG, PNG, WEBP) and documents (PDF, DOC, DOCX) up to 10MB are accepted. A short written remark alongside the file also helps your coordinator review faster.',
      category: 'submissions',
      keywords: ['file type', 'format', 'image', 'pdf', 'size limit'],
    },
    {
      question: 'Can I resubmit a task if it gets rejected?',
      answer: 'Yes — if your coordinator rejects a submission or requests a resubmission, you can update and resend your proof from the same task page. Once a submission is approved, it is locked and cannot be resubmitted.',
      category: 'submissions',
      keywords: ['resubmit', 'rejected', 'resubmission'],
    },
    {
      question: 'Why was my submission flagged?',
      answer: 'Submissions can be automatically flagged if the proof image looks visually identical to another student\'s submission, or if the written remarks are very similar to someone else\'s. A flag doesn\'t auto-reject anything — your coordinator reviews it manually before deciding.',
      category: 'submissions',
      keywords: ['flag', 'flagged', 'duplicate', 'plagiarism'],
    },
    {
      question: 'How long does it take for my submission to be reviewed?',
      answer: 'Review time depends on your coordinator\'s availability — there\'s no fixed SLA in the system. You\'ll get a notification the moment it\'s approved, rejected, or sent back for resubmission.',
      category: 'submissions',
      keywords: ['review time', 'how long', 'pending', 'waiting'],
    },

    // --- Deadlines & reminders ---
    {
      question: 'What happens if I miss a task deadline?',
      answer: 'Late submissions are still accepted and marked as late, but it is best to submit on time — the system sends an automatic reminder 24 hours before every deadline.',
      category: 'deadlines',
      keywords: ['deadline', 'late', 'miss', 'reminder'],
    },
    {
      question: 'Will I get notified before a deadline?',
      answer: 'Yes — an automatic reminder goes out 24 hours before any task deadline to everyone who hasn\'t submitted yet. You can also check "My Tasks" any time to see what\'s coming up.',
      category: 'deadlines',
      keywords: ['notification', 'reminder', 'alert'],
    },

    // --- Events & attendance ---
    {
      question: 'How does event attendance work?',
      answer: 'For NSS camps and drives, the coordinator opens a QR code at the venue. Scan it (or enter the shown code) from the Events page to check in — hours and points are credited instantly on a successful check-in.',
      category: 'events',
      keywords: ['attendance', 'qr', 'event', 'checkin', 'check-in'],
    },
    {
      question: 'What if I can\'t scan the QR code at an event?',
      answer: 'You can type the attendance code shown on the coordinator\'s screen directly into the "Enter attendance code" box on the Events page — no camera required.',
      category: 'events',
      keywords: ['can\'t scan', 'manual code', 'no camera'],
    },
    {
      question: 'Do I need to register for an event before attending?',
      answer: 'Registering in advance from the Events page helps your coordinator plan headcount, but attendance credit is given at check-in regardless — the two are tracked separately.',
      category: 'events',
      keywords: ['register', 'rsvp', 'signup'],
    },
    {
      question: 'How do I find out about upcoming events?',
      answer: 'Check the Events page for anything upcoming or ongoing, and keep an eye on Announcements — coordinators often post event details there too.',
      category: 'events',
      keywords: ['upcoming', 'find events', 'schedule'],
    },

    // --- Certificate ---
    {
      question: 'How is the completion certificate issued?',
      answer: 'Once your logged hours cross the required threshold, you become certificate-eligible. Your NSS coordinator issues it from their dashboard, after which you can download the PDF from the Certificate page. Every certificate has a unique ID and a QR code for public verification.',
      category: 'certificate',
      keywords: ['certificate', 'issue', 'eligible', 'download'],
    },
    {
      question: 'Can anyone verify my NSS certificate is genuine?',
      answer: 'Yes — every certificate has a QR code and a unique ID that links to a public verification page. Anyone, including a recruiter, can confirm it\'s real without needing to log in.',
      category: 'certificate',
      keywords: ['verify', 'genuine', 'authentic', 'fake'],
    },
    {
      question: 'I completed my hours but haven\'t received a certificate — what do I do?',
      answer: 'Certificates aren\'t generated automatically the moment you hit the hour threshold — your coordinator still needs to issue it from their dashboard. Reach out to them once you see "Certificate eligible" on your dashboard.',
      category: 'certificate',
      keywords: ['not received', 'missing certificate', 'issue certificate'],
    },

    // --- Leaderboard & points ---
    {
      question: 'How are leaderboard points calculated?',
      answer: 'Every approved task and event check-in awards points as defined by that task/event. The leaderboard ranks students by total points and can be filtered by branch and year.',
      category: 'leaderboard',
      keywords: ['points', 'leaderboard', 'rank'],
    },
    {
      question: 'Do points expire or reset?',
      answer: 'No — your points and hours accumulate for the entire duration of the course and don\'t reset. The leaderboard always reflects your all-time total.',
      category: 'leaderboard',
      keywords: ['expire', 'reset', 'reset points'],
    },

    // --- Account & general ---
    {
      question: 'How do I update my profile details like branch or year?',
      answer: 'You can update your name, phone, branch, year, and section from your profile settings. Roll number and email changes need to go through your NSS coordinator.',
      category: 'account',
      keywords: ['profile', 'update', 'edit details'],
    },
    {
      question: 'I forgot my password, what do I do?',
      answer: 'Use the login page to reset your password if that option is available, or contact your NSS coordinator to have your account reset.',
      category: 'account',
      keywords: ['password', 'forgot', 'reset password', 'login issue'],
    },
    {
      question: 'Who do I contact if I have a problem the chatbot can\'t solve?',
      answer: 'Reach out to your NSS coordinator/programme officer directly — they can see your full record and handle anything outside what I can look up here.',
      category: 'general',
      keywords: ['contact', 'help', 'support', 'coordinator'],
    },
  ];
}

module.exports = { defaultFaqs };