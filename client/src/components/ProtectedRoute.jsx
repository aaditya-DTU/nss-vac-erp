import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Top-level auth gate. Wraps the whole authenticated section of the app
// as a parent route (see App.jsx), so this loading/redirect check runs
// once per session — not once per page navigation.
export function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-primary-600 font-display text-lg">Loading NSS ERP…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// Per-route role check. Nested inside RequireAuth, so `user` is guaranteed
// to exist here already — this only ever needs to check `roles`.
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (roles && !roles.includes(user.role)) return <Navigate to="/student" replace />;
  return children;
}
