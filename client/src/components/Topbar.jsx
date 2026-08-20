import React, { useEffect, useRef, useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export default function Topbar({ title, onMenuClick }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const socket = useSocket();
  const wrapperRef = useRef(null);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setNotifications(data.notifications);
    setUnread(data.unreadCount);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((c) => c + 1);
      toast(n.title, { icon: '🔔' });
    };
    socket.on('notification:new', onNotif);
    return () => socket.off('notification:new', onNotif);
  }, [socket]);

  const markAllRead = async () => {
    if (unread === 0) return;
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch {
      // Optimistic state is fine to leave as-is here — worst case the
      // badge under-reports until the next load(), not worth a toast.
    }
  };

  const openDropdown = () => {
    setOpen(true);
    markAllRead();
  };

  const toggle = () => {
    if (open) setOpen(false);
    else openDropdown();
  };

  // Click-anywhere-outside-closes-it, via a single document listener that
  // only attaches while the panel is actually open. Just closes — no
  // read-marking here, since that already happened on open.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-primary-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2 -ml-2 rounded-lg hover:bg-primary-100 text-primary-700"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <h2 className="font-display text-lg sm:text-2xl text-primary-900 truncate">{title}</h2>
      </div>

      <div className="relative shrink-0" ref={wrapperRef}>
        <button onClick={toggle} className="relative p-2 rounded-full hover:bg-primary-100">
          <Bell size={20} className="text-primary-700" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {/* Always mounted so the open/close transition can actually play —
            conditionally rendering with {open && ...} would mount/unmount
            it instantly with no animation. Width is clamped to the
            viewport on small screens so it can't overflow off-screen. */}
        <div
          className={`absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-80 max-h-96 overflow-y-auto card z-20 origin-top-right transition-all duration-150 ease-out ${
            open
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
          }`}
        >
          <p className="font-semibold text-sm mb-2">Notifications</p>
          {notifications.length === 0 && <p className="text-xs text-ink/50 py-4 text-center">No notifications yet.</p>}
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n._id} className="p-2.5 rounded-lg text-sm bg-transparent transition-colors">
                <p className="font-medium text-ink">{n.title}</p>
                <p className="text-ink/60 text-xs mt-0.5">{n.message}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}