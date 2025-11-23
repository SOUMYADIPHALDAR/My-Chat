import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useSocketEvents = (eventHandlers) => {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        // Set up event listeners
        const listeners = Object.entries(eventHandlers).map(([event, handler]) => {
            socket.on(event, handler);
            return { event, handler };
        });

        // Cleanup: remove all listeners
        return () => {
            listeners.forEach(({ event, handler }) => {
                socket.off(event, handler);
            });
        };
    }, [socket, eventHandlers]);
};

