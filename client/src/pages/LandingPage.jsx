import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Droplet, Sparkles as SparklesIcon, Megaphone as MegaphoneIcon, QrCode, Trophy, ShieldCheck,
  MessageCircle, FileSpreadsheet, Bell, UserPlus, ClipboardCheck, Award, CheckCircle2, ChevronDown,
  Mail, Lock, ListChecks, CalendarDays, BarChart3,
  Instagram, Linkedin
} from 'lucide-react';

// Public marketing/info page — deliberately outside the app Layout/Sidebar
// shell (no auth required). Route: /about. Explains the course, how the
// platform works for both roles, and the policies governing it, so a
// prospective student or a reviewing faculty member gets the full picture
// before ever creating an account.

const FEATURES = [
  { icon: ListChecks, title: 'Smart task assignment', desc: 'Coordinators publish activities targeted to everyone, a filtered cohort (year/branch/section), or specific students — you only ever see what applies to you.' },
  { icon: QrCode, title: 'QR event attendance', desc: 'Camps and drives use a rotating QR code for check-in. Scan it (or type the code) and hours are credited the instant attendance is marked.' },
  { icon: ShieldCheck, title: 'Automatic proof verification', desc: 'Every image proof is checked against past submissions for visual duplicates, and written remarks are checked for copy-pasted text — flagged submissions go to your coordinator for a manual look, nothing is auto-rejected.' },
  { icon: Award, title: 'Verifiable certificates', desc: 'Once you cross the required hours, your coordinator issues a certificate with a unique ID and a QR code that anyone — including a recruiter — can scan to confirm it\'s genuine.' },
  { icon: Trophy, title: 'Leaderboard', desc: 'Track your standing by points earned, filterable by branch and year.' },
  { icon: MessageCircle, title: 'NSS Saathi chatbot', desc: 'Ask about your hours, deadlines, upcoming events, or certificate status any time — it looks up your real data, not a script.' },
  { icon: MegaphoneIcon, title: 'Live announcements', desc: 'Coordinators post updates that reach you instantly, with a read-receipt so nothing important gets missed.' },
  { icon: Bell, title: 'Deadline reminders', desc: 'An automatic reminder goes out 24 hours before any task deadline, to everyone who hasn\'t submitted yet.' },
  { icon: FileSpreadsheet, title: 'Official reporting', desc: 'Coordinators can export a ready-to-file activity report at any point in the semester — no manual tallying.' },
];

const STUDENT_STEPS = [
  { icon: UserPlus, title: 'Register with your DTU email', desc: 'Only @dtu.ac.in addresses can sign up. You\'ll get a 6-digit code by email to verify it\'s really you before your account activates.' },
  { icon: ListChecks, title: 'Browse your tasks & events', desc: 'See what\'s assigned to you — plantation drives, blood donation camps, cleanliness drives, awareness campaigns, teaching, surveys, and event duty.' },
  { icon: ClipboardCheck, title: 'Complete the activity & submit proof', desc: 'Upload a photo or document, or paste a link, along with a short note. Late submissions are still accepted, just marked as late.' },
  { icon: CheckCircle2, title: 'Get reviewed', desc: 'Your coordinator approves, rejects, or asks for a resubmission. You\'re notified the moment a decision is made.' },
  { icon: BarChart3, title: 'Track your progress', desc: 'Hours and points are credited automatically on approval. Your dashboard shows exactly how close you are to the requirement.' },
  { icon: Award, title: 'Get certified', desc: 'Cross the required hours and your coordinator issues a certificate with a public, scannable verification link.' },
];

const ADMIN_STEPS = [
  { icon: ListChecks, title: 'Publish tasks & events', desc: 'Target all students or a specific cohort, set the hour/point value, deadline, and required proof type.' },
  { icon: QrCode, title: 'Run attendance with a QR code', desc: 'Open a rotating QR at the venue, or generate a "scan to join" QR when creating an event so students register in one tap.' },
  { icon: ShieldCheck, title: 'Review submissions', desc: 'Approve, reject, or request a resubmission — flagged possible-duplicates are called out so nothing suspicious slips through unnoticed.' },
  { icon: MegaphoneIcon, title: 'Post announcements', desc: 'Reach every student instantly, with pin and auto-expiry options for time-sensitive updates.' },
  { icon: Award, title: 'Issue certificates', desc: 'One click for any student who has crossed the required hours — a verifiable PDF is generated automatically.' },
  { icon: FileSpreadsheet, title: 'Export reports', desc: 'Download a per-student and category-wise activity summary, ready to file upward.' },
];

