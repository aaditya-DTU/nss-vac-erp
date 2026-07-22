import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const AnnouncementContext = createContext(null);

/**
 * Single source of truth for the "unread announcements" count. Both the
 * Sidebar badge and the Announcements page read/write through this instead
 * of keeping their own local state — that's what was causing the badge to
 * go stale (Sidebar was guessing with setUnread(0) instead of reflecting
 * what actually got marked read on the server).
 */
export function AnnouncementProvider({ children }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = () => {
    if (!user) return;
    api
      .get('/announcements/unread-count')
      .then((r) => setUnreadCount(r.data.count))
      .catch(() => {});
  };

  useEffect(() => { refreshUnreadCount(); }, [user]);

  // New announcement arrives for anyone connected — bump the count live.
  useEffect(() => {
    if (!socket) return;
    const bump = () => setUnreadCount((c) => c + 1);
    socket.on('announcement:new', bump);
    return () => socket.off('announcement:new', bump);
  }, [socket]);

  // Called right after a single announcement is successfully marked read,
  // so the badge updates immediately without a round-trip refetch.
  const decrementUnread = () => setUnreadCount((c) => Math.max(0, c - 1));

  return (
    <AnnouncementContext.Provider value={{ unreadCount, refreshUnreadCount, decrementUnread }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  return ctx;
}