import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAnnouncements as useAnnouncementBadge } from '../context/AnnouncementContext';

/**
 * Owns the announcement list itself: fetching, live arrival via socket,
 * and per-item "mark as read" — including keeping the sidebar badge
 * (AnnouncementContext) in sync when something gets read.
 */
export function useAnnouncementFeed() {
  const socket = useSocket();
  const { decrementUnread, refreshUnreadCount } = useAnnouncementBadge();
  const [announcements, setAnnouncements] = useState([]);

  const load = () => api.get('/announcements').then((r) => setAnnouncements(r.data.announcements));

  useEffect(() => {
    load();
    // Safety net: re-sync the sidebar's count with the server the moment
    // this page is opened, in case it drifted (e.g. read in another tab).
    refreshUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live arrival — anyone with the page open sees a new announcement
  // (and a toast) the instant an admin publishes it, no refresh needed.
  useEffect(() => {
    if (!socket) return;
    const onNew = (a) => {
      setAnnouncements((prev) => [{ ...a, isRead: false, readCount: 0 }, ...prev]);
      toast(`📢 ${a.title}`, { duration: 5000 });
    };
    socket.on('announcement:new', onNew);
    return () => socket.off('announcement:new', onNew);
  }, [socket]);

  const markRead = async (id) => {
    const target = announcements.find((a) => a._id === id);
    if (!target || target.isRead) return; // avoid double-decrementing on repeated hovers

    setAnnouncements((prev) => prev.map((a) => (a._id === id ? { ...a, isRead: true } : a)));
    decrementUnread();
    try {
      await api.post(`/announcements/${id}/read`);
    } catch {
      // Best effort — if this fails, refreshUnreadCount() on next page
      // visit will self-correct the badge.
    }
  };

  return { announcements, load, markRead };
}