const POLICIES = [
  {
    title: 'Eligibility',
    body: 'Registration is limited to valid @dtu.ac.in email addresses. Every new account must be verified with a one-time code sent to that email before it becomes active — this confirms the account belongs to an actual DTU student, not just a plausible-looking address.',
  },
  {
    title: 'Hour requirement',
    body: 'A minimum number of community-service hours (set by your NSS coordinator, shown live on your dashboard) is required to become certificate-eligible. Hours only ever come from coordinator-approved tasks and confirmed event attendance — there is no self-reporting.',
  },
  {
    title: 'Accepted activity categories',
    body: 'Plantation drives, blood donation camps, cleanliness drives, awareness camps, teaching/tutoring, surveys, and event duty at NSS-organized camps. Each published task specifies its exact category and hour value.',
  },
  {
    title: 'Proof & authenticity',
    body: 'Every submission requires proof — a photo, document, or link — appropriate to the activity. Image proofs are automatically checked for visual duplication against other submissions, and remarks are checked for copy-pasted text. A flag doesn\'t mean automatic rejection; it means your coordinator reviews it manually before deciding.',
  },
  {
    title: 'Submissions & resubmission',
    body: 'You may resubmit a task if it\'s rejected or a resubmission is requested. Once a submission is approved, it is locked permanently and cannot be edited or resubmitted. Late submissions are accepted and clearly marked as late.',
  },
  {
    title: 'Certificate issuance',
    body: 'Certificates are issued manually by your NSS coordinator once your logged hours meet the requirement — crossing the threshold makes you eligible, but does not auto-generate the certificate. Every issued certificate carries a unique ID and a QR code linking to a public, no-login verification page.',
  },
  {
    title: 'Data use',
    body: 'Activity records, submitted proof, and attendance data are used solely for administering and certifying your NSS participation. They are visible to your NSS coordinator for review purposes and are not shared externally beyond what\'s needed for official NSS reporting.',
  },
  {
    title: 'Account security',
    body: 'Sessions are secured with an httpOnly authentication cookie rather than storing anything readable in browser storage — this is a deliberate choice to reduce exposure if the site were ever compromised by a malicious script.',
  },
];

