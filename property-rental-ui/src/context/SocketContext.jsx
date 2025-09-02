import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socket = useRef(null);

  useEffect(() => {
    if (user) {
      socket.current = io('http://localhost:8000', {
        withCredentials: true,
        transports: ['websocket'],
      });

      socket.current.emit('addUser', user._id);
    }

    return () => {
      socket.current?.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
