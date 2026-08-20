import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListChecks, CalendarDays, Trophy, Award, Users, LogOut, Megaphone, ShieldCheck, MessageCircleQuestion, Image, HandHelping, Lightbulb, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAnnouncements } from '../context/AnnouncementContext';
import api from '../api/axios';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/responsibilities', label: 'Responsibilities', icon: HandHelping },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/admin/verify-certificate', label: 'Verify Certificate', icon: ShieldCheck },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

const studentLinks = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/responsibilities', label: 'Responsibilities', icon: HandHelping },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
  { to: '/gallery', label: 'Gallery', icon: Image },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/certificate', label: 'Certificate', icon: Award },
];

// Renders as a static column on lg+ screens (the old behaviour) and as a
// slide-in off-canvas drawer with a backdrop below that — controlled by
// `mobileOpen`/`onClose` from Layout, which also owns the hamburger button
// in Topbar. Tapping a nav link on mobile closes the drawer automatically
// so the user actually sees the page they navigated to.
export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAnnouncements();
  const [gapCount, setGapCount] = useState(0);
  const links = user?.role === 'admin' ? adminLinks : studentLinks;

  // Admin-only: how many distinct questions the chatbot couldn't answer
  // well are still sitting unresolved — see AdminUnanswered.jsx.
  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/chatbot/unanswered').then((r) => setGapCount(r.data.unanswered.length)).catch(() => {});
  }, [user]);

  const goToChatbotGaps = () => {
    onClose();
    navigate('/admin/chatbot-gaps');
  };

  return (
    <>
      {/* Backdrop — mobile/tablet only, sits above content but below the
          drawer itself; tapping it closes the drawer just like the X does. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-72 sm:w-64 shrink-0 h-screen bg-white border-r border-primary-100 flex flex-col
          fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out
          lg:sticky lg:top-0 lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-6 py-6 flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl text-primary-800 leading-tight">Sahyog</h1>
            <p className="text-xs text-primary-500 mt-0.5">Delhi Technological University</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-ink/40 hover:text-ink p-1 -mr-1 -mt-1"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${
                  isActive ? 'bg-primary-600 text-white' : 'text-ink/70 hover:bg-primary-50'
                }`
              }
            >
              <Icon size={18} />
              {label}
              {label === 'Announcements' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6">
          {user?.role === 'admin' && (
            <button
              onClick={goToChatbotGaps}
              className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl text-sm font-medium text-ink/70 hover:bg-primary-50 w-full relative"
            >
              <MessageCircleQuestion size={18} />
              Chatbot Gaps
              {gapCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {gapCount}
                </span>
              )}
            </button>
          )}

          <div className="px-3 py-3 mb-2 rounded-xl bg-primary-50 text-xs">
            <p className="font-semibold text-primary-800 truncate">{user?.name}</p>
            <p className="text-primary-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full"
          >
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}