function AccordionItem({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card !py-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="font-medium text-ink">{title}</span>
        <ChevronDown size={18} className={`text-primary-500 transition-transform shrink-0 ml-3 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-ink/60 mt-3 leading-relaxed">{body}</p>}
    </div>
  );
}

function StepList({ steps }) {
  return (
    <div className="grid sm:grid-cols-2 gap-5">
      {steps.map((s, i) => (
        <div key={s.title} className="card flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold text-sm">
            {i + 1}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <s.icon size={16} className="text-primary-600" />
              <p className="font-medium text-ink">{s.title}</p>
            </div>
            <p className="text-sm text-ink/60">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const [audience, setAudience] = useState('student');

  return (
    <div className="bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-primary-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-primary-800 leading-none">NSS VAC</p>
            <p className="text-[11px] text-primary-500">Delhi Technological University</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/verify" className="text-sm text-ink/60 hover:text-primary-700 hidden sm:block">Verify a certificate</Link>
            <Link to="/login" className="btn-secondary !py-1.5 text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary !py-1.5 text-sm">Register</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-sm uppercase tracking-widest text-primary-200 mb-4">National Service Scheme · Value Added Course</p>
          <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-5">
            One platform for every NSS VAC<br />task, event, and certificate
          </h1>
          <p className="text-primary-100 max-w-2xl mx-auto mb-8">
            Register with your DTU email, complete real community-service activities, and track your hours, points,
            and certificate eligibility in real time — built for both students and NSS coordinators.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/register" className="bg-white text-primary-700 font-medium px-5 py-2.5 rounded-xl hover:bg-primary-50">
              Get started
            </Link>
            <Link to="/login" className="border border-white/40 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* What is NSS VAC */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1">
            <h2 className="font-display text-2xl text-primary-900 mb-2">About the course</h2>
            <p className="text-sm text-ink/60">What NSS VAC is, and why it exists.</p>
          </div>
          <div className="md:col-span-2 space-y-4 text-ink/70 text-sm leading-relaxed">
            <p>
              The National Service Scheme (NSS) Value Added Course at DTU gives students structured credit for
              genuine community service — plantation drives, blood donation camps, cleanliness drives, awareness
              campaigns, teaching, surveys, and duty at NSS-run events. The goal is real social contribution, tracked
              and verified rather than self-reported.
            </p>
            <p>
              This platform is where that entire course is run: coordinators publish activities and events, students
              complete them and submit proof, coordinators review and approve, and hours/points accumulate toward a
              verifiable completion certificate — all in one place, replacing scattered spreadsheets and manual
              tallying.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-primary-100">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl text-primary-900 mb-2">How it works</h2>
            <div className="inline-flex rounded-xl border border-primary-200 p-1 mt-2">
              <button
                onClick={() => setAudience('student')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium ${audience === 'student' ? 'bg-primary-600 text-white' : 'text-ink/60'}`}
              >
                For students
              </button>
              <button
                onClick={() => setAudience('admin')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium ${audience === 'admin' ? 'bg-primary-600 text-white' : 'text-ink/60'}`}
              >
                For coordinators
              </button>
            </div>
          </div>
          <StepList steps={audience === 'student' ? STUDENT_STEPS : ADMIN_STEPS} />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl text-primary-900 mb-2">What the platform does</h2>
          <p className="text-sm text-ink/60">Every feature exists to remove manual tracking, not add process for its own sake.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                <f.icon size={20} className="text-primary-700" />
              </div>
              <p className="font-medium text-ink mb-1">{f.title}</p>
              <p className="text-sm text-ink/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Activity categories */}
      <section className="bg-white border-y border-primary-100">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-display text-2xl text-primary-900 mb-6 text-center">Recognized activity categories</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Leaf, label: 'Plantation drives' },
              { icon: Droplet, label: 'Blood donation' },
              { icon: SparklesIcon, label: 'Cleanliness drives' },
              { icon: MegaphoneIcon, label: 'Awareness camps' },
              { icon: UserPlus, label: 'Teaching & mentoring' },
              { icon: ClipboardCheck, label: 'Surveys' },
              { icon: CalendarDays, label: 'Event duty' },
            ].map((c) => (
              <span key={c.label} className="badge bg-primary-50 text-primary-700 !py-2 !px-4 text-sm">
                <c.icon size={14} className="mr-1.5" /> {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl text-primary-900 mb-2">Policies</h2>
          <p className="text-sm text-ink/60">The rules that govern how hours, proof, and certificates work.</p>
        </div>
        <div className="space-y-3">
          {POLICIES.map((p) => (
            <AccordionItem key={p.title} title={p.title} body={p.body} />
          ))}
        </div>
      </section>

      {/* Security note */}
      <section className="bg-primary-50">
        <div className="max-w-4xl mx-auto px-6 py-12 flex items-start gap-4">
          <Lock size={28} className="text-primary-600 shrink-0 mt-1" />
          <div>
            <p className="font-medium text-ink mb-1">Your account is protected two ways</p>
            <p className="text-sm text-ink/60">
              <Mail size={13} className="inline -mt-0.5 mr-1" />
              Only @dtu.ac.in emails can register, and every new account is confirmed with a one-time code before it
              activates — so no one can register with an email they don't actually control.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-3xl text-primary-900 mb-3">Ready to start?</h2>
        <p className="text-ink/60 mb-8">Register with your DTU email — verification takes less than a minute.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register" className="btn-primary">Create your account</Link>
          <Link to="/login" className="btn-secondary">Sign in</Link>
        </div>
      </section>

      <footer className="border-t border-primary-100 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6">
            <div className="text-center md:text-left">
              <p className="font-display text-sm text-primary-800">NSS VAC ERP</p>
              <p className="text-xs text-ink/40 mt-0.5">Delhi Technological University</p>
            </div>

            <div className="flex items-center gap-6 text-sm text-ink/60">
              <Link to="/verify" className="hover:text-primary-600">Verify a certificate</Link>
              <Link to="/login" className="hover:text-primary-600">Sign in</Link>
              <Link to="/register" className="hover:text-primary-600">Register</Link>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://instagram.com/nss_dtu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NSS DTU on Instagram"
                className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-ink/50 hover:bg-primary-100 hover:text-primary-600 transition-colors"
              >
                <Instagram size={17} />
              </a>
              <a
                href="https://linkedin.com/company/nss-dtu"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="NSS DTU on LinkedIn"
                className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-ink/50 hover:bg-primary-100 hover:text-primary-600 transition-colors"
              >
                <Linkedin size={17} />
              </a>
              
              <a
                href="mailto:nss@dtu.ac.in"
                aria-label="Email NSS DTU"
                className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-ink/50 hover:bg-primary-100 hover:text-primary-600 transition-colors"
              >
                <Mail size={17} />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-primary-50 text-center">
            <p className="text-xs text-ink/30">© {new Date().getFullYear()} NSS VAC ERP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}