import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

export default function Topbar({ title }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const socket = useSocket();

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
    await api.patch('/notifications/read-all');
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-primary-100 px-8 py-4 flex items-center justify-between">
      <h2 className="font-display text-2xl text-primary-900">{title}</h2>

      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} className="relative p-2 rounded-full hover:bg-primary-100">
          <Bell size={20} className="text-primary-700" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card z-20">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm">Notifications</p>
              <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all read</button>
            </div>
            {notifications.length === 0 && <p className="text-xs text-ink/50 py-4 text-center">No notifications yet.</p>}
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n._id} className={`p-2.5 rounded-lg text-sm ${n.isRead ? 'bg-transparent' : 'bg-primary-50'}`}>
                  <p className="font-medium text-ink">{n.title}</p>
                  <p className="text-ink/60 text-xs mt-0.5">{n.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
