import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { KeyRound } from "lucide-react";

const RESEND_COOLDOWN = 60;

export default function ForgotPassword() {
  const { forgotPassword, resendResetOtp, verifyResetOtp, resetPassword } =
    useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // 'email' | 'otp' | 'password'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      toast.success(
        data.message || "A reset code has been sent to your email.",
      );
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const data = err.response?.data;
      if (data?.accountNotFound) {
        toast.error("No account is linked with this email.");
        navigate("/register");
        return;
      }
      toast.error(data?.message || "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const data = await resendResetOtp(email);
      toast.success(data.message || "Code resent");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not resend code");
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyResetOtp(email, otp);
      setResetToken(data.resetToken);
      setStep("password");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const data = await resetPassword(resetToken, newPassword);
      toast.success(data.message || "Password reset successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <form
          onSubmit={handleVerify}
          className="w-full max-w-sm card text-center"
        >
          <KeyRound size={36} className="text-primary-600 mx-auto mb-3" />
          <h2 className="font-display text-2xl text-primary-900 mb-1">
            Enter reset code
          </h2>
          <p className="text-sm text-ink/60 mb-6">
            Enter the 6-digit code sent to <strong>{email}</strong>
          </p>

          <input
            required
            maxLength={6}
            inputMode="numeric"
            autoFocus
            className="input text-center text-2xl tracking-[0.5em] mb-4"
            placeholder="------"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          />

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full mb-3"
          >
            {loading ? "Verifying…" : "Verify code"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-sm text-primary-600 hover:underline disabled:text-ink/30 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>

          <p className="text-xs text-ink/40 mt-6">
            Wrong email?{" "}
            <button
              type="button"
              onClick={() => setStep("email")}
              className="text-primary-600 hover:underline"
            >
              Go back
            </button>
          </p>
        </form>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <form onSubmit={handleReset} className="w-full max-w-sm card">
          <h2 className="font-display text-2xl text-primary-900 mb-1">
            Set a new password
          </h2>
          <p className="text-sm text-ink/60 mb-6">
            Choose a new password for <strong>{email}</strong>
          </p>

          <label className="text-sm font-medium text-ink/70">
            New password
          </label>
          <input
            type="password"
            required
            minLength={6}
            autoFocus
            className="input mt-1 mb-4"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <label className="text-sm font-medium text-ink/70">
            Confirm new password
          </label>
          <input
            type="password"
            required
            minLength={6}
            className="input mt-1 mb-6"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8">
      <form onSubmit={handleSendCode} className="w-full max-w-sm card">
        <h2 className="font-display text-2xl text-primary-900 mb-1">
          Forgot password
        </h2>
        <p className="text-sm text-ink/60 mb-6">
          Enter your registered DTU email — we'll send you a code to reset your
          password.
        </p>

        <label className="text-sm font-medium text-ink/70">Email</label>
        <input
          type="email"
          required
          autoFocus
          className="input mt-1 mb-6"
          placeholder="you@dtu.ac.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Sending code…" : "Send reset code"}
        </button>

        <p className="text-sm text-center text-ink/60 mt-6">
          Remembered it?{" "}
          <Link
            to="/login"
            className="text-primary-600 font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
