import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        toast("Please verify your email to continue", { icon: "📧" });
        navigate(`/register?verify=${encodeURIComponent(data.email)}`);
        return;
      }
      toast.error(data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex-col justify-between p-12">
        <div>
          <p className="text-sm uppercase tracking-widest text-primary-200">
            National Service Scheme
          </p>
          <h1 className="font-display text-5xl mt-4 leading-tight">
            Sahyog
          </h1>
        </div>
        <div className="space-y-3">
          <p className="text-primary-100 max-w-md">
            One system for every NSS Value Added Course task, event, and
            certificate at Delhi Technological University — built for
            coordinators and students alike.
          </p>
          <Link
            to="/about"
            className="text-primary-100 text-sm hover:text-white underline underline-offset-2 inline-block"
          >
            Learn how the course & platform work →
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm card">
          <h2 className="font-display text-2xl text-primary-900 mb-1">
            Sign in
          </h2>
          <p className="text-sm text-ink/60 mb-6">
            Access your Sahyog dashboard
          </p>

          <label className="text-sm font-medium text-ink/70">Email</label>
          <input
            type="email"
            required
            className="input mt-1 mb-4"
            placeholder="you@dtu.ac.in"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <label className="text-sm font-medium text-ink/70">Password</label>
          <div className="mt-1 mb-1">
            <PasswordInput
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="text-right mb-6">
            <Link
              to="/forgot-password"
              className="text-xs text-primary-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-sm text-center text-ink/60 mt-6">
            New student?{" "}
            <Link
              to="/register"
              className="text-primary-600 font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}