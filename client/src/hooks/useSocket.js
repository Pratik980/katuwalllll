import { useEffect, useRef, useCallback } from 'react';
import { socketService } from '../api/socketService';

export const useSocket = (event, callback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const socket = socketService.connect();
    const handler = (data) => {
      callbackRef.current(data);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event]);
};

export const useSocketEmit = () => {
  const socket = socketService.connect();

  const emit = useCallback((event, data) => {
    socket.emit(event, data);
  }, [socket]);

  return emit;
};

export const useSocketJoinRoom = (room) => {
  useEffect(() => {
    if (room) {
      socketService.joinRoom(room);
      return () => {
        socketService.leaveRoom(room);
      };
    }
  }, [room]);
};

export const useChatRoom = (room) => {
  useEffect(() => {
    if (room) {
      socketService.joinChatRoom(room);
      return () => {
        socketService.leaveChatRoom(room);
      };
    }
  }, [room]);
};