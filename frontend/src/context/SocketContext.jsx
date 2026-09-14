import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [toast, setToast] = useState(null);
  const [routeUpdate, setRouteUpdate] = useState(null);
  const listenersRef = useRef(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = api.getToken();
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.VITE_API_BASE ? import.meta.env.VITE_API_BASE.replace(/\/api$/, '') : '/');
    const socket = io(socketUrl, { auth: { token }, path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('notification:new', (payload) => {
      setToast(payload);
      listenersRef.current.forEach((fn) => fn(payload));
      window.clearTimeout(socket._toastTimer);
      socket._toastTimer = window.setTimeout(() => setToast(null), 6000);
    });

    socket.on('route:updated', (payload) => {
      setRouteUpdate(payload);
    });

    return () => socket.disconnect();
  }, [isAuthenticated]);

  function onNotification(fn) {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }

  const value = { socket: socketRef, toast, dismissToast: () => setToast(null), routeUpdate, clearRouteUpdate: () => setRouteUpdate(null), onNotification };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
