import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const emptyForm = { name: '', email: '', password: '', rollNo: '', branch: '', year: '', section: '' };
const RESEND_COOLDOWN = 60;

export default function Register() {
  const { register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const verifyEmail = searchParams.get('verify');
    if (!verifyEmail) return;
    setPendingEmail(verifyEmail);
    setStep('otp');
    resendOtp(verifyEmail)
      .then((data) => toast.success(data.message || 'Verification code sent'))
      .catch((err) => toast.error(err.response?.data?.message || 'Could not send a new code — try "Resend code" below'));
    setCooldown(RESEND_COOLDOWN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      setPendingEmail(data.email);
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);
      toast.success(data.message || 'Verification code sent to your DTU email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await verifyOtp(pendingEmail, otp);
      toast.success('Email verified — welcome to NSS VAC!');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      const data = await resendOtp(pendingEmail);
      toast.success(data.message || 'Code resent');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <form onSubmit={handleVerify} className="w-full max-w-sm card text-center">
          <ShieldCheck size={36} className="text-primary-600 mx-auto mb-3" />
          <h2 className="font-display text-2xl text-primary-900 mb-1">Verify your email</h2>
          <p className="text-sm text-ink/60 mb-6">
            Enter the 6-digit code sent to <strong>{pendingEmail}</strong>
          </p>

          <input
            required
            maxLength={6}
            inputMode="numeric"
            className="input text-center text-2xl tracking-[0.5em] mb-4"
            placeholder="------"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />

          <button type="submit" disabled={verifying || otp.length !== 6} className="btn-primary w-full mb-3">
            {verifying ? 'Verifying…' : 'Verify & continue'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-primary-600 hover:underline disabled:text-ink/30 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>

          <p className="text-xs text-ink/40 mt-6">
            Wrong email?{' '}
            <button type="button" onClick={() => setStep('form')} className="text-primary-600 hover:underline">
              Go back
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md card">
        <h2 className="font-display text-2xl text-primary-900 mb-1">Student registration</h2>
        <p className="text-sm text-ink/60 mb-6">Join the NSS Value Added Course — DTU email required</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-sm font-medium text-ink/70">Full name</label>
            <input required className="input mt-1" value={form.name} onChange={set('name')} />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-ink/70">DTU email</label>
            <input
              type="email"
              required
              className="input mt-1"
              placeholder="you@dtu.ac.in"
              value={form.email}
              onChange={set('email')}
            />
            <p className="text-xs text-ink/40 mt-1">Only @dtu.ac.in addresses can register — we'll send a code to verify it's yours.</p>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-ink/70">Password</label>
            <input type="password" required minLength={6} className="input mt-1" value={form.password} onChange={set('password')} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Roll No.</label>
            <input className="input mt-1" value={form.rollNo} onChange={set('rollNo')} placeholder="2K23/MC/01" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Branch</label>
            <input className="input mt-1" value={form.branch} onChange={set('branch')} placeholder="MC" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Year</label>
            <input type="number" min={1} max={4} className="input mt-1" value={form.year} onChange={set('year')} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Section</label>
            <input className="input mt-1" value={form.section} onChange={set('section')} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full mt-6">
          {loading ? 'Sending code…' : 'Send verification code'}
        </button>

        <p className="text-sm text-center text-ink/60 mt-6">
          Already registered? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}