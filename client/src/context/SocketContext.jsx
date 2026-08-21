import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api/axios';

const SocketContext = createContext(null);

// VITE_SOCKET_URL is deliberately separate from VITE_API_URL:
//   - REST calls (axios) MUST stay same-origin (relative '/api', proxied by
//     client/vercel.json) so the httpOnly auth cookie survives third-party
//     cookie blocking. Don't ever point VITE_API_URL at the backend
//     directly — that's what caused the login-then-instant-logout bug.
//   - The socket, on the other hand, needs a REAL WebSocket upgrade, and
//     Vercel's rewrite proxy can't reliably tunnel that — it silently
//     falls back to HTTP long-polling forever, which is what the endless
//     `transport=polling` flood in the Network tab was. So the socket
//     connects DIRECTLY to the backend instead, bypassing the proxy.
// Left unset, this defaults to '/' — same-origin — which is exactly right
// for local dev, where vite.config.js's dev proxy has `ws: true` and
// really does support the upgrade, so there's no need for any of this
// locally. Only set VITE_SOCKET_URL in the Vercel production environment.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    // A direct cross-origin connection can't rely on the cookie the same
    // way the proxied REST calls can — so auth is a short-lived token
    // instead, fetched fresh (over the *proxied* REST path, cookie-safe)
    // on every connection attempt. Passing `auth` as a function rather
    // than a plain object is what makes socket.io-client re-run this on
    // every reconnect too, so an expired 15-minute token never causes a
    // silent reconnect failure — it just fetches a new one automatically.
    const s = io(SOCKET_URL, {
      path: '/socket.io',
      auth: async (cb) => {
        try {
          const { data } = await api.get('/auth/socket-token');
          cb({ token: data.token });
        } catch {
          cb({}); // connects unauthenticated rather than throwing — io.use() on the server just won't join the user's room
        }
      },
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);