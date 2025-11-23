import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

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

    useEffect(() => {
        // Initialize socket connection
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
        const newSocket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('Connected to server:', newSocket.id);
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            newSocket.close();
        };
    }, []);

    const joinRoom = (roomId) => {
        if (socket) {
            socket.emit('join_room', roomId);
        }
    };

    const leaveRoom = (roomId) => {
        if (socket) {
            socket.emit('leave_room', roomId);
        }
    };

    const sendMessage = (data) => {
        if (socket) {
            socket.emit('send_message', data);
        }
    };

    const startTyping = (data) => {
        if (socket) {
            socket.emit('typing_start', data);
        }
    };

    const stopTyping = (data) => {
        if (socket) {
            socket.emit('typing_stop', data);
        }
    };

    const value = {
        socket,
        isConnected,
        joinRoom,
        leaveRoom,
        sendMessage,
        startTyping,
        stopTyping
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

