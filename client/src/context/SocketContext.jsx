// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const tRef = useRef(t);
  const userId = user?.id || null;

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (loading || !userId || !socketUrl) return undefined;

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      toast.success(tRef.current('socket_connected'));
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (!['io client disconnect', 'io server disconnect'].includes(reason)) {
        toast.error(tRef.current('socket_disconnected'));
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error(tRef.current('socket_connect_failed'));
    });

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    };

    // Listen for notifications
    socketInstance.on('notification:new', (notification) => {
      toast.success(notification.message || tRef.current('socket_new_notification'));
      refreshNotifications();
    });
    ['notification:read', 'notification:all_read', 'notification:deleted', 'notification:cleared'].forEach((event) => {
      socketInstance.on(event, refreshNotifications);
    });

    // Member lists and family trees follow every member change
    const refreshMemberData = () => {
      ['members', 'members-dropdown', 'members-tree', 'members-for-families', 'familyTree', 'member'].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

    // Listen for member updates (the notification above already tells the user)
    socketInstance.on('member:created', refreshMemberData);
    socketInstance.on('member:updated', refreshMemberData);

    socketInstance.on('member:deleted', refreshMemberData);

    // Listen for donation updates
    socketInstance.on('donation:created', (donation) => {
      toast.success(tRef.current('socket_new_donation', { amount: donation.amount }));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket((current) => (current === socketInstance ? null : current));
      setIsConnected(false);
    };
  }, [queryClient, userId, loading]);

  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('join', { room });
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('leave', { room });
    }
  };

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, joinRoom, leaveRoom, emit, on }}
    >
      {children}
    </SocketContext.Provider>
  );
};