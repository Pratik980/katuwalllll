import { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../api/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socketService.setAuthenticated(Boolean(user));
    const socketInstance = socketService.connect();
    const connected = () => setIsConnected(true);
    const disconnected = () => setIsConnected(false);
    socketInstance.on('connect', connected);
    socketInstance.on('disconnect', disconnected);
    setSocket(socketInstance);
    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off('connect', connected);
      socketInstance.off('disconnect', disconnected);
    };
  }, [user?.id]);

  const joinRoom = (room) => {
    if (socket && isConnected) socket.emit('joinChatRoom', room);
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) socket.emit('leaveChatRoom', room);
  };

  const emit = (event, data) => {
    if (socket && isConnected) socket.emit(event, data);
  };

  const on = (event, callback) => {
    if (!socket) return () => {};
    socket.on(event, callback);
    return () => socket.off(event, callback);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinRoom, leaveRoom, emit, on }}>
      {children}
    </SocketContext.Provider>
  );
};
